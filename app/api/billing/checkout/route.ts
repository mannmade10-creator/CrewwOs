// app/api/billing/checkout/route.ts
// POST { workspaceSlug?, workspaceName?, vertical?, plan, returnTo?, extraAgents?, niaUnlimited? }
//
// Two modes:
//  1. New onboarding (no workspaceSlug): stores workspace info as Stripe metadata;
//     the webhook creates the workspace and writes the slug to pending_checkouts.
//  2. Existing workspace upgrade (workspaceSlug present): upgrades an existing workspace.
//
// Workspace plan/status updated only on webhook confirmation — never optimistically here.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { getOrCreateStripeCustomer } from "@/lib/billing";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { workspaceSlug, workspaceName, vertical, plan, returnTo, extraAgents, niaUnlimited } = body;

  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for plan "${plan}"` },
      { status: 400 }
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  // ─── Mode 1: New onboarding (no existing workspace yet) ───────────────────
  const isNewOnboarding = !workspaceSlug;

  if (isNewOnboarding) {
    if (!workspaceName) {
      return NextResponse.json({ error: "workspaceName is required for new onboarding" }, { status: 400 });
    }

    // Create a Stripe customer for this new user (no workspace exists yet)
    const customer = await stripe.customers.create({
      metadata: { crewos_owner_id: userId },
    });
    const customerId = customer.id;

    const successUrl = `${origin}/api/billing/checkout-result?session_id={CHECKOUT_SESSION_ID}&vertical=${encodeURIComponent(vertical ?? "general")}`;
    const cancelUrl = `${origin}/onboarding?checkout=canceled`;

    // Build line items: base plan + optional add-ons
    const lineItems: { price: string; quantity: number }[] = [
      { price: priceId, quantity: 1 },
    ];

    const agentAddonPriceId = process.env.STRIPE_PRICE_AGENT_ADDON;
    if (extraAgents && extraAgents > 0 && agentAddonPriceId) {
      lineItems.push({ price: agentAddonPriceId, quantity: extraAgents });
    }

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
      // Collect card now but don't charge until trial ends
      payment_method_collection: "always",
      metadata: {
        crewos_new_workspace: "true",
        crewos_workspace_name: workspaceName,
        crewos_vertical: vertical ?? "general",
        crewos_owner_id: userId,
        crewos_plan: plan,
        extra_agents: String(extraAgents ?? 0),
        nia_unlimited: String(!!niaUnlimited),
      },
      subscription_data: {
        // 14-day free trial — card collected but not charged until trial ends.
        // Canceling before day 14 = no charge.
        trial_period_days: 14,
        metadata: {
          crewos_new_workspace: "true",
          crewos_workspace_name: workspaceName,
          crewos_vertical: vertical ?? "general",
          crewos_owner_id: userId,
          crewos_plan: plan,
          extra_agents: String(extraAgents ?? 0),
          nia_unlimited: String(!!niaUnlimited),
        },
      },
    });

    return NextResponse.json({ url: session.url });
  }

  // ─── Mode 2: Existing workspace upgrade ────────────────────────────────────
  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const customerId = await getOrCreateStripeCustomer(workspace);

  const successUrl = returnTo === "onboarding"
    ? `${origin}/onboarding?checkout=success&slug=${workspace.slug}&vertical=${workspace.vertical ?? ""}`
    : `${origin}/dashboard/${workspace.slug}/settings?checkout=success`;

  const cancelUrl = returnTo === "onboarding"
    ? `${origin}/onboarding?checkout=canceled&slug=${workspace.slug}&vertical=${workspace.vertical ?? ""}`
    : `${origin}/dashboard/${workspace.slug}/settings?checkout=canceled`;

  const lineItems: { price: string; quantity: number }[] = [
    { price: priceId, quantity: 1 },
  ];

  const agentAddonPriceId = process.env.STRIPE_PRICE_AGENT_ADDON;
  if (extraAgents && extraAgents > 0 && agentAddonPriceId) {
    lineItems.push({ price: agentAddonPriceId, quantity: extraAgents });
  }

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
    payment_method_collection: "always",
    metadata: {
      crewos_workspace_id: workspace.id,
      crewos_plan: plan,
      extra_agents: String(extraAgents ?? 0),
      nia_unlimited: String(!!niaUnlimited),
    },
    subscription_data: {
      // 14-day free trial for upgrades too
      trial_period_days: 14,
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
