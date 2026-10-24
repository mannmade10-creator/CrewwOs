import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Used by the billing system (lib/billing.ts, app/api/billing/checkout)
// Maps plan slugs (from lib/plans.ts) to Stripe Price IDs.
// growth and agency use the same env vars as the old "pro" key for
// backward compatibility; update these env vars to point at the correct
// Stripe prices once they're created in your dashboard.
export const PLAN_PRICE_IDS: Record<string, string> = {
  starter:    process.env.STRIPE_PRICE_STARTER!,
  growth:     process.env.STRIPE_PRICE_GROWTH ?? process.env.STRIPE_PRICE_PRO!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
  agency:     process.env.STRIPE_PRICE_AGENCY ?? process.env.STRIPE_PRICE_ENTERPRISE!,
  // legacy alias kept for any existing references
  pro:        process.env.STRIPE_PRICE_PRO!,
};

// Full price ID map for all products
export const PRICE_IDS = {
  // Main subscription tiers
  starter:    process.env.STRIPE_PRICE_STARTER!,
  growth:     process.env.STRIPE_PRICE_GROWTH ?? process.env.STRIPE_PRICE_PRO!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
  agency:     process.env.STRIPE_PRICE_AGENCY ?? process.env.STRIPE_PRICE_ENTERPRISE!,
  pro:        process.env.STRIPE_PRICE_PRO!,

  // Website + App Builder (standalone)
  site_basic:  process.env.STRIPE_PRICE_SITE_BASIC!,
  site_pro:    process.env.STRIPE_PRICE_SITE_PRO!,
  site_elite:  process.env.STRIPE_PRICE_SITE_ELITE!,

  // Nia AI Receptionist
  nia_setup:        process.env.STRIPE_PRICE_NIA_SETUP!,
  nia_credits_500:  process.env.STRIPE_PRICE_NIA_500!,
  nia_credits_1500: process.env.STRIPE_PRICE_NIA_1500!,
  nia_credits_5000: process.env.STRIPE_PRICE_NIA_5000!,
  // Nia Unlimited add-on: $100/mo flat for Starter and Growth plans
  nia_unlimited:    process.env.STRIPE_PRICE_NIA_UNLIMITED!,

  // Agent add-on: per-seat recurring price (quantity = # extra agents)
  // Pricing varies by plan but uses a single Stripe price with different
  // quantities; the plan-level discount must be handled via Stripe Coupons
  // or separate per-plan price IDs if needed later.
  agent_addon:      process.env.STRIPE_PRICE_AGENT_ADDON!,

  // Business Formation
  biz_registration:   process.env.STRIPE_PRICE_BIZ_REGISTRATION!,
  biz_ein:            process.env.STRIPE_PRICE_BIZ_EIN!,
  biz_bundle:         process.env.STRIPE_PRICE_BIZ_BUNDLE!,
  biz_registered_agent: process.env.STRIPE_PRICE_BIZ_AGENT!,
} as const;

export type PriceKey = keyof typeof PRICE_IDS;
