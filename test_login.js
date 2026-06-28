import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env file
const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

const email = 'abdurraffay705@gmail.com';
const password = '12345Ab!';

const supabase = createClient(url, anonKey);

async function testLogin() {
  console.log('--- TESTING SUPABASE AUTHENTICATION ---');
  console.log('Target URL:', url);
  console.log('Testing Email:', email);
  
  try {
    // 1. Attempt login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('\n❌ Login Failed!');
      console.error('Error Message:', authError.message);
      return;
    }

    console.log('\n✅ Login Succeeded!');
    console.log('Authenticated User ID:', authData.user.id);
    console.log('Email Confirmed At:', authData.user.email_confirmed_at);
    
    // 2. Query users table
    console.log('\n--- QUERYING PUBLIC.USERS TABLE ---');
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error('❌ Error fetching user role from database users table:', queryError.message);
    } else if (!userData) {
      console.log('⚠️ No matching profile row found in public.users table (User not found).');
      
      // Try to auto-insert the profile
      console.log('\n--- TRYING TO AUTO-CREATE USER PROFILE ROW ---');
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          full_name: email.split('@')[0],
          role: 'admin'
        });

      if (insertError) {
        console.error('❌ Auto-insert failed:', insertError.message);
      } else {
        console.log('✅ Auto-inserted user profile row successfully!');
        // Fetch again to verify
        const { data: verifyData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();
        console.log('Verified user data in table:', verifyData);
      }
    } else {
      console.log('✅ Found matching user profile in users table:', userData);
    }

  } catch (err) {
    console.error('Unexpected execution error:', err);
  }
}

testLogin();
