// app/api/workspaces/[slug]/route.ts
// PATCH  — rename a workspace
// DELETE — soft-delete (set status = 'cancelled') so it vanishes from the switcher

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin, isSuperAdmin } from "@/lib/workspaces";

type Params = { params: Promise<{ slug: string }> };

// ── PATCH /api/workspaces/[slug] ─────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const admin = await isSuperAdmin(userId);

  if (!admin) {
    const { data, error } = await supabase
      .from("workspaces")
      .update({ name: name.trim() })
      .eq("slug", slug)
      .eq("owner_id", userId)
      .select("id, name, slug, plan")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ workspace: data });
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: name.trim() })
    .eq("slug", slug)
    .select("id, name, slug, plan")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ workspace: data });
}

// ── DELETE /api/workspaces/[slug] ────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const supabase = supabaseAdmin();
  const admin = await isSuperAdmin(userId);

  const baseUpdate = supabase
    .from("workspaces")
    .update({ status: "cancelled" })
    .eq("slug", slug);

  const { error } = await (admin ? baseUpdate : baseUpdate.eq("owner_id", userId));

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
