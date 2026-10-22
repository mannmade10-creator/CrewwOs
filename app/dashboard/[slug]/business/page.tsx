"use client";
/**
 * app/dashboard/[slug]/business/page.tsx
 * CrewwOS for Business — local & service business command center
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BusinessProfile {
  id: string;
  business_name: string;
  industry: string;
  logo_url?: string;
  onboarding_complete: boolean;
  onboarding_step: number;
  phone_number?: string;
  website?: string;
  google_business_url?: string;
  yelp_url?: string;
  ein?: string;
  plan: string;
}

interface Lead {
  id: string;
  name?: string;
  phone: string;
  source: string;
  status: string;
  created_at: string;
}

const MOCK_STATS = [
  { label: "New Leads",       value: "—",  icon: "📥", note: "Connect form or QR" },
  { label: "Open Jobs",       value: "—",  icon: "🔧", note: "Add your first job" },
  { label: "Revenue (MTD)",   value: "$0", icon: "💰", note: "Connect QuickBooks" },
  { label: "Reviews",         value: "—",  icon: "⭐", note: "Connect Google Business" },
  { label: "Booked Appts",    value: "—",  icon: "📅", note: "Connect calendar" },
];

const AGENT_FEED = [
  { agent: "Nia",           icon: "👑", action: "Your crew is ready — complete setup to activate", time: "Waiting" },
  { agent: "InboxAgent",    icon: "📧", action: "Connect email to start routing inquiries",         time: "Waiting" },
  { agent: "BookingAgent",  icon: "📅", action: "Connect calendar to automate scheduling",          time: "Waiting" },
  { agent: "ReviewAgent",   icon: "⭐", action: "Connect Google Business for review monitoring",    time: "Waiting" },
  { agent: "FollowUpAgent", icon: "🔁", action: "Will follow up on every lead automatically",       time: "Waiting" },
  { agent: "InvoiceAgent",  icon: "🧾", action: "Connect QuickBooks to start auto-invoicing",      time: "Waiting" },
];

export default function BusinessDashboard() {
  const params = useParams();
  const slug = params?.slug as string ?? "";
  const base = `/dashboard/${slug}/business`;

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "agents">("overview");

  useEffect(() => {
    fetch("/api/business/onboard")
      .then(r => r.json())
      .then(d => { if (d.profile) { setProfile(d.profile); setLeads(d.leads ?? []); } })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={S.centered}><div style={S.spinner} /><p style={{ color: "rgba(255,255,255,0.4)", marginTop: 16, fontSize: 14 }}>Loading your business...</p></div>
  );

  if (!profile) return (
    <div style={S.centered}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Set up your business profile</h2>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 24, fontSize: 14 }}>Complete onboarding to activate your crew.</p>
      <a href={`${base}/onboard`} style={S.primaryBtn}>Start onboarding →</a>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={S.avatar}>
            {profile.logo_url
              ? <img src={profile.logo_url} alt={profile.business_name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
              : <span style={{ fontSize: 28 }}>🏢</span>
            }
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{profile.business_name}</h1>
              <span style={S.planBadge}>{profile.plan.toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "4px 0 0" }}>{profile.industry} · CrewwOS Business</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {!profile.onboarding_complete && (
            <a href={`${base}/onboard`} style={S.warningBtn}>⚡ Complete setup ({profile.onboarding_step}/5)</a>
          )}
          <a href={`${base}/leads/new`} style={S.primaryBtn}>+ New lead</a>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {(["overview", "leads", "agents"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ ...S.tab, ...(activeTab === t ? S.tabActive : {}) }}>
            {t === "overview" ? "📊 Overview" : t === "leads" ? "📥 Leads" : "🤖 Agents"}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div>
          <div style={S.statsGrid}>
            {MOCK_STATS.map(s => (
              <div key={s.label} style={S.statCard}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: "4px 0 6px" }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "rgba(0,212,255,0.7)" }}>{s.note}</div>
              </div>
            ))}
          </div>
          <div style={{ ...S.card, margin: "16px 32px" }}>
            <div style={S.cardHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>🤖 Agent Activity</span>
            </div>
            {AGENT_FEED.map(a => (
              <div key={a.agent} style={S.agentRow}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#00D4FF" }}>{a.agent}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginLeft: 8 }}>{a.action}</span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEADS */}
      {activeTab === "leads" && (
        <div style={{ ...S.card, margin: "24px 32px" }}>
          <div style={S.cardHeader}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>📥 Lead Pipeline</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{leads.length} total</span>
          </div>
          {leads.length === 0 ? (
            <div style={S.emptyState}>
              <p>No leads yet. Share your booking link or QR to start capturing.</p>
            </div>
          ) : leads.map(l => (
            <div key={l.id} style={S.agentRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.name ?? "Unknown"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{l.phone} · {l.source}</div>
              </div>
              <span style={{ fontSize: 11, background: "rgba(0,212,255,0.1)", color: "#00D4FF", borderRadius: 4, padding: "2px 8px", border: "1px solid rgba(0,212,255,0.2)" }}>{l.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* AGENTS */}
      {activeTab === "agents" && (
        <div style={S.agentGrid}>
          {[
            { icon: "👑", name: "Nia",           role: "Chief of Staff",    status: "active",  desc: "Coordinating your business operations" },
            { icon: "📧", name: "InboxAgent",    role: "Comms",            status: "waiting", desc: "Connect email to start routing" },
            { icon: "📅", name: "BookingAgent",  role: "Scheduling",       status: "waiting", desc: "Connect calendar to automate" },
            { icon: "🔁", name: "FollowUpAgent", role: "Follow-Up",        status: "waiting", desc: "Auto-follows up on every lead" },
            { icon: "⭐", name: "ReviewAgent",   role: "Reputation",       status: "waiting", desc: "Connect Google Business" },
            { icon: "🧾", name: "InvoiceAgent",  role: "Billing",          status: "waiting", desc: "Connect QuickBooks to activate" },
            { icon: "📲", name: "SocialAgent",   role: "Social Media",     status: "waiting", desc: "Connect accounts to activate" },
            { icon: "📊", name: "ReportAgent",   role: "Analytics",        status: "waiting", desc: "Connect tools for live data" },
            { icon: "✍️", name: "CopyAgent",     role: "Copywriter",       status: "waiting", desc: "Complete setup to activate" },
            { icon: "📥", name: "LeadAgent",     role: "Lead Capture",     status: "waiting", desc: "Share your form/QR to activate" },
            { icon: "💬", name: "ChatAgent",     role: "Customer Chat",    status: "waiting", desc: "Connect DMs to activate" },
            { icon: "🔍", name: "SEOAgent",      role: "Local SEO",        status: "waiting", desc: "Connect Google Business" },
            { icon: "🎬", name: "VideoAgent",    role: "Promo Content",    status: "waiting", desc: "Complete setup to activate" },
            { icon: "📦", name: "SupplyAgent",   role: "Inventory",        status: "waiting", desc: "Available on Growth plan" },
            { icon: "🤖", name: "OnboardAgent",  role: "Client Onboard",   status: "waiting", desc: "Automates new client intake" },
            { icon: "🔔", name: "AlertAgent",    role: "Monitoring",       status: "waiting", desc: "Watches reviews & mentions" },
            { icon: "📈", name: "AdAgent",       role: "Paid Media",       status: "waiting", desc: "Available on Pro plan" },
            { icon: "⚖️", name: "LegalAgent",    role: "Compliance",       status: "active",  desc: "Business entity checklist ready" },
            { icon: "💰", name: "TaxAgent",      role: "Finance",          status: "waiting", desc: "Connect QuickBooks to activate" },
          ].map(a => (
            <div key={a.name} style={{ ...S.agentCard, ...(a.status === "active" ? S.agentCardActive : {}) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{a.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: a.status === "active" ? "#22c55e" : "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1 }}>
                  {a.status === "active" ? "● Active" : "○ Waiting"}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: "#00D4FF", marginBottom: 8 }}>{a.role}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:          { background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", padding: "0 0 80px" },
  centered:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", padding: "80px 32px" },
  spinner:       { width: 36, height: 36, border: "3px solid rgba(0,212,255,0.2)", borderTop: "3px solid #00D4FF", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  header:        { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 16 },
  avatar:        { width: 56, height: 56, borderRadius: 12, background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  planBadge:     { fontSize: 10, fontWeight: 700, color: "#00D4FF", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 4, padding: "2px 8px", letterSpacing: 1 },
  primaryBtn:    { background: "linear-gradient(135deg, #00D4FF, #0066FF)", color: "#000", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, textDecoration: "none", border: "none", cursor: "pointer" },
  warningBtn:    { background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", color: "#eab308", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, textDecoration: "none" },
  tabs:          { display: "flex", gap: 4, padding: "16px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tab:           { background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, padding: "10px 16px", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -1 },
  tabActive:     { color: "#00D4FF", borderBottom: "2px solid #00D4FF" },
  statsGrid:     { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, padding: "24px 32px 0" },
  statCard:      { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 16px" },
  card:          { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px" },
  cardHeader:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" },
  agentRow:      { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  emptyState:    { textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.35)", fontSize: 14 },
  agentGrid:     { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "24px 32px" },
  agentCard:     { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px" },
  agentCardActive: { borderColor: "rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.04)" },
};
