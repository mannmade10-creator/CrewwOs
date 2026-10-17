// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Section 12 pricing. Price IDs come from your Stripe dashboard (create one
// recurring monthly Price per plan) — set as env vars, never hardcode the
// actual price ID strings here since they differ between test/live modes.
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  agency: process.env.STRIPE_PRICE_AGENCY,
};

// Note: display labels (name/price/agents copy) live in lib/plans.ts, which
// has zero Stripe SDK / secret dependencies and is safe to import from
// client components. Nothing in this file should ever be imported by a
// "use client" component.

// Maps a Stripe subscription status to whether the workspace should be
// treated as having active paid access. `trialing` and `active` both count;
// everything else (past_due, canceled, unpaid, incomplete_expired) doesn't.
export function isPaidStatus(status: string | null): boolean {
  return status === "trialing" || status === "active";
}
