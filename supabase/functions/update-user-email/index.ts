import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabaseClient.from('users').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'data_entry')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { uid, newEmail } = body;

    if (!uid || !newEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields: uid, newEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Try to update Auth email first
    let { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(uid, { email: newEmail, email_confirm: true });

    // Self-heal: if this profile has no matching Auth account yet, create one now
    if (authUpdateError && /not.*found|does not exist/i.test(authUpdateError.message || '')) {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        id: uid,
        email: newEmail,
        password: "TemporaryPassword123!", // Safe default password; they can change it later
        email_confirm: true
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create missing Auth account: ' + createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUpdateError = null; // resolved
    }

    if (authUpdateError) {
      return new Response(
        JSON.stringify({ error: 'Auth email update failed: ' + authUpdateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update public.users email to match
    const { error: profileUpdateError } = await supabaseAdmin.from('users').update({ email: newEmail }).eq('id', uid);
    if (profileUpdateError) {
      return new Response(
        JSON.stringify({ error: 'Auth updated, but profile update failed: ' + profileUpdateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal Server Error: ' + e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
