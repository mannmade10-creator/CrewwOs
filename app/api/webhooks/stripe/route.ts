import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_MAP: Record<string, string> = {
  starter: "starter",
  pro: "pro",
  enterprise: "enterprise",
};

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const priceKey = session.metadata?.priceKey;

      if (!userId || !priceKey) break;

      const plan = PLAN_MAP[priceKey];
      if (plan) {
        // Update workspace plan for subscription products
        await supabaseAdmin
          .from("workspaces")
          .update({
            plan,
            stripe_subscription_id: session.subscription as string,
            stripe_customer_id: session.customer as string,
          })
          .eq("owner_id", userId);
      }

      // Handle Nia credits
      if (priceKey.startsWith("nia_credits_")) {
        const credits = parseInt(priceKey.split("_").pop() ?? "0");
        if (credits > 0) {
          const { data: existing } = await supabaseAdmin
            .from("nia_credits")
            .select("credits")
            .eq("user_id", userId)
            .single();

          if (existing) {
            await supabaseAdmin
              .from("nia_credits")
              .update({ credits: existing.credits + credits })
              .eq("user_id", userId);
          } else {
            await supabaseAdmin.from("nia_credits").insert({
              user_id: userId,
              credits,
              monthly_reset: 0,
            });
          }
        }
      }

      // Handle Nia setup
      if (priceKey === "nia_setup") {
        await supabaseAdmin.from("nia_credits").upsert(
          { user_id: userId, credits: 100, monthly_reset: 100 },
          { onConflict: "user_id" }
        );
      }

      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const status = sub.status;

      if (status === "canceled" || status === "unpaid") {
        await supabaseAdmin
          .from("workspaces")
          .update({ plan: "free" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      await supabaseAdmin
        .from("workspaces")
        .update({ plan: "free", stripe_subscription_id: null })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: { bodyParser: false },
};
