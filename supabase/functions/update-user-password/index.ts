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
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: ' + (authError?.message || 'Invalid token') }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'data_entry')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Requester must be admin or data_entry' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { uid, password } = body;

    if (!uid || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: uid, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to update the password first
    let { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(uid, { password });

    // Self-heal: if this profile has no matching Auth account yet, create one now
    if (updateError && /not.*found|does not exist/i.test(updateError.message || '')) {
      const { data: profileRow, error: profileFetchError } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', uid)
        .single();

      if (profileFetchError || !profileRow?.email) {
        return new Response(
          JSON.stringify({ error: 'Cannot create Auth account: no email on file for this user. Add an email first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        id: uid,
        email: profileRow.email,
        password,
        email_confirm: true
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create missing Auth account: ' + createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      updateError = null; // resolved
    }

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Password update failed: ' + updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error: ' + e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
