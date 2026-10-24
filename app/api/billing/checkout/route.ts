// app/api/billing/checkout/route.ts
// POST { workspaceSlug, plan, returnTo?, extraAgents?, niaUnlimited? }
// Returns { url } to redirect browser to Stripe hosted Checkout.
// Workspace plan/status updated only on webhook confirmation — never optimistically here.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { getOrCreateStripeCustomer } from "@/lib/billing";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceSlug, plan, returnTo, extraAgents, niaUnlimited } = await req.json();

  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for plan "${plan}"` },
      { status: 400 }
    );
  }

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const customerId = await getOrCreateStripeCustomer(workspace);

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  // Return to onboarding when coming from the wizard, otherwise settings
  const successUrl = returnTo === "onboarding"
    ? `${origin}/onboarding?checkout=success&slug=${workspace.slug}&vertical=${workspace.vertical ?? ""}`
    : `${origin}/dashboard/${workspace.slug}/settings?checkout=success`;

  const cancelUrl = returnTo === "onboarding"
    ? `${origin}/onboarding?checkout=canceled&slug=${workspace.slug}&vertical=${workspace.vertical ?? ""}`
    : `${origin}/dashboard/${workspace.slug}/settings?checkout=canceled`;

  // Build line items: base plan + optional add-ons
  const lineItems: { price: string; quantity: number }[] = [
    { price: priceId, quantity: 1 },
  ];

  // Extra agents add-on (per-agent recurring price)
  const agentAddonPriceId = process.env.STRIPE_PRICE_AGENT_ADDON;
  if (extraAgents && extraAgents > 0 && agentAddonPriceId) {
    lineItems.push({ price: agentAddonPriceId, quantity: extraAgents });
  }

  // Nia Unlimited add-on ($100/mo flat)
  const niaUnlimitedPriceId = process.env.STRIPE_PRICE_NIA_UNLIMITED;
  if (niaUnlimited && niaUnlimitedPriceId) {
    lineItems.push({ price: niaUnlimitedPriceId, quantity: 1 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      crewos_workspace_id: workspace.id,
      crewos_plan: plan,
      extra_agents: String(extraAgents ?? 0),
      nia_unlimited: String(!!niaUnlimited),
    },
    subscription_data: {
      metadata: {
        crewos_workspace_id: workspace.id,
        crewos_plan: plan,
        extra_agents: String(extraAgents ?? 0),
        nia_unlimited: String(!!niaUnlimited),
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
