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

const supabase = createClient(url, anonKey);

async function inspectColumns() {
  console.log('--- INSPECTING USERS TABLE COLUMNS ---');
  
  // Try inserting with only 'id'
  const { data, error } = await supabase
    .from('users')
    .insert({ id: 'a13cee5d-c331-4429-b726-4e4f847c22c7' }) // Use the confirmed user ID
    .select();

  console.log('Insert with only id result:');
  console.log('Data:', data);
  console.log('Error:', error);
}

inspectColumns();
