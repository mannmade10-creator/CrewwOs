
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Add tools column via RPC raw SQL
const { error } = await supabase.rpc("exec_sql", {
  sql: "ALTER TABLE agents ADD COLUMN IF NOT EXISTS tools text[] DEFAULT '{}';"
});
console.log(error ?? "Column added");
