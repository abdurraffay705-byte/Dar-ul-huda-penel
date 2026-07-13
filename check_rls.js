import { createClient } from '@supabase/supabase-js';

const url = 'https://faosnkfbzehdpnyifnwt.supabase.co';
const service_role = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb3Nua2ZiemVoZHBueWlmbnd0Iiwibm9uY2UiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NzY1OTkzNjQsImV4cCI6MjA5MjE3NTM2NH0.uIfjia8d2qn50WWNWbxHFO_F2C6i_UYQfQG6FAGDhPs';

const supabase = createClient(url, service_role);

async function main() {
  const { data, error } = await supabase.rpc('execute_sql_temp', {
    sql_query: "SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'users';"
  });
  
  if (error) {
    // If the RPC doesn't exist, we can use a direct SQL query or read all schema info
    console.error("Error executing via RPC:", error.message);
    
    // Let's try executing standard sql if we have execute_sql (but since execute_sql failed due to auth, let's query pg_policies using standard supabase.from if possible, but pg_policies is a system view and not exposed via PostgREST unless there is an RPC).
    // Let's try listing tables or running a query on a custom RPC if one exists.
  } else {
    console.log("Policies:", JSON.stringify(data, null, 2));
  }
}

main();
