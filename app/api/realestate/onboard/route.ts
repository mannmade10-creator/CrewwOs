// app/api/realestate/onboard/route.ts
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
    await logAuditEvent({ req, actorId: "anonymous", action: "realestate.onboard.get.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`realestate-get:${userId}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supabase = supabaseAdmin();
  const { data: profile } = await supabase
    .from("realestate_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  const { data: leads } = await supabase
    .from("realestate_leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ profile: profile ?? null, leads: leads ?? [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    await logAuditEvent({ req, actorId: "anonymous", action: "realestate.onboard.post.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`realestate-post:${userId}`, 30, 60_000);
  if (!rl.allowed) {
    await logAuditEvent({ req, actorId: userId, action: "realestate.onboard.post.rate_limited" });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const rawStep = Number(body.onboarding_step);
  const onboarding_step = Math.min(Math.max(isNaN(rawStep) ? 1 : rawStep, 1), 5);
  const onboarding_complete = body.onboarding_complete === true;

  const payload: Record<string, unknown> = { user_id: userId, onboarding_step, onboarding_complete };
  const textFields = ["agent_name", "brokerage", "license_number", "specialty", "phone_number", "website", "photo_url", "zillow_url", "realtor_url"];
  for (const f of textFields) {
    const val = sanitize(body[f]);
    if (val !== undefined) payload[f] = val;
  }

  const supabase = supabaseAdmin();
  const { data: profile, error } = await supabase
    .from("realestate_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    await logAuditEvent({ req, actorId: userId, action: "realestate.onboard.post.db_error", metadata: { error: error.message } });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({ req, actorId: userId, action: "realestate.onboard.post.success", metadata: { step: onboarding_step } });
  return NextResponse.json({ profile }, { status: 200 });
}
