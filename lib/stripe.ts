import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Used by the existing billing system (lib/billing.ts, app/api/billing/checkout)
export const PLAN_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
};

// Full price ID map for all products
export const PRICE_IDS = {
  // Main subscription tiers
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,

  // Website + App Builder (standalone)
  site_basic: process.env.STRIPE_PRICE_SITE_BASIC!,
  site_pro: process.env.STRIPE_PRICE_SITE_PRO!,
  site_elite: process.env.STRIPE_PRICE_SITE_ELITE!,

  // Nia AI Receptionist
  nia_setup: process.env.STRIPE_PRICE_NIA_SETUP!,
  nia_credits_500: process.env.STRIPE_PRICE_NIA_500!,
  nia_credits_1500: process.env.STRIPE_PRICE_NIA_1500!,
  nia_credits_5000: process.env.STRIPE_PRICE_NIA_5000!,

  // Business Formation
  biz_registration: process.env.STRIPE_PRICE_BIZ_REGISTRATION!,
  biz_ein: process.env.STRIPE_PRICE_BIZ_EIN!,
  biz_bundle: process.env.STRIPE_PRICE_BIZ_BUNDLE!,
  biz_registered_agent: process.env.STRIPE_PRICE_BIZ_AGENT!,
} as const;

export type PriceKey = keyof typeof PRICE_IDS;
