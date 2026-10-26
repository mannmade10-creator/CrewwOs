import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createWorkspace } from "@/lib/workspaces";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Use supabaseAdmin from lib to keep a single client factory.
// Direct createClient here is fine for webhook-only use, but consistent with lib pattern.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const PLAN_MAP: Record<string, string> = {
  starter:    "starter",
  growth:     "growth",
  enterprise: "enterprise",
  agency:     "agency",
  // legacy alias
  pro:        "growth",
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

      const isNewWorkspace = session.metadata?.crewos_new_workspace === "true";
      const workspaceId    = session.metadata?.crewos_workspace_id;
      const crewosplan     = session.metadata?.crewos_plan;
      const priceKey       = session.metadata?.priceKey;
      const userId         = session.metadata?.userId; // set by /api/checkout for Nia flows

      // ── New-workspace onboarding path ────────────────────────────────────
      if (isNewWorkspace) {
        const workspaceName = session.metadata?.crewos_workspace_name ?? "My Workspace";
        const vertical      = session.metadata?.crewos_vertical ?? "general";
        const ownerId       = session.metadata?.crewos_owner_id;
        const plan          = PLAN_MAP[crewosplan ?? ""] ?? "starter";

        if (!ownerId) {
          console.error("[stripe webhook] Missing crewos_owner_id on new workspace session", session.id);
          break;
        }

        try {
          // createWorkspace(userId, name, vertical, plan)
          const workspace = await createWorkspace(ownerId, workspaceName, vertical, plan);

          // Stamp the Stripe IDs onto the new workspace
          await supabaseAdmin
            .from("workspaces")
            .update({
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id:     session.customer as string,
            })
            .eq("id", workspace.id);

          // Write slug to pending_checkouts so the redirect API can pick it up
          await supabaseAdmin.from("pending_checkouts").insert({
            stripe_session_id: session.id,
            workspace_slug:    workspace.slug,
            owner_id:          ownerId,
          });

          console.log(`[stripe webhook] New workspace created: ${workspace.slug} for session ${session.id}`);
        } catch (err) {
          console.error("[stripe webhook] Failed to create workspace:", err);
        }

        break;
      }

      // ── Existing workspace upgrade path ──────────────────────────────────
      if (workspaceId && crewosplan && PLAN_MAP[crewosplan]) {
        await supabaseAdmin
          .from("workspaces")
          .update({
            plan:                    PLAN_MAP[crewosplan],
            stripe_subscription_id:  session.subscription as string,
            stripe_customer_id:      session.customer as string,
          })
          .eq("id", workspaceId);
      }

      // ── Nia credit pack purchase (one-time payment, NiaCreditsClient) ────
      if (priceKey && userId) {
        if (priceKey.startsWith("nia_credits_")) {
          const credits = parseInt(priceKey.replace("nia_credits_", ""), 10);
          if (credits > 0) {
            const query = workspaceId
              ? supabaseAdmin.from("nia_credits").select("credits_remaining").eq("workspace_id", workspaceId).single()
              : supabaseAdmin.from("nia_credits").select("credits_remaining").eq("user_id", userId).single();

            const { data: existing } = await query;
            const currentCredits = (existing as any)?.credits_remaining ?? 0;
            const whereClause = workspaceId ? { workspace_id: workspaceId } : { user_id: userId };

            if (existing) {
              await supabaseAdmin
                .from("nia_credits")
                .update({ credits_remaining: currentCredits + credits })
                .match(whereClause);
            } else {
              await supabaseAdmin.from("nia_credits").insert({
                ...(workspaceId ? { workspace_id: workspaceId } : { user_id: userId }),
                credits_remaining: credits,
                credits_used: 0,
              });
            }
          }
        }

        if (priceKey === "nia_setup") {
          const upsertData: Record<string, unknown> = {
            credits_remaining: 100,
            credits_used: 0,
          };
          if (workspaceId) upsertData.workspace_id = workspaceId;
          else upsertData.user_id = userId;

          await supabaseAdmin.from("nia_credits").upsert(
            upsertData,
            { onConflict: workspaceId ? "workspace_id" : "user_id" }
          );
        }
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
