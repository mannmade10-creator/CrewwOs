/**
 * lib/contact-triggers.ts
 * Fires direct mail sends based on contact lifecycle events.
 * Uses PostGrid (replaces Lob).
 */

import { supabaseAdmin } from "./supabase-admin";
import { sendCampaignBatch, MailAddress } from "./postgrid";

export type ContactTriggerEvent =
  | "new_contact"
  | "service_due"
  | "listing_active"
  | "release_date"
  | "order_placed"
  | "reservation_made";

interface TriggerCampaign {
  id: string;
  workspace_id: string;
  trigger_event: ContactTriggerEvent;
  delay_days: number;
  mail_type: "postcard" | "letter";
  front_html: string | null;
  back_html: string | null;
  letter_html: string | null;
  mail_size: "4x6" | "6x9" | "6x11" | null;
  from_name: string;
  from_line1: string;
  from_line2: string | null;
  from_city: string;
  from_state: string;
  from_zip: string;
  description: string | null;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

// ─── Fire Triggers on Contact Event ──────────────────────────────────────────

export async function fireContactTriggers(
  workspaceId: string,
  contactId: string,
  eventType: ContactTriggerEvent
): Promise<void> {
  const supabase = supabaseAdmin();

  // Find active trigger campaigns for this workspace + event
  const { data: campaigns, error } = await supabase
    .from("trigger_campaigns")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("trigger_event", eventType)
    .eq("active", true);

  if (error || !campaigns || campaigns.length === 0) return;

  // Load the contact's address
  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, address_line1, address_line2, city, state, zip, country"
    )
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!contact || !contact.address_line1 || !contact.city || !contact.state || !contact.zip) {
    console.warn(
      `[Triggers] Contact ${contactId} missing address — skipping mail triggers`
    );
    return;
  }

  const toAddress: MailAddress = {
    name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Valued Customer",
    line1: contact.address_line1,
    line2: contact.address_line2 ?? undefined,
    city: contact.city,
    provinceOrState: contact.state,
    postalOrZip: contact.zip,
    country: contact.country ?? "US",
  };

  for (const campaign of campaigns as TriggerCampaign[]) {
    const fromAddress: MailAddress = {
      name: campaign.from_name,
      line1: campaign.from_line1,
      line2: campaign.from_line2 ?? undefined,
      city: campaign.from_city,
      provinceOrState: campaign.from_state,
      postalOrZip: campaign.from_zip,
      country: "US",
    };

    if (campaign.delay_days === 0) {
      // Send immediately
      await sendCampaignBatch({
        workspaceId,
        campaignId: campaign.id,
        contacts: [{ contactId, to: toAddress }],
        from: fromAddress,
        type: campaign.mail_type,
        frontHTML: campaign.front_html ?? undefined,
        backHTML: campaign.back_html ?? undefined,
        html: campaign.letter_html ?? undefined,
        size: campaign.mail_size ?? "6x9",
        description: campaign.description ?? undefined,
      });
    } else {
      // Schedule for later — insert into mail_sends with scheduled_for
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + campaign.delay_days);

      await supabase.from("mail_sends").insert({
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        contact_id: contactId,
        provider: "postgrid",
        mail_type: campaign.mail_type,
        status: "scheduled",
        scheduled_for: scheduledFor.toISOString(),
        sent_at: null,
      });
    }
  }
}

// ─── Process Scheduled Sends (called by cron) ─────────────────────────────────

export async function processScheduledSends(): Promise<void> {
  const supabase = supabaseAdmin();

  // Find all scheduled sends that are due
  const { data: pending, error } = await supabase
    .from("mail_sends")
    .select(`
      id,
      workspace_id,
      campaign_id,
      contact_id,
      mail_type,
      scheduled_for
    `)
    .eq("status", "scheduled")
    .eq("provider", "postgrid")
    .lte("scheduled_for", new Date().toISOString());

  if (error || !pending || pending.length === 0) return;

  for (const send of pending) {
    // Load campaign details
    const { data: campaign } = await supabase
      .from("trigger_campaigns")
      .select("*")
      .eq("id", send.campaign_id)
      .single();

    if (!campaign) continue;

    // Load contact address
    const { data: contact } = await supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, address_line1, address_line2, city, state, zip, country"
      )
      .eq("id", send.contact_id)
      .eq("workspace_id", send.workspace_id)
      .single();

    if (
      !contact ||
      !contact.address_line1 ||
      !contact.city ||
      !contact.state ||
      !contact.zip
    ) {
      await supabase
        .from("mail_sends")
        .update({ status: "error", error: "Missing contact address" })
        .eq("id", send.id);
      continue;
    }

    const toAddress: MailAddress = {
      name:
        [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
        "Valued Customer",
      line1: contact.address_line1,
      line2: contact.address_line2 ?? undefined,
      city: contact.city,
      provinceOrState: contact.state,
      postalOrZip: contact.zip,
      country: contact.country ?? "US",
    };

    const fromAddress: MailAddress = {
      name: campaign.from_name,
      line1: campaign.from_line1,
      line2: campaign.from_line2 ?? undefined,
      city: campaign.from_city,
      provinceOrState: campaign.from_state,
      postalOrZip: campaign.from_zip,
      country: "US",
    };

    try {
      await sendCampaignBatch({
        workspaceId: send.workspace_id,
        campaignId: send.campaign_id,
        contacts: [{ contactId: send.contact_id, to: toAddress }],
        from: fromAddress,
        type: send.mail_type,
        frontHTML: campaign.front_html ?? undefined,
        backHTML: campaign.back_html ?? undefined,
        html: campaign.letter_html ?? undefined,
        size: campaign.mail_size ?? "6x9",
        description: campaign.description ?? undefined,
      });

      // Mark original scheduled row as superseded (the batch inserts a new sent row)
      await supabase
        .from("mail_sends")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", send.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("mail_sends")
        .update({ status: "error", error: message })
        .eq("id", send.id);
    }
  }
}