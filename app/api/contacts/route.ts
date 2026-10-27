// app/api/contacts/route.ts
//
// GET  /api/contacts          — list contacts for the authed workspace
// POST /api/contacts          — create a single contact
// POST /api/contacts/import   — bulk import from CSV or JSON array
//
// All mutations fire the vertical-specific onboarding trigger so Lob sends
// go out automatically when trigger_event = 'new_contact' on a campaign.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fireContactTriggers } from "@/lib/contact-triggers";

// ─── GET /api/contacts ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const workspaceSlug = req.nextUrl.searchParams.get("workspace");
  const vertical = req.nextUrl.searchParams.get("vertical");
  const tag = req.nextUrl.searchParams.get("tag");
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 200);
  const offset = (page - 1) * limit;

  // Resolve workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug ?? "")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (vertical) query = query.eq("vertical", vertical);
  if (tag) query = query.contains("tags", [tag]);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contacts: data, total: count, page, limit });
}

// ─── POST /api/contacts ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { workspaceSlug, contacts: bulkContacts, ...singleContact } = body;

  const supabase = supabaseAdmin();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, vertical")
    .eq("slug", workspaceSlug ?? "")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  // Bulk import path
  if (Array.isArray(bulkContacts)) {
    const rows = bulkContacts.map((c) => ({
      ...c,
      workspace_id: workspace.id,
      vertical: c.vertical ?? workspace.vertical ?? "business",
      source: c.source ?? "import_csv",
    }));

    const { data, error } = await supabase
      .from("contacts")
      .insert(rows)
      .select("id, vertical, first_name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fire triggers for each new contact (async, don't await)
    for (const contact of data ?? []) {
      fireContactTriggers(workspace.id, contact.id, "new_contact").catch(console.error);
    }

    return NextResponse.json({ imported: data?.length ?? 0, contacts: data });
  }

  // Single contact path
  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      ...singleContact,
      workspace_id: workspace.id,
      vertical: singleContact.vertical ?? workspace.vertical ?? "business",
      source: singleContact.source ?? "manual",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire onboarding triggers
  fireContactTriggers(workspace.id, contact.id, "new_contact").catch(console.error);

  return NextResponse.json({ contact });
}
