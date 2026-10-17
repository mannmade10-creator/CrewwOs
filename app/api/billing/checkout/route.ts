// app/api/billing/checkout/route.ts
// POST { workspaceSlug, plan } — returns { url } to redirect the browser to
// Stripe's hosted Checkout. Workspace plan/status only get updated once the
// webhook confirms the subscription — never optimistically here.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { getOrCreateStripeCustomer } from "@/lib/billing";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceSlug, plan } = await req.json();
  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) return NextResponse.json({ error: `No Stripe price configured for plan "${plan}"` }, { status: 400 });

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const customerId = await getOrCreateStripeCustomer(workspace);

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/${workspace.slug}/settings?checkout=success`,
    cancel_url: `${origin}/dashboard/${workspace.slug}/settings?checkout=canceled`,
    metadata: { crewos_workspace_id: workspace.id, crewos_plan: plan },
    subscription_data: { metadata: { crewos_workspace_id: workspace.id, crewos_plan: plan } },
  });

  return NextResponse.json({ url: session.url });
}
