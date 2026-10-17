// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Service-role client for server-side API routes only.
// Never import this into client components.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Look up a workspace by slug, scoped to the authenticated Clerk user.
export async function getWorkspace(slug: string, ownerId: string) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .eq("owner_id", ownerId)
    .single();
  if (error) throw error;
  return data;
}

// Look up a workspace by its raw id — no owner check, since this is only
// ever called from trusted server-side contexts (webhooks, cron) that
// already resolved the id through their own legitimate means (e.g.
// matching a Resend domain), not from anything a browser request controls.
export async function getWorkspaceById(id: string) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Every workspace, regardless of owner — used only by server-only jobs
// (the cron route) that need to run across all workspaces. Never expose
// this to a user-facing route; there's no ownership check here.
export async function listAllWorkspaces() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("workspaces").select("*");
  if (error) throw error;
  return data ?? [];
}

// One-time seed: insert the 19 agents for a workspace if they don't exist yet.
export async function seedAgentsForWorkspace(workspaceId: string) {
  const { AGENTS } = await import("./agents");
  const supabase = supabaseAdmin();
  const rows = AGENTS.map(a => ({
    workspace_id: workspaceId,
    slug: a.slug,
    name: a.name,
    role: a.role,
    dept: a.dept,
    persona: a.persona,
    is_active: true,
  }));
  const { error } = await supabase
    .from("agents")
    .upsert(rows, { onConflict: "workspace_id,slug", ignoreDuplicates: true });
  if (error) throw error;
}

// Log a tool execution or task to the tasks table for the activity feed / audit log.
// Resolves a workspace-scoped agent slug (e.g. "qa") to its actual row id —
// several tables (tasks, conversations) have a real uuid FK to agents.id,
// not the human-readable slug. Shared here so every caller resolves it the
// same way instead of each reimplementing the lookup.
export async function resolveAgentRowId(workspaceId: string, agentSlug: string): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("agents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", agentSlug)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export async function logTask(params: {
  workspaceId: string;
  agentSlug: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "failed";
  result?: string;
}) {
  const agentRowId = await resolveAgentRowId(params.workspaceId, params.agentSlug);
  if (!agentRowId) {
    console.error(`logTask: couldn't resolve agent "${params.agentSlug}" to a row id`);
    return;
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("tasks").insert({
    workspace_id: params.workspaceId,
    agent_id: agentRowId,
    title: params.title,
    status: params.status,
    result: params.result ?? null,
    completed_at: params.status === "done" || params.status === "failed" ? new Date().toISOString() : null,
  });
  if (error) console.error("logTask failed:", error.message);
}
