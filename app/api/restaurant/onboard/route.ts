// app/api/restaurant/onboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

const MAX_STR = 500;
function sanitize(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.trim().slice(0, MAX_STR);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    await logAuditEvent({ req, actorId: "anonymous", action: "restaurant.onboard.get.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`restaurant-get:${userId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supabase = supabaseAdmin();
  const { data: profile } = await supabase
    .from("restaurant_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return NextResponse.json({ profile: profile ?? null });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    await logAuditEvent({ req, actorId: "anonymous", action: "restaurant.onboard.post.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`restaurant-post:${userId}`, 30, 60_000);
  if (!rl.allowed) {
    await logAuditEvent({ req, actorId: userId, action: "restaurant.onboard.post.rate_limited" });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const rawStep = Number(body.onboarding_step);
  const onboarding_step = Math.min(Math.max(isNaN(rawStep) ? 1 : rawStep, 1), 5);
  const onboarding_complete = body.onboarding_complete === true;

  const payload: Record<string, unknown> = { user_id: userId, onboarding_step, onboarding_complete };
  const textFields = ["restaurant_name", "cuisine_type", "phone_number", "address", "website", "logo_url", "google_business_url", "yelp_url", "doordash_url"];
  for (const f of textFields) {
    const val = sanitize(body[f]);
    if (val !== undefined) payload[f] = val;
  }

  const supabase = supabaseAdmin();
  const { data: profile, error } = await supabase
    .from("restaurant_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    await logAuditEvent({ req, actorId: userId, action: "restaurant.onboard.post.db_error", metadata: { error: error.message } });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({ req, actorId: userId, action: "restaurant.onboard.post.success", metadata: { step: onboarding_step } });
  return NextResponse.json({ profile }, { status: 200 });
}
