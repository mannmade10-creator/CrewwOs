"use client";
/**
 * app/dashboard/[slug]/realestate/page.tsx
 * CrewwOS for Real Estate — agent/broker command center + Scout Agent
 */
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface RealEstateProfile {
  id: string; agent_name: string; brokerage?: string; license_number?: string;
  photo_url?: string; onboarding_complete: boolean; onboarding_step: number;
  phone_number?: string; website?: string; plan: string;
}
interface Lead {
  id: string; name?: string; phone: string; source: string;
  status: string; property_type?: string; created_at: string;
}
interface ScoutDeal {
  id?: string;
  source: "mls" | "fsbo_zillow" | "fsbo_craigslist" | "attom" | "manual";
  external_id?: string;
  address: string; city?: string; state?: string; zip?: string;
  property_type?: string; beds?: number; baths?: number; sqft?: number;
  year_built?: number; list_price?: number; days_on_market?: number;
  est_arv?: number; est_repair?: number;
  is_fsbo: boolean; listing_url?: string; photos?: string[];
  status: string; priority: string; notes?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  mls: "MLS", fsbo_zillow: "Zillow FSBO", fsbo_craigslist: "Craigslist FSBO",
  attom: "ATTOM Data", manual: "Manual",
};
const SOURCE_COLORS: Record<string, string> = {
  mls: "#3B82F6", fsbo_zillow: "#10B981", fsbo_craigslist: "#F59E0B",
  attom: "#8B5CF6", manual: "#6B7280",
};
const STATUS_COLORS: Record<string, string> = {
  new: "#10B981", analyzing: "#3B82F6", contacted: "#F59E0B",
  offer_sent: "#A855F7", under_contract: "#EC4899", closed: "#22C55E", passed: "#6B7280",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "#6B7280", medium: "#F59E0B", high: "#EF4444", hot: "#FF3D00",
};

function fmt$(n?: number) {
  if (!n) return "—";
  return "$" + n.toLocaleString();
}
function fmtSqft(n?: number) { return n ? n.toLocaleString() + " sqft" : "—"; }

const MOCK_STATS = [
  { label: "Active Leads",    value: "—",  icon: "📋", note: "Connect your CRM or form" },
  { label: "Showings Booked", value: "—",  icon: "🏠", note: "Connect calendar" },
  { label: "Listings",        value: "—",  icon: "📍", note: "Add your MLS listings" },
  { label: "Commission (MTD)",value: "$0", icon: "💰", note: "Log your closings" },
  { label: "Follow-ups Due",  value: "—",  icon: "🔁", note: "FollowUpAgent waiting" },
];
const AGENT_FEED = [
  { agent: "Nia",           icon: "👑", action: "Your crew is ready — complete setup to activate",   time: "Waiting" },
  { agent: "ScoutAgent",    icon: "🔍", action: "Finding off-market & FSBO deals in your market",    time: "Active" },
  { agent: "LeadAgent",     icon: "📋", action: "Connect your web form or IDX to capture leads",     time: "Waiting" },
  { agent: "FollowUpAgent", icon: "🔁", action: "Auto-follows up on every buyer & seller lead",      time: "Waiting" },
  { agent: "ShowingAgent",  icon: "🏠", action: "Connect calendar to automate showing scheduling",   time: "Waiting" },
  { agent: "CopyAgent",     icon: "✍️", action: "Listing descriptions & social content on demand",   time: "Waiting" },
  { agent: "ReportAgent",   icon: "📊", action: "Market reports auto-sent to your sphere weekly",    time: "Waiting" },
];

