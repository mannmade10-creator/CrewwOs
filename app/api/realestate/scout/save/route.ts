// app/api/realestate/scout/save/route.ts
// Save a scouted deal to scout_deals table (POST) or update status (PATCH)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

const MAX_STR = 500;
function s(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.trim().slice(0, MAX_STR) || undefined;
}

const VALID_STATUSES = ["new","analyzing","contacted","offer_sent","under_contract","closed","passed"] as const;
const VALID_PRIORITIES = ["low","medium","high","hot"] as const;
const VALID_SOURCES = ["mls","fsbo_zillow","fsbo_craigslist","attom","manual"] as const;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    await logAuditEvent({ req, actorId: "anonymous", action: "realestate.scout.save.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = checkRateLimit(`realestate-scout-save:${userId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));

  const address = s(body.address);
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const rawSource = s(body.source) as typeof VALID_SOURCES[number];
  if (!VALID_SOURCES.includes(rawSource)) return NextResponse.json({ error: "Invalid source" }, { status: 400 });

  const listPriceDollars = Number(body.list_price);
  const estArvDollars    = Number(body.est_arv);
  const estRepairDollars = Number(body.est_repair);

  const payload = {
    user_id:        userId,
    source:         rawSource,
    external_id:    s(body.external_id),
    address,
    city:           s(body.city),
    state:          s(body.state),
    zip:            s(body.zip),
    property_type:  s(body.property_type),
    beds:           Number(body.beds) || null,
    baths:          Number(body.baths) || null,
    sqft:           Number(body.sqft) || null,
    year_built:     Number(body.year_built) || null,
    list_price:     isNaN(listPriceDollars) ? null : listPriceDollars * 100, // store cents
    est_arv:        isNaN(estArvDollars)    ? null : estArvDollars * 100,
    est_repair:     isNaN(estRepairDollars) ? null : estRepairDollars * 100,
    status:         VALID_STATUSES.includes(body.status) ? body.status : "new",
    priority:       VALID_PRIORITIES.includes(body.priority) ? body.priority : "medium",
    notes:          s(body.notes),
    listing_url:    s(body.listing_url),
    is_fsbo:        body.is_fsbo === true,
    days_on_market: Number(body.days_on_market) || null,
  };

  const supabase = supabaseAdmin();
  const { data: deal, error } = await supabase
    .from("scout_deals")
    .upsert(payload, { onConflict: "user_id,source,external_id" })
    .select()
    .single();

  if (error) {
    await logAuditEvent({ req, actorId: userId, action: "realestate.scout.save.error", metadata: { error: error.message } });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({ req, actorId: userId, action: "realestate.scout.save.success", metadata: { id: deal.id } });
  return NextResponse.json({ deal });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = checkRateLimit(`realestate-scout-patch:${userId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const id = s(body.id);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (VALID_STATUSES.includes(body.status))   patch.status   = body.status;
  if (VALID_PRIORITIES.includes(body.priority)) patch.priority = body.priority;
  if (typeof body.notes === "string")          patch.notes    = body.notes.slice(0, 2000);
  if (typeof body.est_arv === "number")        patch.est_arv  = body.est_arv * 100;
  if (typeof body.est_repair === "number")     patch.est_repair = body.est_repair * 100;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: deal, error } = await supabase
    .from("scout_deals")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)   // enforce ownership
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAuditEvent({ req, actorId: userId, action: "realestate.scout.patch.success", metadata: { id, patch } });
  return NextResponse.json({ deal });
}
