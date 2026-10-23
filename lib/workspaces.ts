// lib/workspaces.ts
import { supabaseAdmin, seedAgentsForWorkspace } from "./supabase";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  vertical?: string;
}

export async function listWorkspacesForUser(ownerId: string): Promise<WorkspaceSummary[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, plan, vertical")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// Generates a unique slug for a new workspace by appending -2, -3, etc.
// if the base slug is already taken (globally — slugs are unique across
// all workspaces, not just this owner's, since they're used in URLs).
async function uniqueSlug(base: string): Promise<string> {
  const supabase = supabaseAdmin();
  let candidate = base || "workspace";
  let n = 1;
  while (true) {
    const { data } = await supabase.from("workspaces").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

// Creates a new workspace for the given Clerk user, seeds it with all
// agents from lib/agents.ts, and defaults to the Starter plan — the person
// upgrades via Stripe checkout from Settings once they're ready to pay.
// Lifetime-access emails (in the lifetime_access table) are auto-upgraded
// to Enterprise at creation with no payment required.
export async function createWorkspace(ownerId: string, name: string, vertical = "general", ownerEmail?: string): Promise<WorkspaceSummary> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Workspace name is required");

  const slug = await uniqueSlug(slugify(trimmed));
  const supabase = supabaseAdmin();

  // Check lifetime access whitelist
  let plan = "starter";
  if (ownerEmail) {
    const { data: lifetimeRow } = await supabase
      .from("lifetime_access")
      .select("email")
      .ilike("email", ownerEmail.trim())
      .maybeSingle();
    if (lifetimeRow) plan = "enterprise";
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: trimmed, slug, owner_id: ownerId, plan, vertical, owner_email: ownerEmail ?? null })
    .select("id, name, slug, plan, vertical")
    .single();
  if (error) throw error;

  await seedAgentsForWorkspace(data.id);
  return data;
}
