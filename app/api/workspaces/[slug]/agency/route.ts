// app/api/workspaces/[slug]/agency/route.ts
// GET  — list client workspaces linked to this agency
// POST — ban or delete a client workspace

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace, supabaseAdmin } from "@/lib/workspaces";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await getWorkspace(slug, userId);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workspace.plan !== "agency" && workspace.plan !== "superadmin") {
    return NextResponse.json({ error: "Agency plan required" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("workspaces")
    .select("id, name, slug, plan, vertical, owner_email, banned_at, created_at")
    .eq("agency_workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const agencyWorkspace = await getWorkspace(slug, userId);
  if (!agencyWorkspace) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (agencyWorkspace.plan !== "agency" && agencyWorkspace.plan !== "superadmin") {
    return NextResponse.json({ error: "Agency plan required" }, { status: 403 });
  }

  const { action, clientSlug } = await req.json();
  if (!action || !clientSlug) {
    return NextResponse.json({ error: "action and clientSlug required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Confirm client belongs to this agency
  const { data: client } = await db
    .from("workspaces")
    .select("id, agency_workspace_id")
    .eq("slug", clientSlug)
    .eq("agency_workspace_id", agencyWorkspace.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Client workspace not found or not yours" }, { status: 404 });
  }

  if (action === "ban") {
    const { error } = await db
      .from("workspaces")
      .update({ banned_at: new Date().toISOString(), banned_by: userId })
      .eq("id", client.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "banned" });
  }

  if (action === "unban") {
    const { error } = await db
      .from("workspaces")
      .update({ banned_at: null, banned_by: null })
      .eq("id", client.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "unbanned" });
  }

  if (action === "delete") {
    // Soft-delete: detach from agency and archive (we keep the row for billing records)
    // A full hard delete would require cascading — use with caution
    const { error } = await db
      .from("workspaces")
      .update({ agency_workspace_id: null, banned_at: new Date().toISOString(), banned_by: userId })
      .eq("id", client.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "removed" });
  }

  return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
}
