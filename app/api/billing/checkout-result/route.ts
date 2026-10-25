// app/api/billing/checkout-result/route.ts
// GET ?session_id=STRIPE_SESSION_ID&vertical=...
//
// Called by Stripe's success_url after new-workspace onboarding.
// The webhook already ran and wrote the new workspace slug to pending_checkouts.
// We read it here and redirect to /onboarding?checkout=success&slug=...&vertical=...
//
// If the webhook hasn't finished yet (race condition), we retry up to 5 times
// with 1-second delays before giving up and showing an error page.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const vertical  = searchParams.get("vertical") ?? "general";

  if (!sessionId) {
    return NextResponse.redirect(new URL("/onboarding?checkout=error", req.url));
  }

  // Retry up to 6 times (0, 1, 2, 3, 4, 5 seconds) to handle webhook latency.
  let slug: string | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await sleep(1000);

    const { data } = await supabaseAdmin
      .from("pending_checkouts")
      .select("workspace_slug")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (data?.workspace_slug) {
      slug = data.workspace_slug;
      break;
    }
  }

  if (!slug) {
    // Webhook didn't finish in time — redirect to a "payment received" page
    // where we ask the user to wait or contact support.
    console.error(`[checkout-result] No pending_checkout found for session ${sessionId} after retries`);
    return NextResponse.redirect(
      new URL(`/onboarding?checkout=pending&session_id=${sessionId}&vertical=${encodeURIComponent(vertical)}`, req.url)
    );
  }

  // Clean up the pending_checkouts row (best-effort)
  await supabaseAdmin
    .from("pending_checkouts")
    .delete()
    .eq("stripe_session_id", sessionId);

  // Send user to the intake form with their real workspace slug
  const url = new URL("/onboarding", req.url);
  url.searchParams.set("checkout", "success");
  url.searchParams.set("slug", slug);
  url.searchParams.set("vertical", vertical);

  return NextResponse.redirect(url);
}
