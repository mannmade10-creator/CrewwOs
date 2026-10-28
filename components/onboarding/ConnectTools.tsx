// components/onboarding/ConnectTools.tsx
//
// Step shown after vertical intake + entity question, before final success screen.
// Shows only the integrations relevant to each vertical.
// Platform-level tools (PostGrid, Resend) are hidden — they run on the operator's keys.
// Client connects only what belongs to their account (social, store, MLS, ads, etc.)

"use client";
import { useState } from "react";

// ─── Integration catalog ──────────────────────────────────────────────────────

interface Integration {
  id: string;
  label: string;
  icon: string;
  description: string;
  authType: "oauth" | "apikey" | "credentials";
  required: boolean;
  oauthPath?: string;
}

// ─── Vertical-specific integration sets ──────────────────────────────────────

const VERTICAL_INTEGRATIONS: Record<string, Integration[]> = {
  trades: [
    {
      id: "instagram", label: "Instagram", icon: "📸",
      description: "Before/after project photos, local reach, booking DMs",
      authType: "oauth", required: false, oauthPath: "/api/oauth/instagram",
    },
    {
      id: "facebook", label: "Facebook Page", icon: "👍",
      description: "Service area posts, reviews, lead form ads",
      authType: "oauth", required: false, oauthPath: "/api/oauth/facebook",
    },
    {
      id: "google_business", label: "Google Business Profile", icon: "🗺️",
      description: "Respond to reviews, update hours & services, post offers — critical for local search",
      authType: "oauth", required: true, oauthPath: "/api/oauth/google-business",
    },
    {
      id: "meta_ads", label: "Meta Ads", icon: "📣",
      description: "Run 'Oil change $29' or local service ads on autopilot",
      authType: "oauth", required: false, oauthPath: "/api/oauth/meta-ads",
    },
    {
      id: "stripe", label: "Stripe", icon: "💳",
      description: "Pull customer payment data to track repeat business & LTV",
      authType: "apikey", required: false,
    },
    {
      id: "square", label: "Square POS", icon: "🟦",
      description: "Import customer transaction history for mail campaign targeting",
      authType: "apikey", required: false,
    },
    {
      id: "tiktok", label: "TikTok", icon: "🎵",
      description: "Short-form video content, local viral reach",
      authType: "oauth", required: false, oauthPath: "/api/oauth/tiktok",
    },
  ],

  artist: [
    {
      id: "instagram", label: "Instagram", icon: "📸",
      description: "Auto-post release content, stories, fan engagement",
      authType: "oauth", required: true, oauthPath: "/api/oauth/instagram",
    },
    {
      id: "tiktok", label: "TikTok", icon: "🎵",
      description: "Music clips, trending sounds, viral release campaigns",
      authType: "oauth", required: true, oauthPath: "/api/oauth/tiktok",
    },
    {
      id: "youtube", label: "YouTube", icon: "▶️",
      description: "Music video uploads, lyric videos, channel management",
      authType: "oauth", required: false, oauthPath: "/api/oauth/youtube",
    },
    {
      id: "facebook", label: "Facebook Page", icon: "👍",
      description: "Event promotion, fan page posts, Meta ads for your releases",
      authType: "oauth", required: false, oauthPath: "/api/oauth/facebook",
    },
    {
      id: "meta_ads", label: "Meta Ads", icon: "📣",
      description: "Paid promotion for new releases, tours, and merch drops",
      authType: "oauth", required: false, oauthPath: "/api/oauth/meta-ads",
    },
    {
      id: "spotify_artist", label: "Spotify for Artists", icon: "🎧",
      description: "Track streaming data, pitch to playlists, canvas uploads",
      authType: "oauth", required: false, oauthPath: "/api/oauth/spotify-artist",
    },
    {
      id: "distrokid", label: "DistroKid", icon: "💿",
      description: "Manage distribution, track royalties, release scheduling",
      authType: "apikey", required: false,
    },
  ],

  real_estate: [
    {
      id: "mls", label: "MLS Board", icon: "🏠",
      description: "Import active listings, sold comps, price history",
      authType: "credentials", required: true,
    },
    {
      id: "instagram", label: "Instagram", icon: "📸",
      description: "Listing photos, reels of walkthroughs, just-listed posts",
      authType: "oauth", required: false, oauthPath: "/api/oauth/instagram",
    },
    {
      id: "facebook", label: "Facebook Page", icon: "👍",
      description: "Open house events, listing promotions, local market updates",
      authType: "oauth", required: false, oauthPath: "/api/oauth/facebook",
    },
    {
      id: "meta_ads", label: "Meta Ads", icon: "📣",
      description: "Listing ads targeted to buyers in your market area",
      authType: "oauth", required: false, oauthPath: "/api/oauth/meta-ads",
    },
    {
      id: "google_ads", label: "Google Ads", icon: "🔍",
      description: "'Homes for sale in [city]' search campaigns",
      authType: "oauth", required: false, oauthPath: "/api/oauth/google-ads",
    },
    {
      id: "google_business", label: "Google Business Profile", icon: "🗺️",
      description: "Reviews, local agent search visibility",
      authType: "oauth", required: false, oauthPath: "/api/oauth/google-business",
    },
    {
      id: "zillow", label: "Zillow / Realtor.com", icon: "🏡",
      description: "Sync listings, manage leads from portal inquiries",
      authType: "apikey", required: false,
    },
  ],

  restaurant: [
    {
      id: "instagram", label: "Instagram", icon: "📸",
      description: "Daily specials, food photos, stories, reel content",
      authType: "oauth", required: true, oauthPath: "/api/oauth/instagram",
    },
    {
      id: "tiktok", label: "TikTok", icon: "🎵",
      description: "Kitchen videos, ASMR content, viral food moments",
      authType: "oauth", required: false, oauthPath: "/api/oauth/tiktok",
    },
    {
      id: "facebook", label: "Facebook Page", icon: "👍",
      description: "Events, specials, community engagement",
      authType: "oauth", required: false, oauthPath: "/api/oauth/facebook",
    },
    {
      id: "google_business", label: "Google Business Profile", icon: "🗺️",
      description: "Review responses, menu updates, hours — your #1 local discovery tool",
      authType: "oauth", required: true, oauthPath: "/api/oauth/google-business",
    },
    {
      id: "square", label: "Square POS", icon: "🟦",
      description: "Customer purchase history for loyalty campaigns",
      authType: "apikey", required: false,
    },
    {
      id: "stripe", label: "Stripe", icon: "💳",
      description: "Online order data, revenue tracking",
      authType: "apikey", required: false,
    },
    {
      id: "meta_ads", label: "Meta Ads", icon: "📣",
      description: "Local food ads, event promotion, delivery campaigns",
      authType: "oauth", required: false, oauthPath: "/api/oauth/meta-ads",
    },
  ],

  ecommerce: [
    {
      id: "shopify", label: "Shopify", icon: "🛒",
      description: "Sync orders, customers, products — the core data source",
      authType: "apikey", required: true,
    },
    {
      id: "meta_ads", label: "Meta Ads", icon: "📣",
      description: "Product catalog ads, retargeting, lookalike campaigns",
      authType: "oauth", required: true, oauthPath: "/api/oauth/meta-ads",
    },
    {
      id: "instagram", label: "Instagram Shopping", icon: "📸",
      description: "Product tags, shoppable posts, story links",
      authType: "oauth", required: false, oauthPath: "/api/oauth/instagram",
    },
    {
      id: "tiktok", label: "TikTok Shop", icon: "🎵",
      description: "Product videos, affiliate content, TikTok ads",
      authType: "oauth", required: false, oauthPath: "/api/oauth/tiktok",
    },
    {
      id: "google_ads", label: "Google Shopping", icon: "🔍",
      description: "Shopping campaigns, Performance Max, search ads",
      authType: "oauth", required: false, oauthPath: "/api/oauth/google-ads",
    },
    {
      id: "klaviyo", label: "Klaviyo", icon: "📧",
      description: "Email/SMS flows: abandoned cart, post-purchase, winback",
      authType: "apikey", required: false,
    },
    {
      id: "stripe", label: "Stripe", icon: "💳",
      description: "Payment & revenue data for LTV reporting",
      authType: "apikey", required: false,
    },
  ],

  business: [
    {
      id: "instagram", label: "Instagram", icon: "📸",
      description: "Brand content, product/service posts, story campaigns",
      authType: "oauth", required: false, oauthPath: "/api/oauth/instagram",
    },
    {
      id: "facebook", label: "Facebook Page", icon: "👍",
      description: "Community posts, events, lead ads",
      authType: "oauth", required: false, oauthPath: "/api/oauth/facebook",
    },
    {
      id: "linkedin", label: "LinkedIn Page", icon: "💼",
      description: "B2B content, thought leadership, company updates",
      authType: "oauth", required: false, oauthPath: "/api/oauth/linkedin",
    },
    {
      id: "google_business", label: "Google Business Profile", icon: "🗺️",
      description: "Reviews, local search, services",
      authType: "oauth", required: false, oauthPath: "/api/oauth/google-business",
    },
    {
      id: "meta_ads", label: "Meta Ads", icon: "📣",
      description: "Lead gen campaigns, brand awareness, retargeting",
      authType: "oauth", required: false, oauthPath: "/api/oauth/meta-ads",
    },
    {
      id: "google_ads", label: "Google Ads", icon: "🔍",
      description: "Search campaigns for your services",
      authType: "oauth", required: false, oauthPath: "/api/oauth/google-ads",
    },
    {
      id: "stripe", label: "Stripe", icon: "💳",
      description: "Revenue & customer data, invoicing",
      authType: "apikey", required: false,
    },
  ],
};

