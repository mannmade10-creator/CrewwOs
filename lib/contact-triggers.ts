// lib/contact-triggers.ts
//
// When a new contact lands in any vertical, this module fires every active
// mail_campaign whose trigger_event matches the event type and whose
// trigger_delay_days = 0 (or schedules it for later).
//
// Supported trigger events:
//   'new_contact'        — fires on any new contact add (welcome mailers, fan kits, etc.)
//   'service_due'        — fires when meta.last_service_date is 90+ days ago (Trades)
//   'listing_active'     — fires when a new MLS listing is added (Real Estate)
//   'release_date'       — fires when meta.release_date is approaching (Artist)
//   'order_placed'       — fires on new e-commerce order (E-Commerce)
//   'reservation_made'   — fires when a restaurant reservation is added (Restaurant)

import { supabaseAdmin } from "./supabase";
import { sendCampaignBatch } from "./lob";

/**
 * Called after a contact is created or updated.
 * Finds all active trigger-based campaigns for this workspace and fires them.
 */
export async function fireContactTriggers(
  workspaceId: string,
  contactId: string,
  eventType: string
): Promise<void> {
  const supabase = supabaseAdmin();

  // Load the contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact) return;

  // Find matching trigger campaigns
  const { data: campaigns } = await supabase
    .from("mail_campaigns")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("send_mode", "trigger")
    .eq("trigger_event", eventType)
    .eq("status", "active");

  if (!campaigns?.length) return;

  for (const campaign of campaigns) {
    // Vertical filter: skip if campaign targets a different vertical
    if (campaign.vertical !== "all" && campaign.vertical !== contact.vertical) continue;

    // Tag filter: skip if campaign has tags and contact doesn't match
    if (campaign.target_tags?.length > 0) {
      const hasTag = campaign.target_tags.some((t: string) => contact.tags?.includes(t));
      if (!hasTag) continue;
    }

    // Check: already sent to this contact for this campaign?
    const { data: existing } = await supabase
      .from("mail_sends")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("contact_id", contactId)
      .neq("lob_status", "failed")
      .maybeSingle();

    if (existing) continue;

    const delayDays = campaign.trigger_delay_days ?? 0;

    if (delayDays === 0) {
      // Fire immediately — sendCampaignBatch scoped to single contact
      // We do this by inserting a temporary "single-contact" batch
      await fireSingleContactCampaign(workspaceId, campaign, contact);
    } else {
      // Schedule: store a pending send record with a future send_date
      const sendDate = new Date();
      sendDate.setDate(sendDate.getDate() + delayDays);

      await supabase.from("mail_sends").insert({
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        contact_id: contactId,
        lob_status: "scheduled",
        to_name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company_name,
        to_address: {
          line1: contact.address_line1,
          city: contact.city,
          state: contact.state,
          zip: contact.zip,
          country: contact.country ?? "US",
        },
        // Cron job picks these up daily
        expected_delivery_date: sendDate.toISOString().split("T")[0],
      });
    }
  }
}

/**
 * Fires a single-contact send for a given campaign.
 * Used internally by fireContactTriggers when delay = 0.
 */
