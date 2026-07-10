import { createClient } from '@supabase/supabase-js';
const url = 'https://faosnkfbzehdpnyifnwt.supabase.co';
const service_role = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb3Nua2ZiemVoZHBueWlmbnd0Iiwibm9uY2UiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NzY1OTkzNjQsImV4cCI6MjA5MjE3NTM2NH0.uIfjia8d2qn50WWNWbxHFO_F2C6i_UYQfQG6FAGDhPs';

const supabase = createClient(url, service_role);

async function main() {
  const { data, error } = await supabase.from('users').select('*').limit(3);
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

main();
