import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { error } = await supabase.from("workspaces").update({ name: "CrewwOS" }).eq("slug", "mannmade10-gmail-com");
console.log(error ?? "Updated OK");
