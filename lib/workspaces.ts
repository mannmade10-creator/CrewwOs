// lib/workspaces.ts
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

// Lightweight type used by the workspace switcher in DashboardShell.
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  vertical: string;
}

// Check if a Clerk userId belongs to a super-admin.
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("platform_admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// Look up a workspace by slug. Super-admins can access any workspace;
// regular users are scoped to their own.
export async function getWorkspace(slug: string, ownerId: string) {
  const supabase = supabaseAdmin();
  const adminCheck = await isSuperAdmin(ownerId);
  const query = supabase.from("workspaces").select("*").eq("slug", slug);
  // Only apply owner filter for non-admins
  const { data, error } = await (adminCheck ? query : query.eq("owner_id", ownerId)).single();
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

// Generate a URL-safe slug from a workspace name, with a short random suffix
// to avoid collisions when two users pick the same name.
function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

// Create a new workspace for a user, seed its agents, and return the row.
// plan defaults to "starter" for regular users; the create route passes
// "superadmin" for the platform owner so they get unlimited access for free.
export async function createWorkspace(
  userId: string,
  name: string,
  vertical: string = "general",
  plan: string = "starter"
) {
  const supabase = supabaseAdmin();
  const slug = makeSlug(name);

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      name,
      slug,
      owner_id: userId,
      vertical,
      plan,
      status: "active",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Seed agents for the new workspace (non-blocking — log errors but don't fail)
  try {
    await seedAgentsForWorkspace(workspace.id);
  } catch (seedErr: any) {
    console.error("seedAgentsForWorkspace failed:", seedErr.message);
  }

  return workspace;
}

// One-time seed: insert the agents for a workspace if they don't exist yet.
export async function seedAgentsForWorkspace(workspaceId: string) {
  const { AGENTS } = await import("./agents");
  const supabase = supabaseAdmin();
  const rows = AGENTS.map((a: any) => ({
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

// Resolve a workspace-scoped agent slug to its actual row id.
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

// All workspaces owned by a specific user — used by the dashboard index to
// redirect to the first workspace, and by the workspace switcher API route.
export async function listWorkspacesForUser(userId: string): Promise<WorkspaceSummary[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, plan, vertical")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkspaceSummary[];
}
