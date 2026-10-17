
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { error } = await supabase
  .from("agents")
  .update({ tools: ["db_query", "figma_export", "reports_generate"] })
  .eq("slug", "designer");
console.log(error ?? "Nova tools synced to DB");