export default function RealEstateDashboard() {
  const params = useParams();
  const slug = params?.slug as string ?? "";
  const base = `/dashboard/${slug}/realestate`;
  const [profile, setProfile] = useState<RealEstateProfile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "scout" | "agents">("overview");

  // Scout state
  const [scoutCity, setScoutCity]       = useState("Oklahoma City");
  const [scoutState, setScoutState]     = useState("OK");
  const [scoutZip, setScoutZip]         = useState("");
  const [scoutMax, setScoutMax]         = useState("400000");
  const [scoutSources, setScoutSources] = useState<string[]>(["mls","fsbo_zillow","attom"]);
  const [scoutResults, setScoutResults] = useState<ScoutDeal[]>([]);
  const [savedDeals, setSavedDeals]     = useState<ScoutDeal[]>([]);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutError, setScoutError]     = useState("");
  const [savingId, setSavingId]         = useState<string | null>(null);
  const [scoutView, setScoutView]       = useState<"search" | "saved">("search");

  useEffect(() => {
    fetch("/api/realestate/onboard")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.profile) { setProfile(d.profile); setLeads(d.leads ?? []); } })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const loadSavedDeals = useCallback(() => {
    fetch("/api/realestate/scout/deals")
      .then(r => r.json())
      .then(d => setSavedDeals(d.deals ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === "scout") loadSavedDeals();
  }, [activeTab, loadSavedDeals]);

  async function runScout() {
    setScoutLoading(true);
    setScoutError("");
    setScoutResults([]);
    try {
      const res = await fetch("/api/realestate/scout/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: scoutCity.trim(),
          state: scoutState.trim(),
          zip: scoutZip.trim(),
          max_price: Number(scoutMax.replace(/[^0-9]/g, "")) || 500_000,
          sources: scoutSources,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Search failed");
      setScoutResults(d.deals ?? []);
      if ((d.deals ?? []).length === 0) setScoutError("No deals found — try adjusting the area or price range.");
    } catch (e: unknown) {
      setScoutError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setScoutLoading(false);
    }
  }

  async function saveDeal(deal: ScoutDeal) {
    const key = deal.external_id ?? deal.address;
    setSavingId(key);
    try {
      const res = await fetch("/api/realestate/scout/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deal),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      // Refresh saved list
      loadSavedDeals();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Could not save deal");
    } finally {
      setSavingId(null);
    }
  }

  async function updateDealStatus(id: string, status: string) {
    await fetch("/api/realestate/scout/save", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadSavedDeals();
  }

  async function deleteDeal(id: string) {
    await fetch(`/api/realestate/scout/deals?id=${id}`, { method: "DELETE" });
    setSavedDeals(prev => prev.filter(d => d.id !== id));
  }

  // Use a placeholder profile if onboard API isn't set up yet
  const displayProfile: RealEstateProfile = profile ?? {
    id: "demo", agent_name: "Your Name", brokerage: "Your Brokerage",
    onboarding_complete: false, onboarding_step: 1, plan: "starter",
  };

  if (loading) return (
    <div style={{ ...S.centered, background: "#060612", minHeight: "100vh" }}>
      <div style={S.spinner} />
      <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 16, fontSize: 14 }}>Loading your office...</p>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={S.avatar}>{displayProfile.photo_url ? <img src={displayProfile.photo_url} alt={displayProfile.agent_name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} /> : <span style={{ fontSize: 28 }}>🏡</span>}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{displayProfile.agent_name}</h1>
              <span style={S.planBadge}>{displayProfile.plan.toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "4px 0 0" }}>{displayProfile.brokerage ?? "Independent Agent"} · CrewwOS Real Estate</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {!displayProfile.onboarding_complete && <a href={`${base}/onboard`} style={S.warningBtn}>⚡ Complete setup ({displayProfile.onboarding_step}/5)</a>}
          <button onClick={() => { setActiveTab("scout"); setScoutView("search"); }} style={S.scoutBtn}>🔍 Scout Deals</button>
          <a href={`${base}/leads/new`} style={S.primaryBtn}>+ New lead</a>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {(["overview","leads","scout","agents"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ ...S.tab, ...(activeTab === t ? S.tabActive : {}) }}>
            {t === "overview" ? "📊 Overview" : t === "leads" ? "📋 Leads" : t === "scout" ? "🔍 Scout Agent" : "🤖 Agents"}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div>
          <div style={S.statsGrid}>{MOCK_STATS.map(s => (<div key={s.label} style={S.statCard}><div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div><div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div><div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: "4px 0 6px" }}>{s.label}</div><div style={{ fontSize: 11, color: "rgba(16,185,129,0.8)" }}>{s.note}</div></div>))}</div>
          <div style={{ ...S.card, margin: "16px 32px" }}>
            <div style={S.cardHeader}><span style={{ fontSize: 16, fontWeight: 700 }}>🤖 Agent Activity</span></div>
            {AGENT_FEED.map(a => (<div key={a.agent} style={S.agentRow}><span style={{ fontSize: 20 }}>{a.icon}</span><div style={{ flex: 1 }}><span style={{ fontSize: 12, fontWeight: 700, color: a.time === "Active" ? "#3B82F6" : "#10B981" }}>{a.agent}</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginLeft: 8 }}>{a.action}</span></div><span style={{ fontSize: 11, color: a.time === "Active" ? "#3B82F6" : "rgba(255,255,255,0.3)" }}>{a.time}</span></div>))}
          </div>
        </div>
      )}

      {/* LEADS */}
      {activeTab === "leads" && (
        <div style={{ ...S.card, margin: "24px 32px" }}>
          <div style={S.cardHeader}><span style={{ fontSize: 16, fontWeight: 700 }}>📋 Lead Pipeline</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{leads.length} total</span></div>
          {leads.length === 0 ? <div style={S.emptyState}><p>No leads yet. Connect your IDX form or share your booking link.</p></div>
            : leads.map(l => (<div key={l.id} style={S.agentRow}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{l.name ?? "Unknown"}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{l.phone} · {l.property_type ?? l.source}</div></div><span style={{ fontSize: 11, background: "rgba(16,185,129,0.1)", color: "#10B981", borderRadius: 4, padding: "2px 8px", border: "1px solid rgba(16,185,129,0.2)" }}>{l.status}</span></div>))}
        </div>
      )}

      {/* SCOUT AGENT */}
      {activeTab === "scout" && (
        <div style={{ padding: "24px 32px" }}>
          {/* Scout header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🔍 Scout Agent</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>Searches MLS, Zillow FSBO, and ATTOM Data for deals in your market</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setScoutView("search")} style={{ ...S.viewToggle, ...(scoutView === "search" ? S.viewToggleActive : {}) }}>🔎 Search</button>
              <button onClick={() => setScoutView("saved")} style={{ ...S.viewToggle, ...(scoutView === "saved" ? S.viewToggleActive : {}) }}>💾 Saved ({savedDeals.length})</button>
            </div>
          </div>

          {/* Search panel */}
          {scoutView === "search" && (
            <>
              <div style={S.searchBar}>
                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>City</label>
                  <input value={scoutCity} onChange={e => setScoutCity(e.target.value)} style={S.input} placeholder="Oklahoma City" />
                </div>
                <div style={{ ...S.fieldGroup, maxWidth: 100 }}>
                  <label style={S.fieldLabel}>State</label>
                  <input value={scoutState} onChange={e => setScoutState(e.target.value)} style={S.input} placeholder="OK" maxLength={2} />
                </div>
                <div style={{ ...S.fieldGroup, maxWidth: 120 }}>
                  <label style={S.fieldLabel}>ZIP (optional)</label>
                  <input value={scoutZip} onChange={e => setScoutZip(e.target.value)} style={S.input} placeholder="73101" maxLength={5} />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>Max Price</label>
                  <input value={scoutMax} onChange={e => setScoutMax(e.target.value)} style={S.input} placeholder="400000" />
                </div>
                <button onClick={runScout} disabled={scoutLoading} style={{ ...S.primaryBtn, alignSelf: "flex-end", opacity: scoutLoading ? 0.6 : 1, whiteSpace: "nowrap" }}>
                  {scoutLoading ? "Scouting…" : "Run Scout →"}
                </button>
              </div>

              {/* Source toggles */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", alignSelf: "center" }}>Sources:</span>
                {["mls","fsbo_zillow","attom"].map(src => {
                  const on = scoutSources.includes(src);
                  return (
                    <button key={src} onClick={() => setScoutSources(prev => on ? prev.filter(s => s !== src) : [...prev, src])}
                      style={{ fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 20, border: `1px solid ${on ? SOURCE_COLORS[src] : "rgba(255,255,255,0.1)"}`, background: on ? SOURCE_COLORS[src] + "22" : "transparent", color: on ? SOURCE_COLORS[src] : "rgba(255,255,255,0.35)", cursor: "pointer" }}>
                      {SOURCE_LABELS[src]}
                    </button>
                  );
                })}
              </div>

              {scoutError && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 16, padding: "12px 16px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>⚠ {scoutError}</div>}

              {/* API key notice */}
              <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                <strong style={{ color: "#3B82F6" }}>📡 API Keys Required</strong> — Add these to your <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 3 }}>.env.local</code>:&nbsp;
                <code>ATTOM_API_KEY</code> (attomdata.com, free tier),&nbsp;
                <code>RAPIDAPI_KEY</code> + <code>ZILLOW_RAPIDAPI_HOST</code> (zillow-com1.p.rapidapi.com),&nbsp;
                <code>MLS_RAPIDAPI_HOST</code> (realty-in-us.p.rapidapi.com). Scout runs live searches against whichever sources have keys.
              </div>

              {/* Results */}
              {scoutResults.length > 0 && (
                <>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                    Found <strong style={{ color: "#fff" }}>{scoutResults.length} deals</strong> — FSBO shown first
                  </div>
                  <div style={S.dealGrid}>
                    {scoutResults.map((deal, i) => {
                      const key = deal.external_id ?? `${deal.source}-${i}`;
                      const isSaving = savingId === key;
                      return (
                        <div key={key} style={{ ...S.dealCard, ...(deal.is_fsbo ? S.dealCardFSBO : {}) }}>
                          {/* Source + FSBO badge */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: SOURCE_COLORS[deal.source], background: SOURCE_COLORS[deal.source] + "20", borderRadius: 4, padding: "2px 8px" }}>
                              {SOURCE_LABELS[deal.source]}
                            </span>
                            {deal.is_fsbo && <span style={{ fontSize: 10, fontWeight: 700, color: "#10B981", background: "rgba(16,185,129,0.15)", borderRadius: 4, padding: "2px 8px", border: "1px solid rgba(16,185,129,0.3)" }}>🤝 FSBO</span>}
                          </div>

                          {/* Photo */}
                          {deal.photos?.[0] && (
                            <img src={deal.photos[0]} alt={deal.address} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6, marginBottom: 10 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}

                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>{deal.address}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                            {[deal.beds && `${deal.beds} bd`, deal.baths && `${deal.baths} ba`, deal.sqft && fmtSqft(deal.sqft), deal.year_built && `Built ${deal.year_built}`].filter(Boolean).join(" · ")}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{fmt$(deal.list_price)}</div>
                              {deal.days_on_market !== undefined && <div style={{ fontSize: 10, color: deal.days_on_market > 30 ? "#F59E0B" : "rgba(255,255,255,0.35)" }}>{deal.days_on_market}d on market</div>}
                            </div>
                            {deal.property_type && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>{deal.property_type.replace(/_/g," ")}</span>}
                          </div>

                          <div style={{ display: "flex", gap: 6 }}>
                            {deal.listing_url && (
                              <a href={deal.listing_url} target="_blank" rel="noopener noreferrer"
                                style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 600, padding: "7px 0", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
                                View Listing ↗
                              </a>
                            )}
                            <button onClick={() => saveDeal({ ...deal, external_id: key })} disabled={isSaving}
                              style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: "7px 0", borderRadius: 6, border: "none", background: isSaving ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg,#10B981,#059669)", color: "#fff", cursor: "pointer", opacity: isSaving ? 0.7 : 1 }}>
                              {isSaving ? "Saving…" : "💾 Save Deal"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {!scoutLoading && scoutResults.length === 0 && !scoutError && (
                <div style={S.emptyScout}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Scout Agent is ready</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", maxWidth: 400, textAlign: "center", lineHeight: 1.7 }}>
                    Enter your market area and price range above, select your data sources, and hit <strong>Run Scout</strong>. Scout pulls live deals from MLS, Zillow FSBO, and ATTOM all at once.
                  </div>
                </div>
              )}
            </>
          )}

          {/* Saved deals panel */}
          {scoutView === "saved" && (
            <>
              {savedDeals.length === 0 ? (
                <div style={S.emptyScout}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💾</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>No saved deals yet</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Run a scout search and save deals you want to track.</div>
                </div>
              ) : (
                <>
                  {/* Status filter row */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    {Object.entries(STATUS_COLORS).map(([st, color]) => (
                      <button key={st} style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, border: `1px solid ${color}44`, background: color + "18", color, cursor: "pointer" }}>
                        {st.replace(/_/g," ")} ({savedDeals.filter(d => d.status === st).length})
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {savedDeals.map(deal => (
                      <div key={deal.id} style={S.savedDealRow}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{deal.address}</span>
                            {deal.is_fsbo && <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700 }}>FSBO</span>}
                            <span style={{ fontSize: 10, color: SOURCE_COLORS[deal.source] }}>{SOURCE_LABELS[deal.source]}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <span>{fmt$(deal.list_price)}</span>
                            {deal.beds && <span>{deal.beds}bd/{deal.baths}ba</span>}
                            {deal.est_arv && <span style={{ color: "#10B981" }}>ARV: {fmt$(deal.est_arv)}</span>}
                            {deal.est_repair && <span style={{ color: "#F59E0B" }}>Repairs: {fmt$(deal.est_repair)}</span>}
                          </div>
                          {deal.notes && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, fontStyle: "italic" }}>{deal.notes}</div>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: (STATUS_COLORS[deal.status] ?? "#6B7280") + "20", color: STATUS_COLORS[deal.status] ?? "#6B7280", border: `1px solid ${(STATUS_COLORS[deal.status] ?? "#6B7280")}44` }}>
                              {deal.status.replace(/_/g," ")}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: (PRIORITY_COLORS[deal.priority] ?? "#6B7280") + "20", color: PRIORITY_COLORS[deal.priority] ?? "#6B7280" }}>
                              {deal.priority === "hot" ? "🔥" : ""} {deal.priority}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <select onChange={e => deal.id && updateDealStatus(deal.id, e.target.value)} value={deal.status}
                              style={{ fontSize: 11, background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                              {["new","analyzing","contacted","offer_sent","under_contract","closed","passed"].map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                            </select>
                            {deal.listing_url && (
                              <a href={deal.listing_url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}>↗</a>
                            )}
                            <button onClick={() => deal.id && deleteDeal(deal.id)}
                              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}>✕</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* AGENTS */}
      {activeTab === "agents" && (
        <div style={S.agentGrid}>
          {[
            { icon:"👑",name:"Nia",role:"Chief of Staff",status:"active",desc:"Running your real estate operations"},
            { icon:"🔍",name:"ScoutAgent",role:"Deal Finder",status:"active",desc:"MLS + Zillow FSBO + ATTOM deal hunter"},
            { icon:"📋",name:"LeadAgent",role:"Lead Capture",status:"waiting",desc:"Connects to your IDX & web forms"},
            { icon:"🔁",name:"FollowUpAgent",role:"Follow-Up",status:"waiting",desc:"Never lets a lead go cold"},
            { icon:"🏠",name:"ShowingAgent",role:"Scheduling",status:"waiting",desc:"Books showings automatically"},
            { icon:"✍️",name:"CopyAgent",role:"Listing Copy",status:"waiting",desc:"Listing descriptions in seconds"},
            { icon:"📊",name:"ReportAgent",role:"Market Intel",status:"waiting",desc:"Auto CMA & market reports"},
            { icon:"📲",name:"SocialAgent",role:"Social Media",status:"waiting",desc:"Just listed / just sold posts"},
            { icon:"📧",name:"InboxAgent",role:"Comms",status:"waiting",desc:"Routes & responds to inquiries"},
            { icon:"🎬",name:"VideoAgent",role:"Content",status:"waiting",desc:"Property walkthrough scripts"},
            { icon:"⭐",name:"ReviewAgent",role:"Reputation",status:"waiting",desc:"Google & Zillow reviews"},
            { icon:"💰",name:"TaxAgent",role:"Finance",status:"waiting",desc:"Connect QuickBooks to activate"},
            { icon:"🔍",name:"SEOAgent",role:"Local SEO",status:"waiting",desc:"Ranks your listings higher"},
            { icon:"📅",name:"ScheduleAgent",role:"Calendar",status:"waiting",desc:"Open houses & deadlines"},
            { icon:"🤖",name:"ChatAgent",role:"Website Chat",status:"waiting",desc:"Connect site chat to activate"},
            { icon:"📨",name:"NurturingAgent",role:"Sphere",status:"waiting",desc:"Keeps your database warm"},
            { icon:"⚖️",name:"LegalAgent",role:"Compliance",status:"active",desc:"License renewal tracker ready"},
            { icon:"📈",name:"AdAgent",role:"Paid Media",status:"waiting",desc:"Available on Pro plan"},
            { icon:"🏷️",name:"PricingAgent",role:"Strategy",status:"waiting",desc:"Comp analysis on demand"},
            { icon:"🔔",name:"AlertAgent",role:"Monitoring",status:"waiting",desc:"Watches your market area"},
          ].map(a => (
            <div key={a.name} style={{ ...S.agentCard, ...(a.status==="active" ? S.agentCardActive : {}) }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}><span style={{ fontSize:24 }}>{a.icon}</span><span style={{ fontSize:10,fontWeight:700,color:a.status==="active"?"#22c55e":"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:1 }}>{a.status==="active"?"● Active":"○ Waiting"}</span></div>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:3 }}>{a.name}</div>
              <div style={{ fontSize:11,color:"#10B981",marginBottom:8 }}>{a.role}</div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.5 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:{background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",padding:"0 0 80px"},
  centered:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",padding:"80px 32px"},
  spinner:{width:36,height:36,border:"3px solid rgba(16,185,129,0.2)",borderTop:"3px solid #10B981",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"28px 32px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap",gap:16},
  avatar:{width:56,height:56,borderRadius:12,background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"},
  planBadge:{fontSize:10,fontWeight:700,color:"#10B981",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:4,padding:"2px 8px",letterSpacing:1},
  primaryBtn:{background:"linear-gradient(135deg,#10B981,#059669)",color:"#fff",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,textDecoration:"none",border:"none",cursor:"pointer"},
  scoutBtn:{background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.4)",color:"#3B82F6",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,cursor:"pointer"},
  warningBtn:{background:"rgba(234,179,8,0.1)",border:"1px solid rgba(234,179,8,0.3)",color:"#eab308",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,textDecoration:"none"},
  tabs:{display:"flex",gap:4,padding:"16px 32px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"},
  tab:{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,padding:"10px 16px",cursor:"pointer",borderBottom:"2px solid transparent",marginBottom:-1},
  tabActive:{color:"#10B981",borderBottom:"2px solid #10B981"},
  statsGrid:{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:12,padding:"24px 32px 0"},
  statCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px 16px"},
  card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px"},
  cardHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.06)"},
  agentRow:{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  emptyState:{textAlign:"center",padding:"32px 0",color:"rgba(255,255,255,0.35)",fontSize:14},
  agentGrid:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,padding:"24px 32px"},
  agentCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px"},
  agentCardActive:{borderColor:"rgba(34,197,94,0.25)",background:"rgba(34,197,94,0.04)"},
  // Scout-specific
  searchBar:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16,alignItems:"flex-end"},
  fieldGroup:{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:120},
  fieldLabel:{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.45)",letterSpacing:0.5},
  input:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:13,outline:"none"},
  dealGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:16},
  dealCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"16px"},
  dealCardFSBO:{borderColor:"rgba(16,185,129,0.25)",background:"rgba(16,185,129,0.03)"},
  emptyScout:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 0",color:"rgba(255,255,255,0.5)"},
  savedDealRow:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 16px"},
  viewToggle:{fontSize:12,fontWeight:700,padding:"7px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"},
  viewToggleActive:{background:"rgba(59,130,246,0.15)",borderColor:"rgba(59,130,246,0.4)",color:"#3B82F6"},
};