async function fireSingleContactCampaign(
  workspaceId: string,
  campaign: Record<string, unknown>,
  contact: Record<string, unknown>
): Promise<void> {
  const { createPostcard, createLetter } = await import("./lob");

  const to = {
    name: [contact.first_name as string, contact.last_name as string].filter(Boolean).join(" ") || (contact.company_name as string) || "Valued Customer",
    company: (contact.company_name as string) ?? undefined,
    address_line1: contact.address_line1 as string,
    address_line2: (contact.address_line2 as string) ?? undefined,
    address_city: contact.city as string,
    address_state: contact.state as string,
    address_zip: contact.zip as string,
    address_country: (contact.country as string) ?? "US",
  };

  const mergeVariables: Record<string, string> = {
    first_name: (contact.first_name as string) ?? "Friend",
    last_name: (contact.last_name as string) ?? "",
    company: (contact.company_name as string) ?? "",
    city: (contact.city as string) ?? "",
    ...Object.fromEntries(
      Object.entries((contact.meta as Record<string, unknown>) ?? {}).map(([k, v]) => [k, String(v)])
    ),
  };

  const isPostcard = (campaign.mail_type as string)?.startsWith("postcard");
  const mailType = (campaign.mail_type as string) ?? "postcard_4x6";

  if (isPostcard) {
    await createPostcard({
      workspaceId,
      campaignId: campaign.id as string,
      contactId: contact.id as string,
      to,
      frontTemplate: (campaign.lob_template_id as string) ?? buildFallbackFront(campaign),
      size: (mailType.replace("postcard_", "") as "4x6" | "6x9" | "6x11") ?? "4x6",
      mergeVariables,
      description: campaign.name as string,
    });
  } else {
    await createLetter({
      workspaceId,
      campaignId: campaign.id as string,
      contactId: contact.id as string,
      to,
      template: (campaign.lob_template_id as string) ?? buildFallbackLetter(campaign),
      mergeVariables,
      description: campaign.name as string,
    });
  }
}

function buildFallbackFront(campaign: Record<string, unknown>): string {
  const subject = (campaign.subject_line as string) ?? "Hello from CrewwOS";
  const body = (campaign.body_copy as string) ?? "";
  const cta = (campaign.cta_text as string) ?? "";
  const ctaUrl = (campaign.cta_url as string) ?? "#";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{margin:0;font-family:Arial,sans-serif;background:#0f172a;color:#fff}
  .w{padding:36px}
  h1{font-size:26px;color:#fbbf24;margin:0 0 14px}
  p{font-size:13px;line-height:1.6;color:#cbd5e1}
  .cta{display:inline-block;margin-top:18px;padding:10px 24px;
       background:#fbbf24;color:#0f172a;font-weight:bold;
       border-radius:4px;text-decoration:none;font-size:14px}
</style></head><body><div class="w">
  <h1>${subject}</h1><p>${body}</p>
  ${cta ? `<a class="cta" href="${ctaUrl}">${cta}</a>` : ""}
</div></body></html>`;
}

function buildFallbackLetter(campaign: Record<string, unknown>): string {
  const subject = (campaign.subject_line as string) ?? "Hello from CrewwOS";
  const body = (campaign.body_copy as string) ?? "";
  const cta = (campaign.cta_text as string) ?? "";
  const ctaUrl = (campaign.cta_url as string) ?? "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;color:#1e293b;padding:60px}
h1{font-size:20px;margin-bottom:20px}
p{font-size:13px;line-height:1.8;margin-bottom:14px}</style></head><body>
  <p>Dear {{first_name}},</p>
  <h1>${subject}</h1>
  <p>${body}</p>
  ${cta ? `<p><strong>${cta}:</strong> ${ctaUrl}</p>` : ""}
  <p>Sincerely,<br/>The CrewwOS Team</p>
</body></html>`;
}

/**
 * Daily cron: process all scheduled sends whose send date has arrived.
 * Call this from /api/cron/mail-sends
 */
export async function processScheduledSends(): Promise<{ processed: number; errors: string[] }> {
  const supabase = supabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  const { data: scheduled } = await supabase
    .from("mail_sends")
    .select("*, mail_campaigns(*), contacts(*)")
    .eq("lob_status", "scheduled")
    .lte("expected_delivery_date", today);

  if (!scheduled?.length) return { processed: 0, errors: [] };

  let processed = 0;
  const errors: string[] = [];

  for (const send of scheduled) {
    if (!send.contact_id || !send.campaign_id) continue;
    try {
      await fireSingleContactCampaign(
        send.workspace_id,
        send.mail_campaigns,
        send.contacts
      );
      // Remove the placeholder scheduled row (real row created by createPostcard/Letter)
      await supabase.from("mail_sends").delete().eq("id", send.id);
      processed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`send ${send.id}: ${msg}`);
      await supabase.from("mail_sends").update({ error_message: msg }).eq("id", send.id);
    }
  }

  return { processed, errors };
}