function normalizeVertical(v: string): string {
  const map: Record<string, string> = {
    music: "artist",
    realestate: "real_estate",
    general: "business",
  };
  return map[v] ?? v;
}

interface ApiKeyFormProps {
  integration: Integration;
  workspaceSlug: string;
  onConnect: (id: string) => void;
}

function ApiKeyForm({ integration, workspaceSlug, onConnect }: ApiKeyFormProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCredentials = integration.authType === "credentials";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const creds = isCredentials ? { username, password } : { api_key: value };
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, provider: integration.id, credentials: creds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      onConnect(integration.id);
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save credentials");
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div style={{ marginTop: 10, background: "#060612", border: "1px solid #ffffff18", borderRadius: 10, padding: 14 }}>
      {isCredentials ? (
        <>
          <input placeholder="MLS Username" value={username} onChange={e => setUsername(e.target.value)}
            style={{ width: "100%", background: "#0d0d1a", border: "1px solid #ffffff22", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
          <input type="password" placeholder="MLS Password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", background: "#0d0d1a", border: "1px solid #ffffff22", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
        </>
      ) : (
        <input placeholder={`${integration.label} API Key`} value={value} onChange={e => setValue(e.target.value)}
          style={{ width: "100%", background: "#0d0d1a", border: "1px solid #ffffff22", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
      )}
      {error && <div style={{ color: "#ff9999", fontSize: 11, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setOpen(false)} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff22", borderRadius: 8, padding: "7px", color: "#ffffff66", fontSize: 12, cursor: "pointer" }}>Cancel</button>
        <button onClick={save} disabled={saving || (isCredentials ? !username || !password : !value)}
          style={{ flex: 2, background: "#00D4FF22", border: "1px solid #00D4FF55", borderRadius: 8, padding: "7px", color: "#00D4FF", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "Saving…" : "Connect"}
        </button>
      </div>
    </div>
  );
}

interface ConnectToolsProps {
  vertical: string;
  workspaceSlug: string;
  onContinue: () => void;
}

export default function ConnectTools({ vertical, workspaceSlug, onContinue }: ConnectToolsProps) {
  const normalizedVertical = normalizeVertical(vertical);
  const integrations = VERTICAL_INTEGRATIONS[normalizedVertical] ?? VERTICAL_INTEGRATIONS.business;
  const required = integrations.filter(i => i.required);
  const optional = integrations.filter(i => !i.required);

  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [apiKeyOpen, setApiKeyOpen] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = (id: string) => {
    setConnected(prev => new Set([...prev, id]));
    setApiKeyOpen(null);
  };

  const handleOAuth = async (integration: Integration) => {
    if (!integration.oauthPath) return;
    setConnecting(integration.id);
    const w = window.open(`${integration.oauthPath}?workspace=${workspaceSlug}`, "oauth", "width=560,height=620");
    const poll = setInterval(() => {
      if (w?.closed) {
        clearInterval(poll);
        handleConnect(integration.id);
        setConnecting(null);
      }
    }, 500);
  };

  const allRequiredConnected = required.every(i => connected.has(i.id));
  const connectedCount = connected.size;

  const verticalLabel: Record<string, string> = {
    trades: "Trades & Services",
    artist: "Music & Entertainment",
    real_estate: "Real Estate",
    restaurant: "Food & Restaurant",
    ecommerce: "E-Commerce",
    business: "General Business",
  };

  const VERTICAL_COLOR: Record<string, string> = {
    trades: "#10B981",
    artist: "#A855F7",
    real_estate: "#00D4FF",
    restaurant: "#F97316",
    ecommerce: "#F59E0B",
    business: "#6B7280",
  };

  const color = VERTICAL_COLOR[normalizedVertical] ?? "#00D4FF";

  return (
    <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color, fontSize: 11, letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>CONNECT YOUR TOOLS</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Give your crew access</div>
        <div style={{ color: "#ffffff66", fontSize: 13, lineHeight: 1.6 }}>
          Connect your accounts so your {verticalLabel[normalizedVertical]} agents can start working.
          <span style={{ color: "#ffffff44", fontSize: 12, display: "block", marginTop: 6 }}>
            📬 Direct mail, email, and platform infrastructure runs automatically — no setup needed.
          </span>
        </div>
      </div>

      {required.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>RECOMMENDED TO CONNECT FIRST</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {required.map(integration => {
              const isConnected = connected.has(integration.id);
              const isOpen = apiKeyOpen === integration.id;
              const isConnecting = connecting === integration.id;
              return (
                <div key={integration.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: isConnected ? "#10B98110" : "#060612", border: `1px solid ${isConnected ? "#10B98155" : color + "55"}`, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{integration.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                        {integration.label}<span style={{ color, fontSize: 10, marginLeft: 6 }}>★ KEY</span>
                      </div>
                      <div style={{ color: "#ffffff55", fontSize: 11, lineHeight: 1.4 }}>{integration.description}</div>
                    </div>
                    <button onClick={() => { if (isConnected) return; if (integration.authType === "oauth") handleOAuth(integration); else setApiKeyOpen(isOpen ? null : integration.id); }}
                      disabled={isConnected || isConnecting}
                      style={{ flexShrink: 0, background: isConnected ? "#10B98122" : `${color}22`, border: `1px solid ${isConnected ? "#10B98155" : color + "55"}`, borderRadius: 8, padding: "6px 14px", color: isConnected ? "#10B981" : color, fontSize: 12, fontWeight: 700, cursor: isConnected ? "default" : "pointer", whiteSpace: "nowrap" }}>
                      {isConnected ? "✓ Connected" : isConnecting ? "Opening…" : "Connect"}
                    </button>
                  </div>
                  {isOpen && integration.authType !== "oauth" && (
                    <ApiKeyForm integration={integration} workspaceSlug={workspaceSlug} onConnect={handleConnect} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {optional.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>OPTIONAL — CONNECT ANYTIME</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {optional.map(integration => {
              const isConnected = connected.has(integration.id);
              const isOpen = apiKeyOpen === integration.id;
              const isConnecting = connecting === integration.id;
              return (
                <div key={integration.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: isConnected ? "#10B98110" : "#060612", border: `1px solid ${isConnected ? "#10B98155" : "#ffffff18"}`, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>{integration.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{integration.label}</div>
                      <div style={{ color: "#ffffff44", fontSize: 11, lineHeight: 1.4 }}>{integration.description}</div>
                    </div>
                    <button onClick={() => { if (isConnected) return; if (integration.authType === "oauth") handleOAuth(integration); else setApiKeyOpen(isOpen ? null : integration.id); }}
                      disabled={isConnected || isConnecting}
                      style={{ flexShrink: 0, background: isConnected ? "#10B98122" : "#ffffff0a", border: `1px solid ${isConnected ? "#10B98155" : "#ffffff22"}`, borderRadius: 8, padding: "6px 14px", color: isConnected ? "#10B981" : "#ffffff88", fontSize: 12, fontWeight: 600, cursor: isConnected ? "default" : "pointer", whiteSpace: "nowrap" }}>
                      {isConnected ? "✓ Connected" : isConnecting ? "Opening…" : "Connect"}
                    </button>
                  </div>
                  {isOpen && integration.authType !== "oauth" && (
                    <ApiKeyForm integration={integration} workspaceSlug={workspaceSlug} onConnect={handleConnect} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {connectedCount > 0 && (
        <div style={{ background: "#10B98110", border: "1px solid #10B98133", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#10B981" }}>
          ✓ {connectedCount} tool{connectedCount !== 1 ? "s" : ""} connected
        </div>
      )}

      <button onClick={onContinue}
        style={{ width: "100%", background: connectedCount > 0 ? "linear-gradient(135deg, #00D4FF, #A855F7)" : "#ffffff18", border: "none", borderRadius: 10, padding: "12px", color: connectedCount > 0 ? "#000" : "#ffffff66", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        {connectedCount > 0 ? "Continue to Dashboard →" : "Skip for now →"}
      </button>
      {!allRequiredConnected && connectedCount === 0 && (
        <div style={{ color: "#ffffff44", fontSize: 11, textAlign: "center", marginTop: 8 }}>
          You can connect tools anytime from Settings → Integrations
        </div>
      )}
    </div>
  );
}