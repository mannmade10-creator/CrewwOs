// lib/lob.ts
//
// Lob.com direct-mail API wrapper for CrewwOS.
// Every function reads Lob credentials from the integrations table via
// getIntegrationCredentials() — never hardcoded keys.
//
// Supported piece types:
//   postcard_4x6 | postcard_6x9 | postcard_6x11
//   letter | self_mailer
//
// Call flow:
//   createPostcard / createLetter  →  inserts a mail_sends row + hits Lob API
//   sendCampaignBatch              →  resolves contacts + fires individual sends
//   handleLobWebhook               →  updates mail_sends.lob_status on delivery events

import { getIntegrationCredentials } from "./integrations";
import { supabaseAdmin } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LobAddress {
  name?: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country?: string;
}

export interface PostcardOptions {
  workspaceId: string;
  campaignId?: string;
  contactId?: string;
  to: LobAddress;
  /** Lob template ID OR raw HTML string for the front */
  frontTemplate: string;
  /** Lob template ID OR raw HTML string for the back */
  backTemplate?: string;
  size?: "4x6" | "6x9" | "6x11";
  mergeVariables?: Record<string, string>;
  sendDate?: string; // ISO date string; omit for immediate send
  description?: string;
}

export interface LetterOptions {
  workspaceId: string;
  campaignId?: string;
  contactId?: string;
  to: LobAddress;
  /** Lob template ID OR raw HTML string */
  template: string;
  color?: boolean;
  doubleSided?: boolean;
  mergeVariables?: Record<string, string>;
  sendDate?: string;
  description?: string;
}

