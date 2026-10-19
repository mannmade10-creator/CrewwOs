// app/api/integrations/connect/route.ts
// POST { workspaceSlug, provider, credentials }
//
// Credentials arrive as plaintext exactly once, in this request body, from
// the Integrations page form. They are encrypted before the first database
// write and never logged, never echoed back, and never stored anywhere
// else (no analytics, no error-tracking breadcrumbs — be careful adding
// Sentry/logging middleware in front of this route).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { setIntegrationCredentials, setAllowedTables, listIntegrations } from "@/lib/integrations";
import { integrationLimitForPlan } from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

const KNOWN_PROVIDERS = [
  "supabase", "vercel", "resend", "twilio", "apollo",
  "replyio", "ghl", "retell", "github", "stripe",
  "serpapi", "cjdropshipping", "shopify", "tiktok", "meta", "google_ads",
  // Outbound marketing + scheduling
  "brevo", "vapi", "google_calendar",
  // Direct mail
  "lob",
];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`integrations-connect:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    await logAuditEvent({ req, actorId: userId, action: "auth.rate_limited", target: "integrations.connect" });
    return NextResponse.json({ error: "Too many attempts — slow down a bit." }, { status: 429 });
  }

  const { workspaceSlug, provider, credentials, allowedTables } = await req.json();

  if (!KNOWN_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  }
  if (!credentials || typeof credentials !== "object" || Object.keys(credentials).length === 0) {
    return NextResponse.json({ error: "credentials object is required" }, { status: 400 });
  }
  // Supabase is the only provider db_query/db_write can reach, and it's
  // the one connection with direct access to arbitrary tables — require an
  // explicit, non-empty allowlist before it can be connected at all, so
  // there's never a moment where it's live with unrestricted table access.
  if (provider === "supabase" && (!Array.isArray(allowedTables) || allowedTables.filter((t: string) => t?.trim()).length === 0)) {
    return NextResponse.json({ error: "List at least one table agents are allowed to query before connecting Supabase." }, { status: 400 });
  }

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const limit = integrationLimitForPlan(workspace.plan);
  if (limit != null) {
    const existing = await listIntegrations(workspace.id);
    const alreadyConnected = existing.filter(i => i.is_connected);
    const isNewConnection = !alreadyConnected.some(i => i.provider === provider);
    if (isNewConnection && alreadyConnected.length >= limit) {
      await logAuditEvent({
        req, workspaceId: workspace.id, actorId: userId, action: "auth.access_denied",
        target: provider, metadata: { reason: "integration_limit", plan: workspace.plan, limit },
      });
      return NextResponse.json({
        error: `The ${workspace.plan} plan includes ${limit} integration${limit === 1 ? "" : "s"} — you're already using ${alreadyConnected.length}. Disconnect one first, or upgrade in Settings.`,
        limitReached: true,
      }, { status: 403 });
    }
  }

  try {
    await setIntegrationCredentials(workspace.id, provider, credentials);
    if (provider === "supabase") {
      await setAllowedTables(workspace.id, provider, allowedTables);
    }
    await logAuditEvent({
      req, workspaceId: workspace.id, actorId: userId, action: "integration.connect", target: provider,
      metadata: provider === "supabase" ? { allowed_tables: allowedTables } : undefined,
    });
    // Deliberately do not echo `credentials` back in the response.
    return NextResponse.json({ provider, connected: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}