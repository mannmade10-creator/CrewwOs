// app/api/realestate/scout/deals/route.ts
// List saved scout deals for the authenticated user
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

const VALID_STATUSES = ["new","analyzing","contacted","offer_sent","under_contract","closed","passed"];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    await logAuditEvent({ req, actorId: "anonymous", action: "realestate.scout.deals.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = checkRateLimit(`realestate-scout-deals:${userId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const url   = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit  = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);

  const supabase = supabaseAdmin();
  let query = supabase
    .from("scout_deals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq("status", status);
  }

  const { data: deals, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Convert cents → dollars for the frontend
  const formatted = (deals ?? []).map(d => ({
    ...d,
    list_price: d.list_price != null ? d.list_price / 100 : null,
    est_arv:    d.est_arv    != null ? d.est_arv    / 100 : null,
    est_repair: d.est_repair != null ? d.est_repair / 100 : null,
  }));

  return NextResponse.json({ deals: formatted });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = checkRateLimit(`realestate-scout-delete:${userId}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const url = new URL(req.url);
  const id  = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("scout_deals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAuditEvent({ req, actorId: userId, action: "realestate.scout.deal.deleted", metadata: { id } });
  return NextResponse.json({ ok: true });
}