export interface LobSendResult {
  lobId: string;
  lobObjectType: string;
  expectedDeliveryDate?: string;
  priceCents?: number;
  status: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function lobHeaders(workspaceId: string): Promise<HeadersInit> {
  const creds = await getIntegrationCredentials(workspaceId, "lob");
  const apiKey = creds.api_key as string;
  if (!apiKey) throw new Error("Lob api_key missing from integration credentials.");
  return {
    Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
    "Content-Type": "application/json",
  };
}

function isTemplateId(value: string): boolean {
  // Lob template IDs start with "tmpl_"
  return value.startsWith("tmpl_");
}

function resolveTemplateField(value: string): { template_id?: string; html?: string } {
  if (isTemplateId(value)) return { template_id: value };
  return { html: value };
}

async function recordSend(
  workspaceId: string,
  campaignId: string | undefined,
  contactId: string | undefined,
  result: LobSendResult,
  toAddress: LobAddress,
  error?: string
) {
  const supabase = supabaseAdmin();
  await supabase.from("mail_sends").insert({
    workspace_id: workspaceId,
    campaign_id: campaignId ?? null,
    contact_id: contactId ?? null,
    lob_id: result.lobId,
    lob_object_type: result.lobObjectType,
    lob_status: error ? "failed" : result.status,
    to_name: toAddress.name ?? toAddress.company ?? null,
    to_address: {
      line1: toAddress.address_line1,
      line2: toAddress.address_line2 ?? null,
      city: toAddress.address_city,
      state: toAddress.address_state,
      zip: toAddress.address_zip,
      country: toAddress.address_country ?? "US",
    },
    expected_delivery_date: result.expectedDeliveryDate ?? null,
    price_cents: result.priceCents ?? null,
    error_message: error ?? null,
  });

  // Bump campaign counter
  if (campaignId) {
    await supabase.rpc("increment_campaign_sent", { campaign_uuid: campaignId });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a single postcard via Lob.
 */
export async function createPostcard(opts: PostcardOptions): Promise<LobSendResult> {
  const headers = await lobHeaders(opts.workspaceId);

  const body: Record<string, unknown> = {
    description: opts.description ?? "CrewwOS Campaign",
    to: opts.to,
    from: {
      // Lob requires a return address; use the workspace's stored return address
      // or fall back to a generic CrewwOS address (clients should set this on connect)
      name: "CrewwOS Mailer",
      address_line1: "PO Box 1",
      address_city: "Oklahoma City",
      address_state: "OK",
      address_zip: "73101",
      address_country: "US",
    },
    size: opts.size ?? "4x6",
    ...resolveTemplateField(opts.frontTemplate),
    merge_variables: opts.mergeVariables ?? {},
  };

  if (opts.backTemplate) {
    const back = resolveTemplateField(opts.backTemplate);
    if (back.template_id) body.back = back.template_id;
    else if (back.html) body.back_html = back.html;
  }

  if (opts.sendDate) body.send_date = opts.sendDate;

  const res = await fetch("https://api.lob.com/v1/postcards", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Lob postcard error: ${data?.error?.message ?? res.statusText}`);
  }

  const result: LobSendResult = {
    lobId: data.id,
    lobObjectType: "postcard",
    expectedDeliveryDate: data.expected_delivery_date,
    priceCents: data.price ? Math.round(parseFloat(data.price) * 100) : undefined,
    status: data.status ?? "pending",
  };

  await recordSend(opts.workspaceId, opts.campaignId, opts.contactId, result, opts.to);
  return result;
}

/**
 * Send a single letter via Lob.
 */
export async function createLetter(opts: LetterOptions): Promise<LobSendResult> {
  const headers = await lobHeaders(opts.workspaceId);

  const body: Record<string, unknown> = {
    description: opts.description ?? "CrewwOS Letter",
    to: opts.to,
    from: {
      name: "CrewwOS Mailer",
      address_line1: "PO Box 1",
      address_city: "Oklahoma City",
      address_state: "OK",
      address_zip: "73101",
      address_country: "US",
    },
    color: opts.color ?? false,
    double_sided: opts.doubleSided ?? true,
    merge_variables: opts.mergeVariables ?? {},
    ...resolveTemplateField(opts.template),
  };

  if (opts.sendDate) body.send_date = opts.sendDate;

  const res = await fetch("https://api.lob.com/v1/letters", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Lob letter error: ${data?.error?.message ?? res.statusText}`);
  }

  const result: LobSendResult = {
    lobId: data.id,
    lobObjectType: "letter",
    expectedDeliveryDate: data.expected_delivery_date,
    priceCents: data.price ? Math.round(parseFloat(data.price) * 100) : undefined,
    status: data.status ?? "pending",
  };

  await recordSend(opts.workspaceId, opts.campaignId, opts.contactId, result, opts.to);
  return result;
}

/**
 * Validate a US address using Lob's address verification API.
 * Returns the verified address or null if undeliverable.
 */
export async function verifyAddress(
  workspaceId: string,
  address: LobAddress
): Promise<LobAddress | null> {
  const headers = await lobHeaders(workspaceId);

  const res = await fetch("https://api.lob.com/v1/us_verifications", {
    method: "POST",
    headers,
    body: JSON.stringify({
      primary_line: address.address_line1,
      secondary_line: address.address_line2 ?? "",
      city: address.address_city,
      state: address.address_state,
      zip_code: address.address_zip,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.deliverability === "undeliverable") return null;

  return {
    ...address,
    address_line1: data.primary_line ?? address.address_line1,
    address_line2: data.secondary_line ?? address.address_line2,
    address_city: data.components?.city ?? address.address_city,
    address_state: data.components?.state ?? address.address_state,
    address_zip: data.components?.zip_code ?? address.address_zip,
  };
}

/**
 * Fire a full campaign batch: resolves contacts matching the campaign's
 * target_tags/target_filter, sends one piece per contact.
 * Safe to call from a cron job or agent tool.
 */
export async function sendCampaignBatch(campaignId: string): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = supabaseAdmin();

  // Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from("mail_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campErr || !campaign) throw new Error(`Campaign ${campaignId} not found`);
  if (campaign.status === "completed" || campaign.status === "paused") {
    return { sent: 0, skipped: 0, errors: ["Campaign is not active"] };
  }

  // Resolve contacts
  let query = supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", campaign.workspace_id)
    .eq("mail_opt_out", false)
    .not("address_line1", "is", null)
    .not("city", "is", null)
    .not("state", "is", null)
    .not("zip", "is", null);

  if (campaign.vertical !== "all") {
    query = query.eq("vertical", campaign.vertical);
  }

  if (campaign.target_tags?.length > 0) {
    query = query.overlaps("tags", campaign.target_tags);
  }

  const { data: contacts } = await query;
  if (!contacts?.length) return { sent: 0, skipped: 0, errors: ["No eligible contacts found"] };

  // Find contacts already sent this campaign
  const { data: alreadySent } = await supabase
    .from("mail_sends")
    .select("contact_id")
    .eq("campaign_id", campaignId)
    .neq("lob_status", "failed");

  const sentContactIds = new Set((alreadySent ?? []).map((r: { contact_id: string }) => r.contact_id));

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    if (sentContactIds.has(contact.id)) { skipped++; continue; }

    const to: LobAddress = {
      name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company_name || "Valued Customer",
      company: contact.company_name ?? undefined,
      address_line1: contact.address_line1,
      address_line2: contact.address_line2 ?? undefined,
      address_city: contact.city,
      address_state: contact.state,
      address_zip: contact.zip,
      address_country: contact.country ?? "US",
    };

    const mergeVars: Record<string, string> = {
      first_name: contact.first_name ?? "Friend",
      last_name: contact.last_name ?? "",
      company: contact.company_name ?? "",
      city: contact.city ?? "",
      ...Object.fromEntries(
        Object.entries(contact.meta ?? {}).map(([k, v]) => [k, String(v)])
      ),
    };

    try {
      const isPostcard = campaign.mail_type?.startsWith("postcard");
      if (isPostcard) {
        await createPostcard({
          workspaceId: campaign.workspace_id,
          campaignId: campaign.id,
          contactId: contact.id,
          to,
          frontTemplate: campaign.lob_template_id ?? buildDefaultFront(campaign),
          size: (campaign.mail_type?.replace("postcard_", "") as "4x6" | "6x9" | "6x11") ?? "4x6",
          mergeVariables: mergeVars,
          description: campaign.name,
        });
      } else {
        await createLetter({
          workspaceId: campaign.workspace_id,
          campaignId: campaign.id,
          contactId: contact.id,
          to,
          template: campaign.lob_template_id ?? buildDefaultLetterHTML(campaign),
          mergeVariables: mergeVars,
          description: campaign.name,
        });
      }
      sent++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Contact ${contact.id}: ${message}`);
    }
  }

  // Mark campaign completed if all done
  if (campaign.send_mode === "scheduled") {
    await supabase
      .from("mail_campaigns")
      .update({ status: "completed" })
      .eq("id", campaignId);
  }

  return { sent, skipped, errors };
}

/**
 * Handle Lob delivery webhooks — update mail_sends row status.
 * Mount this at /api/webhooks/lob and verify Lob-Signature header.
 */
export async function handleLobWebhook(event: {
  id: string;
  event_type: { id: string };
  body: { id: string; status?: string; expected_delivery_date?: string };
}): Promise<void> {
  const supabase = supabaseAdmin();
  const lobId = event.body?.id;
  const eventType = event.event_type?.id; // e.g. "postcard.in_transit"

  if (!lobId) return;

  const statusMap: Record<string, string> = {
    "postcard.created":                  "pending",
    "postcard.rendered_pdf":             "pending",
    "postcard.rendered_thumbnails":      "pending",
    "postcard.deleted":                  "failed",
    "postcard.mailed":                   "in_transit",
    "postcard.in_transit":               "in_transit",
    "postcard.in_local_area":            "in_local_area",
    "postcard.processed_for_delivery":   "processed_for_delivery",
    "postcard.re-routed":                "re-routed",
    "postcard.returned_to_sender":       "returned",
    "letter.created":                    "pending",
    "letter.mailed":                     "in_transit",
    "letter.in_transit":                 "in_transit",
    "letter.in_local_area":              "in_local_area",
    "letter.processed_for_delivery":     "processed_for_delivery",
    "letter.re-routed":                  "re-routed",
    "letter.returned_to_sender":         "returned",
  };

  const newStatus = statusMap[eventType] ?? "pending";
  const update: Record<string, unknown> = { lob_status: newStatus };

  if (newStatus === "processed_for_delivery" || eventType?.includes("delivered")) {
    update.delivered_at = new Date().toISOString();
    // Bump delivered counter on campaign
    const { data: send } = await supabase
      .from("mail_sends")
      .select("campaign_id")
      .eq("lob_id", lobId)
      .single();
    if (send?.campaign_id) {
      await supabase.rpc("increment_campaign_delivered", { campaign_uuid: send.campaign_id });
    }
  }
  if (newStatus === "returned") {
    update.returned_at = new Date().toISOString();
  }

  await supabase.from("mail_sends").update(update).eq("lob_id", lobId);
}

// ─── Default HTML templates (used when no Lob template ID is set) ────────────

function buildDefaultFront(campaign: {
  subject_line?: string | null;
  body_copy?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; }
  .wrap { padding: 40px; }
  h1 { font-size: 28px; color: #e0c068; margin: 0 0 16px; }
  p  { font-size: 14px; line-height: 1.6; color: #ccc; }
  .cta { display:inline-block; margin-top:20px; padding:12px 28px;
         background:#e0c068; color:#1a1a2e; font-weight:bold;
         border-radius:4px; text-decoration:none; font-size:15px; }
</style></head><body><div class="wrap">
  <h1>{{subject_line}}</h1>
  <p>{{body_copy}}</p>
  ${campaign.cta_text ? `<a class="cta" href="{{cta_url}}">{{cta_text}}</a>` : ""}
</div></body></html>`;
}

function buildDefaultLetterHTML(campaign: {
  subject_line?: string | null;
  body_copy?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; color: #222; padding: 60px; }
  h1 { font-size: 22px; margin-bottom: 24px; }
  p  { font-size: 13px; line-height: 1.8; margin-bottom: 16px; }
  .cta { font-weight: bold; color: #4a90d9; }
</style></head><body>
  <p>Dear {{first_name}},</p>
  <h1>{{subject_line}}</h1>
  <p>{{body_copy}}</p>
  ${campaign.cta_text ? `<p class="cta">{{cta_text}}: {{cta_url}}</p>` : ""}
  <p>Sincerely,<br/>The CrewwOS Team</p>
</body></html>`;
}
