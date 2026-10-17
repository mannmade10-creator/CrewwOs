// lib/integration-fields.ts — COMPLETE REPLACEMENT
// Merges: original 16 providers + brevo + vapi + google_calendar (from integration-fields-additions.ts)
//         + github expanded + vercel expanded + lob (from app-builder-agents-update.ts)
// All entries normalized to the PROVIDERS array format:
//   { id, name, desc, usedBy, fields: [{ key, label, placeholder, secret? }] }

export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  desc: string;
  usedBy: string[];
  fields: FieldDef[];
}

export const PROVIDERS: Provider[] = [
  // ── Original 16 providers ──────────────────────────────────────────────────

  {
    id: "supabase",
    name: "Supabase",
    desc: "Your project's Postgres database. Used by every agent for db_query and internal data storage.",
    usedBy: ["scout", "coo", "ads", "cmo", "sdr", "vpsales", "outbound", "cx", "community", "pm", "qa", "dev", "devops"],
    fields: [
      { key: "url", label: "Project URL", placeholder: "https://xxxx.supabase.co" },
      { key: "service_role_key", label: "Service Role Key", placeholder: "eyJh...", secret: true },
    ],
  },

  {
    id: "vercel",
    name: "Vercel",
    desc: "Deploy and manage Next.js apps. Required for the App Builder — Sam uses this to deploy client apps.",
    usedBy: ["devops", "dev"],
    fields: [
      { key: "token", label: "API Token", placeholder: "vT...", secret: true },
      { key: "team_id", label: "Team ID", placeholder: "team_xxxx (leave blank for personal account)" },
    ],
  },

  {
    id: "resend",
    name: "Resend",
    desc: "Transactional email via Resend. Used for system emails and notifications.",
    usedBy: ["cx", "community"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "re_...", secret: true },
      { key: "from_email", label: "From Email", placeholder: "hello@yourcompany.com" },
    ],
  },

  {
    id: "twilio",
    name: "Twilio",
    desc: "SMS and phone number management. Used for text message alerts and 2FA.",
    usedBy: ["sdr", "cx"],
    fields: [
      { key: "account_sid", label: "Account SID", placeholder: "ACxxxx" },
      { key: "auth_token", label: "Auth Token", placeholder: "xxxx", secret: true },
      { key: "phone_number", label: "Twilio Phone Number", placeholder: "+14155551234" },
    ],
  },

  {
    id: "apollo",
    name: "Apollo.io",
    desc: "B2B lead database. Used by Kai to find and enrich prospects for outbound campaigns.",
    usedBy: ["outbound", "vpsales"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "xxxx", secret: true },
    ],
  },

  {
    id: "replyio",
    name: "Reply.io",
    desc: "Cold email sequencing and outreach automation.",
    usedBy: ["outbound"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "xxxx", secret: true },
    ],
  },

  {
    id: "ghl",
    name: "GoHighLevel",
    desc: "CRM and marketing automation platform.",
    usedBy: ["sdr", "vpsales", "cmo"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "xxxx", secret: true },
      { key: "location_id", label: "Location ID", placeholder: "xxxx" },
    ],
  },

  {
    id: "retell",
    name: "Retell AI",
    desc: "AI voice calls. Used for inbound and outbound phone conversations.",
    usedBy: ["sdr"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "xxxx", secret: true },
      { key: "agent_id", label: "Agent ID", placeholder: "agent_xxxx" },
    ],
  },

  {
    id: "github",
    name: "GitHub",
    desc: "Code repository hosting. Required for the App Builder — Sam uses this to create repos from the CrewOS app template.",
    usedBy: ["devops", "dev"],
    fields: [
      { key: "token", label: "Personal Access Token", placeholder: "ghp_...", secret: true },
      { key: "org", label: "GitHub Org or Username", placeholder: "your-org-or-username" },
    ],
  },

  {
    id: "stripe",
    name: "Stripe",
    desc: "Payment processing and subscription management.",
    usedBy: ["cfo"],
    fields: [
      { key: "secret_key", label: "Secret Key", placeholder: "sk_live_...", secret: true },
      { key: "webhook_secret", label: "Webhook Secret", placeholder: "whsec_...", secret: true },
    ],
  },

  {
    id: "serpapi",
    name: "SerpAPI",
    desc: "Google Search results API. Scout uses this for product trend research.",
    usedBy: ["scout"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "xxxx", secret: true },
    ],
  },

  {
    id: "cjdropshipping",
    name: "CJ Dropshipping",
    desc: "Product sourcing and fulfillment. Scout and Victor use this to import and manage dropshipping products.",
    usedBy: ["scout", "coo"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "xxxx", secret: true },
      { key: "email", label: "Account Email", placeholder: "you@example.com" },
    ],
  },

  {
    id: "shopify",
    name: "Shopify",
    desc: "E-commerce store. Scout, Victor, Rex, and Priya use this to manage products, inventory, and orders.",
    usedBy: ["scout", "coo", "ads", "cx"],
    fields: [
      { key: "shop_domain", label: "Shop Domain", placeholder: "yourstore.myshopify.com" },
      { key: "access_token", label: "Admin API Access Token", placeholder: "shpat_...", secret: true },
    ],
  },

  {
    id: "tiktok",
    name: "TikTok Ads",
    desc: "TikTok Ads Manager. Rex uses this to manage paid TikTok ad campaigns.",
    usedBy: ["ads"],
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "xxxx", secret: true },
      { key: "advertiser_id", label: "Advertiser ID", placeholder: "xxxx" },
    ],
  },

  {
    id: "meta",
    name: "Meta Ads",
    desc: "Facebook and Instagram Ads Manager.",
    usedBy: ["ads"],
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "xxxx", secret: true },
      { key: "ad_account_id", label: "Ad Account ID", placeholder: "act_xxxx" },
    ],
  },

  {
    id: "google_ads",
    name: "Google Ads",
    desc: "Google Ads campaign management.",
    usedBy: ["ads"],
    fields: [
      { key: "developer_token", label: "Developer Token", placeholder: "xxxx", secret: true },
      { key: "client_id", label: "OAuth Client ID", placeholder: "xxxx.apps.googleusercontent.com" },
      { key: "client_secret", label: "OAuth Client Secret", placeholder: "xxxx", secret: true },
      { key: "refresh_token", label: "Refresh Token", placeholder: "xxxx", secret: true },
      { key: "customer_id", label: "Customer ID", placeholder: "123-456-7890" },
    ],
  },

  // ── New providers: Outbound Marketing ─────────────────────────────────────

  {
    id: "brevo",
    name: "Brevo",
    desc: "Email marketing and transactional email. Used by Nia, Kai, Zoe, Marcus, Priya, and Luna for all outbound and lifecycle emails.",
    usedBy: ["sdr", "outbound", "community", "vpsales", "cx", "cmo"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "xkeysib-...", secret: true },
      { key: "from_email", label: "From Email", placeholder: "hello@yourcompany.com" },
      { key: "from_name", label: "From Name", placeholder: "Your Name or Company" },
      { key: "default_list_id", label: "Default Contact List ID", placeholder: "2" },
    ],
  },

  {
    id: "vapi",
    name: "Vapi",
    desc: "AI voice calling. Nia uses this for outbound qualification calls and demo reminders.",
    usedBy: ["sdr"],
    fields: [
      { key: "api_key", label: "API Key", placeholder: "xxxx", secret: true },
      { key: "assistant_id", label: "Assistant ID", placeholder: "asst_xxxx — Nia's Vapi assistant" },
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "pn_xxxx — the outbound number" },
    ],
  },

  {
    id: "google_calendar",
    name: "Google Calendar",
    desc: "Demo and meeting scheduling. Nia and Marcus use this to book demos and send calendar invites to prospects.",
    usedBy: ["sdr", "vpsales"],
    fields: [
      { key: "access_token", label: "OAuth Access Token", placeholder: "ya29...", secret: true },
      { key: "refresh_token", label: "OAuth Refresh Token", placeholder: "1//...", secret: true },
      { key: "calendar_id", label: "Calendar ID", placeholder: "primary or specific@group.calendar.google.com" },
      { key: "timezone", label: "Timezone", placeholder: "America/New_York" },
    ],
  },

  // ── New providers: App Builder + Direct Mail ──────────────────────────────

  {
    id: "lob",
    name: "Lob",
    desc: "Direct mail platform. Luna uses this to send postcards and EDDM campaigns to local business zip codes.",
    usedBy: ["cmo"],
    fields: [
      { key: "api_key", label: "API Key (Live)", placeholder: "live_...", secret: true },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function providersForAgent(agentSlug: string): Provider[] {
  return PROVIDERS.filter((p) => p.usedBy.includes(agentSlug));
}