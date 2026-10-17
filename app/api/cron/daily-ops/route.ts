// app/api/cron/daily-ops/route.ts — COMPLETE REPLACEMENT
// Merges: original (Scout + Victor) + daily-ops-updated.ts (+ Kai + Zoe) + rex-agent-update.ts (+ Rex)
// Triggered daily by Vercel Cron (see vercel.json). No user is present —
// Vercel signs it with a bearer token matching CRON_SECRET.
// Each agent's reply gets appended to its normal conversation thread under
// workspace.owner_id so the CEO sees it in the standard chat UI.

import { NextRequest, NextResponse } from "next/server";
import { listAllWorkspaces } from "@/lib/supabase";
import { runAgentTurn } from "@/lib/agent-runtime";

const SCOUT_DAILY_PROMPT =
  "Run today's autonomous research pass. Find 2-3 new trending product candidates you haven't already saved (check scout_candidates_list first). Score and save each one. For any that meet the hot-product bar (total_score >= 8.0 AND trend_score >= 7), publish it live immediately using your standing authority. Everything else, save as a draft. Summarize what you found and what you did.";

const VICTOR_DAILY_PROMPT =
  "Run today's autonomous operations pass. First, use shopify_inventory_read with no product_id to check every active product's real stock level — any product showing 0 units is unpurchasable unless its inventory policy already allows selling at 0 stock. For any zero-stock product, set shopify_inventory_policy_set to 'continue' if it isn't already (this is routine dropshipping config, no approval needed), and separately set a real starting quantity (25) with shopify_inventory_update. Note both actions in your summary. Then check shopify_product_performance for products live 14+ days — archive any with genuinely zero sales using your standing authority, with a clear reason each time. Also check shopify_orders_list for any unfulfilled paid orders and flag them clearly in your summary (don't fulfill anything automatically — that still needs the CEO's confirmation). Summarize what you found and what you did.";

const KAI_DAILY_PROMPT =
  "Run today's outbound lead generation pass. Check crm_leads_list for any leads with status 'new' that haven't been contacted yet (no brevo email sent). For each one: (1) Send a personalised cold outreach email via brevo_email_send — reference their company and product interest. (2) Update their CRM status to 'contacted'. Then check for any 'contacted' leads that have gone 48+ hours without a reply — flag them in your summary so Nia can follow up with a Vapi call. Keep your email copy tight: one pain point, one value prop, one CTA. Summarize everything you did.";

const ZOE_DAILY_PROMPT =
  "Run today's lifecycle and community pass. Check crm_leads_list for customers with status 'closed_won' who haven't received a check-in email in 7+ days. Send each a personalised check-in via brevo_email_send — ask how things are going and if they need anything. Then check brevo_email_list for any recent replies you haven't responded to — reply to each one with brevo_email_reply. Finally, if there are 10+ closed_won customers, create a re-engagement campaign via brevo_campaign_create targeting the default list. Summarize everything you did.";

const REX_DAILY_PROMPT =
  "Run today's creative and ads pass. Check if there are any new Shopify products added in the last 48 hours using shopify_product_list. For each new product: (1) Research ad angles with ad_copy_research. (2) Check if a Higgsfield brand exists with higgsfield_brand_list — create one if not. (3) Add the product with higgsfield_product_add and wait for it to process. (4) Generate a TikTok video ad with higgsfield_video_generate using a high-energy UGC-style prompt. (5) Wait for the job with higgsfield_job_wait. (6) Publish to TikTok with tiktok_publish using a strong caption and 8-10 hashtags. If no new products, check reports_generate for the top-performing product and create a fresh video angle for it. Summarize what you created and where it was published.";

export async function POST(req: NextRequest) {
  return GET(req);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await listAllWorkspaces();
  const results: any[] = [];

  for (const workspace of workspaces) {
    // Skip workspaces with an obviously broken owner reference
    if (!workspace.owner_id || workspace.owner_id.startsWith("REPLACE_")) {
      results.push({ workspace: workspace.slug, skipped: true, reason: "invalid owner_id" });
      continue;
    }

    const entry: any = { workspace: workspace.slug };

    // ── 1. Scout: product research & publishing ──────────────────────────────
    try {
      const scoutResult = await runAgentTurn({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        agentSlug: "scout",
        userId: workspace.owner_id,
        message: SCOUT_DAILY_PROMPT,
        autonomous: true,
      });
      entry.scout = { ok: true, reply: scoutResult.reply.slice(0, 300) };
    } catch (err: any) {
      entry.scout = { ok: false, error: err.message };
    }

    // ── 2. Victor: operations, inventory, order flagging ─────────────────────
    try {
      const victorResult = await runAgentTurn({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        agentSlug: "coo",
        userId: workspace.owner_id,
        message: VICTOR_DAILY_PROMPT,
        autonomous: true,
      });
      entry.victor = { ok: true, reply: victorResult.reply.slice(0, 300) };
    } catch (err: any) {
      entry.victor = { ok: false, error: err.message };
    }

    // ── 3. Kai: outbound lead gen & follow-up flagging ───────────────────────
    try {
      const kaiResult = await runAgentTurn({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        agentSlug: "outbound",
        userId: workspace.owner_id,
        message: KAI_DAILY_PROMPT,
        autonomous: true,
      });
      entry.kai = { ok: true, reply: kaiResult.reply.slice(0, 300) };
    } catch (err: any) {
      entry.kai = { ok: false, error: err.message };
    }

    // ── 4. Zoe: lifecycle emails & community nurture ─────────────────────────
    try {
      const zoeResult = await runAgentTurn({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        agentSlug: "community",
        userId: workspace.owner_id,
        message: ZOE_DAILY_PROMPT,
        autonomous: true,
      });
      entry.zoe = { ok: true, reply: zoeResult.reply.slice(0, 300) };
    } catch (err: any) {
      entry.zoe = { ok: false, error: err.message };
    }

    // ── 5. Rex: Higgsfield video ads + TikTok publishing ─────────────────────
    try {
      const rexResult = await runAgentTurn({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        agentSlug: "ads",
        userId: workspace.owner_id,
        message: REX_DAILY_PROMPT,
        autonomous: true,
      });
      entry.rex = { ok: true, reply: rexResult.reply.slice(0, 300) };
    } catch (err: any) {
      entry.rex = { ok: false, error: err.message };
    }

    results.push(entry);
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    workspaceCount: workspaces.length,
    results,
  });
}