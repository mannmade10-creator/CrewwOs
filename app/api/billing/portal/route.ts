// app/api/billing/portal/route.ts
// POST { workspaceSlug } — returns { url } to Stripe's Billing Portal,
// where the workspace owner can update payment method, view invoices,
// or cancel. No plan-change logic lives in CrewOS itself here.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceSlug } = await req.json();
  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  if (!workspace.stripe_customer_id) {
    return NextResponse.json({ error: "This workspace has no billing account yet — start a checkout first." }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.stripe_customer_id,
    return_url: `${origin}/dashboard/${workspace.slug}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
