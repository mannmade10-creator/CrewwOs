// app/api/billing/webhook/route.ts
// Stripe calls this directly (no Clerk session, no browser). Signature
// verification against the raw request body is what proves a request
// actually came from Stripe rather than someone POSTing fake plan upgrades.
//
// Configure this URL in the Stripe dashboard (or `stripe listen --forward-to`
// during local dev) listening for at least:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { syncWorkspaceSubscription, planFromPriceId } from "@/lib/billing";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    // Deliberately vague to the caller — don't leak why verification failed.
    console.error("Stripe webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price.id;

        await syncWorkspaceSubscription({
          workspaceId: session.metadata?.crewos_workspace_id ?? "",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          plan: planFromPriceId(priceId),
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;

        await syncWorkspaceSubscription({
          workspaceId: subscription.metadata?.crewos_workspace_id ?? "",
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          plan: planFromPriceId(priceId),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncWorkspaceSubscription({
          workspaceId: subscription.metadata?.crewos_workspace_id ?? "",
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: null,
          status: "canceled",
          plan: null, // keep the last plan on record rather than guessing a downgrade
        });
        break;
      }

      default:
        // Unhandled event types are fine to ignore — Stripe sends many more
        // than CrewOS currently cares about.
        break;
    }
  } catch (err: any) {
    console.error(`Failed to process Stripe webhook ${event.type}:`, err.message);
    // Returning 200 here would hide real failures from Stripe's retry logic;
    // 500 makes Stripe retry delivery instead.
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
