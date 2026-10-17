// lib/billing.ts
import { supabaseAdmin } from "./supabase";
import { stripe, PLAN_PRICE_IDS } from "./stripe";

// Reuses an existing Stripe customer for the workspace if one exists,
// otherwise creates one and persists the ID immediately (so a page refresh
// mid-checkout doesn't create a duplicate customer).
export async function getOrCreateStripeCustomer(workspace: { id: string; name: string; stripe_customer_id: string | null }): Promise<string> {
  if (workspace.stripe_customer_id) return workspace.stripe_customer_id;

  const customer = await stripe.customers.create({
    name: workspace.name,
    metadata: { crewos_workspace_id: workspace.id },
  });

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("workspaces")
    .update({ stripe_customer_id: customer.id })
    .eq("id", workspace.id);
  if (error) throw error;

  return customer.id;
}

// Called from the webhook handler once Stripe confirms a checkout/subscription
// change. This is the only place workspace billing state gets written, so the
// dashboard and Stripe can never drift out of sync from two different writers.
export async function syncWorkspaceSubscription(params: {
  workspaceId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string | null;
  plan: string | null;
}): Promise<void> {
  const supabase = supabaseAdmin();
  const update: Record<string, any> = {
    stripe_customer_id: params.stripeCustomerId,
    stripe_subscription_id: params.stripeSubscriptionId,
    stripe_status: params.status,
  };
  if (params.plan) update.plan = params.plan;

  const { error } = await supabase
    .from("workspaces")
    .update(update)
    .eq("stripe_customer_id", params.stripeCustomerId);
  if (error) throw error;
}

// Reverse-lookup: given a Stripe Price ID, which of our plan slugs does it
// belong to? Needed because webhook events carry price IDs, not plan names.
export function planFromPriceId(priceId: string | undefined): string | null {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return plan;
  }
  return null;
}
