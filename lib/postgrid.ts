/**
 * lib/postgrid.ts
 * PostGrid direct mail integration for CrewwOS
 * Replaces lib/lob.ts — all direct mail goes through PostGrid
 *
 * Env vars required:
 *   POSTGRID_LIVE_KEY   — live API key from PostGrid dashboard
 *   POSTGRID_TEST_KEY   — test API key from PostGrid dashboard
 *   POSTGRID_MODE       — "test" | "live"  (default: "test")
 */

import { supabaseAdmin } from "./supabase-admin";

const POSTGRID_BASE = "https://api.postgrid.com/print-mail/v1";

function getApiKey(): string {
  const mode = process.env.POSTGRID_MODE ?? "test";
  const key =
    mode === "live"
      ? process.env.POSTGRID_LIVE_KEY
      : process.env.POSTGRID_TEST_KEY;
  if (!key) {
    throw new Error(
      `PostGrid API key not set for mode "${mode}". ` +
        `Check POSTGRID_LIVE_KEY / POSTGRID_TEST_KEY in your env.`
    );
  }
  return key;
}

async function pgFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${POSTGRID_BASE}${path}`, {
    ...options,
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PostGrid ${options.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MailAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  provinceOrState: string;
  postalOrZip: string;
  country?: string; // default "US"
}

export interface PostcardOptions {
  to: MailAddress;
  from: MailAddress;
  /** 4x6 | 6x9 | 6x11 */
  size?: "4x6" | "6x9" | "6x11";
  /** HTML string for the front of the card */
  frontHTML: string;
  /** HTML string for the back of the card */
  backHTML: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface LetterOptions {
  to: MailAddress;
  from: MailAddress;
  /** HTML string for the letter body */
  html: string;
  color?: boolean;
  doubleSided?: boolean;
  description?: string;
  metadata?: Record<string, string>;
}

export interface VerifyAddressResult {
  status: "verified" | "corrected" | "failed";
  line1: string;
  line2?: string;
  city: string;
  provinceOrState: string;
  postalOrZip: string;
  country: string;
}

export interface CampaignContact {
  contactId: string;
  to: MailAddress;
}

export interface CampaignBatchOptions {
  workspaceId: string;
  campaignId: string;
  contacts: CampaignContact[];
  from: MailAddress;
  type: "postcard" | "letter";
  frontHTML?: string;
  backHTML?: string;
  html?: string;
  size?: "4x6" | "6x9" | "6x11";
  description?: string;
}

// ─── Address Verification ─────────────────────────────────────────────────────

export async function verifyAddress(
  address: MailAddress
): Promise<VerifyAddressResult> {
  const data = await pgFetch<{
    status: string;
    data: {
      line1: string;
      line2?: string;
      city: string;
      provinceOrState: string;
      postalOrZip: string;
      country: string;
    };
  }>("/addverify", {
    method: "POST",
    body: JSON.stringify({
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      provinceOrState: address.provinceOrState,
      postalOrZip: address.postalOrZip,
      country: address.country ?? "US",
    }),
  });

  return {
    status: data.status as VerifyAddressResult["status"],
    ...data.data,
  };
}

// ─── Postcard ─────────────────────────────────────────────────────────────────

export async function createPostcard(options: PostcardOptions): Promise<string> {
  const payload = {
    to: {
      firstName: options.to.name.split(" ")[0],
      lastName: options.to.name.split(" ").slice(1).join(" ") || "-",
      addressLine1: options.to.line1,
      addressLine2: options.to.line2,
      city: options.to.city,
      provinceOrState: options.to.provinceOrState,
      postalOrZip: options.to.postalOrZip,
      country: options.to.country ?? "US",
    },
    from: {
      firstName: options.from.name.split(" ")[0],
      lastName: options.from.name.split(" ").slice(1).join(" ") || "-",
      addressLine1: options.from.line1,
      addressLine2: options.from.line2,
      city: options.from.city,
      provinceOrState: options.from.provinceOrState,
      postalOrZip: options.from.postalOrZip,
      country: options.from.country ?? "US",
    },
    size: options.size ?? "6x9",
    frontHTML: options.frontHTML,
    backHTML: options.backHTML,
    description: options.description,
    metadata: options.metadata,
  };

  const result = await pgFetch<{ id: string }>("/postcards", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result.id;
}

// ─── Letter ───────────────────────────────────────────────────────────────────

export async function createLetter(options: LetterOptions): Promise<string> {
  const payload = {
    to: {
      firstName: options.to.name.split(" ")[0],
      lastName: options.to.name.split(" ").slice(1).join(" ") || "-",
      addressLine1: options.to.line1,
      addressLine2: options.to.line2,
      city: options.to.city,
      provinceOrState: options.to.provinceOrState,
      postalOrZip: options.to.postalOrZip,
      country: options.to.country ?? "US",
    },
    from: {
      firstName: options.from.name.split(" ")[0],
      lastName: options.from.name.split(" ").slice(1).join(" ") || "-",
      addressLine1: options.from.line1,
      addressLine2: options.from.line2,
      city: options.from.city,
      provinceOrState: options.from.provinceOrState,
      postalOrZip: options.from.postalOrZip,
      country: options.from.country ?? "US",
    },
    html: options.html,
    color: options.color ?? false,
    doubleSided: options.doubleSided ?? false,
    description: options.description,
    metadata: options.metadata,
  };

  const result = await pgFetch<{ id: string }>("/letters", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result.id;
}

// ─── Campaign Batch ───────────────────────────────────────────────────────────

export async function sendCampaignBatch(
  options: CampaignBatchOptions
): Promise<void> {
  const supabase = supabaseAdmin();
  const results: Array<{
    contactId: string;
    mailId: string | null;
    status: string;
    error?: string;
  }> = [];

  for (const contact of options.contacts) {
    try {
      let mailId: string;

      if (options.type === "postcard") {
        mailId = await createPostcard({
          to: contact.to,
          from: options.from,
          size: options.size,
          frontHTML: options.frontHTML!,
          backHTML: options.backHTML!,
          description: options.description,
          metadata: {
            workspaceId: options.workspaceId,
            campaignId: options.campaignId,
            contactId: contact.contactId,
          },
        });
      } else {
        mailId = await createLetter({
          to: contact.to,
          from: options.from,
          html: options.html!,
          description: options.description,
          metadata: {
            workspaceId: options.workspaceId,
            campaignId: options.campaignId,
            contactId: contact.contactId,
          },
        });
      }

      results.push({ contactId: contact.contactId, mailId, status: "sent" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        contactId: contact.contactId,
        mailId: null,
        status: "error",
        error: message,
      });
    }
  }

  // Record all sends in mail_sends table
  if (results.length > 0) {
    await supabase.from("mail_sends").insert(
      results.map((r) => ({
        workspace_id: options.workspaceId,
        campaign_id: options.campaignId,
        contact_id: r.contactId,
        provider: "postgrid",
        provider_mail_id: r.mailId,
        mail_type: options.type,
        status: r.status,
        error: r.error ?? null,
        sent_at: new Date().toISOString(),
      }))
    );
  }
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export interface PostGridWebhookEvent {
  id: string;
  type: string; // e.g. "postcard.created", "letter.mailed", "postcard.returned"
  data: {
    object: {
      id: string;
      status: string;
      metadata?: Record<string, string>;
    };
  };
}

export async function handlePostGridWebhook(
  event: PostGridWebhookEvent
): Promise<void> {
  const supabase = supabaseAdmin();
  const mailId = event.data?.object?.id;
  const status = event.data?.object?.status ?? event.type;

  if (!mailId) return;

  await supabase
    .from("mail_sends")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("provider_mail_id", mailId)
    .eq("provider", "postgrid");
}