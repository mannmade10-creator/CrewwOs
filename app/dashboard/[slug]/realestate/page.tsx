"use client";
/**
 * app/dashboard/[slug]/realestate/page.tsx
 * CrewwOS for Real Estate — agent/broker command center + Scout Agent + Analytics
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

const ACCENT = "#10B981";

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

function fmt$(n?: number) { if (!n) return "—"; return "$" + n.toLocaleString(); }
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
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "scout" | "analytics" | "agents">("overview");
  const [analyticsTab, setAnalyticsTab] = useState<"market" | "pipeline" | "marketing" | "finance">("market");

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
    setScoutLoading(true); setScoutError(""); setScoutResults([]);
    try {
      const res = await fetch("/api/realestate/scout/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: scoutCity.trim(), state: scoutState.trim(), zip: scoutZip.trim(), max_price: Number(scoutMax.replace(/[^0-9]/g, "")) || 500_000, sources: scoutSources }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Search failed");
      setScoutResults(d.deals ?? []);
      if ((d.deals ?? []).length === 0) setScoutError("No deals found — try adjusting the area or price range.");
    } catch (e: unknown) {
      setScoutError(e instanceof Error ? e.message : "Search failed");
    } finally { setScoutLoading(false); }
  }

  async function saveDeal(deal: ScoutDeal) {
    const key = deal.external_id ?? deal.address; setSavingId(key);
    try {
      const res = await fetch("/api/realestate/scout/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deal) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      loadSavedDeals();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Could not save deal"); }
    finally { setSavingId(null); }
  }

  async function updateDealStatus(id: string, status: string) {
    await fetch("/api/realestate/scout/save", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    loadSavedDeals();
  }

  async function deleteDeal(id: string) {
    await fetch(`/api/realestate/scout/deals?id=${id}`, { method: "DELETE" });
    setSavedDeals(prev => prev.filter(d => d.id !== id));
  }

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
          <a href={`${base}/leads/new`} style={S.primaryBtn}>+ New lead</a>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {(["overview","leads","scout","analytics","agents"] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{ ...S.tab,...(activeTab===t?{ color:ACCENT,borderBottom:`2px solid ${ACCENT}`,marginBottom:-1 }:{}) }}>
            {t==="overview"?"📊 Overview":t==="leads"?"📋 Leads":t==="scout"?"🔍 Scout":t==="analytics"?"📈 Analytics":"🤖 Agents"}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab==="overview"&&(
        <div>
          <div style={S.statsGrid}>{MOCK_STATS.map(s=>(<div key={s.label} style={S.statCard}><div style={{ fontSize:24,marginBottom:8 }}>{s.icon}</div><div style={{ fontSize:28,fontWeight:800 }}>{s.value}</div><div style={{ fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.6)",margin:"4px 0 6px" }}>{s.label}</div><div style={{ fontSize:11,color:`${ACCENT}cc` }}>{s.note}</div></div>))}</div>
          <div style={{ ...S.card,margin:"16px 32px" }}>
            <div style={S.cardHeader}><span style={{ fontSize:16,fontWeight:700 }}>🤖 Agent Activity</span></div>
            {AGENT_FEED.map(a=>(<div key={a.agent} style={S.agentRow}><span style={{ fontSize:20 }}>{a.icon}</span><div style={{ flex:1 }}><span style={{ fontSize:12,fontWeight:700,color:ACCENT }}>{a.agent}</span><span style={{ fontSize:13,color:"rgba(255,255,255,0.7)",marginLeft:8 }}>{a.action}</span></div><span style={{ fontSize:11,color:a.time==="Active"?ACCENT:"rgba(255,255,255,0.3)" }}>{a.time}</span></div>))}
          </div>
        </div>
      )}

      {/* LEADS */}
      {activeTab==="leads"&&(
        <div style={{ ...S.card,margin:"24px 32px" }}>
          <div style={S.cardHeader}><span style={{ fontSize:16,fontWeight:700 }}>📋 Lead Pipeline</span><span style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>{leads.length} total</span></div>
          {leads.length===0 ? (
            <div style={{ textAlign:"center",padding:"32px 0",color:"rgba(255,255,255,0.35)",fontSize:14 }}>No leads yet. Share your IDX form or booking link to start capturing.</div>
          ) : leads.map(l=>(
            <div key={l.id} style={S.agentRow}>
              <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600 }}>{l.name??"Unknown"}</div><div style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>{l.phone} · {l.source} · {l.property_type??""}</div></div>
              <span style={{ fontSize:11,background:`${ACCENT}18`,color:ACCENT,borderRadius:4,padding:"2px 8px",border:`1px solid ${ACCENT}30` }}>{l.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* SCOUT */}
      {activeTab==="scout"&&(
        <div style={{ padding:"24px 32px" }}>
          <div style={{ display:"flex",gap:8,marginBottom:20 }}>
            {(["search","saved"] as const).map(v=>(
              <button key={v} onClick={()=>setScoutView(v)} style={{ background:scoutView===v?ACCENT:"rgba(255,255,255,0.05)",color:scoutView===v?"#000":"rgba(255,255,255,0.6)",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                {v==="search"?"🔍 Find Deals":"💾 Saved Deals"}
              </button>
            ))}
          </div>
          {scoutView==="search"&&(
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div style={S.card}>
                <div style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>🎯 Search Parameters</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16 }}>
                  <div><div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4 }}>CITY</div><input value={scoutCity} onChange={e=>setScoutCity(e.target.value)} style={S.input} placeholder="Oklahoma City" /></div>
                  <div><div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4 }}>STATE</div><input value={scoutState} onChange={e=>setScoutState(e.target.value)} style={S.input} placeholder="OK" /></div>
                  <div><div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4 }}>ZIP (opt)</div><input value={scoutZip} onChange={e=>setScoutZip(e.target.value)} style={S.input} placeholder="73101" /></div>
                  <div><div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4 }}>MAX PRICE</div><input value={scoutMax} onChange={e=>setScoutMax(e.target.value)} style={S.input} placeholder="400000" /></div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:8 }}>DATA SOURCES</div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" as const }}>
                    {["mls","fsbo_zillow","fsbo_craigslist","attom"].map(src=>(
                      <button key={src} onClick={()=>setScoutSources(p=>p.includes(src)?p.filter(x=>x!==src):[...p,src])} style={{ background:scoutSources.includes(src)?`${SOURCE_COLORS[src]}22`:"rgba(255,255,255,0.04)",color:scoutSources.includes(src)?SOURCE_COLORS[src]:"rgba(255,255,255,0.4)",border:`1px solid ${scoutSources.includes(src)?SOURCE_COLORS[src]+"44":"rgba(255,255,255,0.08)"}`,borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer" }}>
                        {SOURCE_LABELS[src]}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={runScout} disabled={scoutLoading} style={{ background:scoutLoading?"rgba(16,185,129,0.3)":`linear-gradient(135deg,${ACCENT},#059669)`,color:scoutLoading?"rgba(255,255,255,0.5)":"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:scoutLoading?"not-allowed":"pointer" }}>
                  {scoutLoading?"🔍 Searching...":"🔍 Find Deals"}
                </button>
              </div>
              {scoutError&&<div style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"12px 16px",color:"#fca5a5",fontSize:13 }}>{scoutError}</div>}
              {scoutResults.length>0&&(
                <div>
                  <div style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>🏠 {scoutResults.length} Deals Found</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                    {scoutResults.map((deal,i)=>(
                      <div key={deal.external_id??i} style={{ ...S.card,position:"relative" as const }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                          <div>
                            <div style={{ fontSize:15,fontWeight:700,marginBottom:4 }}>{deal.address}{deal.city?`, ${deal.city}`:""}{deal.state?` ${deal.state}`:""}</div>
                            <div style={{ display:"flex",gap:8,flexWrap:"wrap" as const }}>
                              <span style={{ fontSize:11,color:SOURCE_COLORS[deal.source],background:`${SOURCE_COLORS[deal.source]}18`,borderRadius:4,padding:"2px 8px",border:`1px solid ${SOURCE_COLORS[deal.source]}30` }}>{SOURCE_LABELS[deal.source]}</span>
                              {deal.is_fsbo&&<span style={{ fontSize:11,color:"#F59E0B",background:"rgba(245,158,11,0.1)",borderRadius:4,padding:"2px 8px",border:"1px solid rgba(245,158,11,0.2)" }}>FSBO</span>}
                              {deal.days_on_market!==undefined&&<span style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>{deal.days_on_market}d on market</span>}
                            </div>
                          </div>
                          <div style={{ textAlign:"right" as const }}>
                            <div style={{ fontSize:20,fontWeight:800,color:ACCENT }}>{fmt$(deal.list_price)}</div>
                            {deal.est_arv&&<div style={{ fontSize:12,color:"rgba(255,255,255,0.5)" }}>ARV: {fmt$(deal.est_arv)}</div>}
                          </div>
                        </div>
                        <div style={{ display:"flex",gap:16,flexWrap:"wrap" as const,marginBottom:12 }}>
                          {deal.beds&&<span style={{ fontSize:13,color:"rgba(255,255,255,0.7)" }}>🛏 {deal.beds}bd</span>}
                          {deal.baths&&<span style={{ fontSize:13,color:"rgba(255,255,255,0.7)" }}>🚿 {deal.baths}ba</span>}
                          {deal.sqft&&<span style={{ fontSize:13,color:"rgba(255,255,255,0.7)" }}>📐 {fmtSqft(deal.sqft)}</span>}
                          {deal.year_built&&<span style={{ fontSize:13,color:"rgba(255,255,255,0.7)" }}>🏗 {deal.year_built}</span>}
                          {deal.est_repair&&<span style={{ fontSize:13,color:"#F59E0B" }}>🔧 Est repair: {fmt$(deal.est_repair)}</span>}
                        </div>
                        <div style={{ display:"flex",gap:10 }}>
                          <button onClick={()=>saveDeal(deal)} disabled={savingId===(deal.external_id??deal.address)} style={{ background:`${ACCENT}22`,color:ACCENT,border:`1px solid ${ACCENT}44`,borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                            {savingId===(deal.external_id??deal.address)?"Saving...":"💾 Save Deal"}
                          </button>
                          {deal.listing_url&&<a href={deal.listing_url} target="_blank" rel="noreferrer" style={{ background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 14px",fontSize:12,textDecoration:"none" }}>🔗 View Listing</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {scoutView==="saved"&&(
            <div>
              <div style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>💾 Saved Deals ({savedDeals.length})</div>
              {savedDeals.length===0 ? (
                <div style={{ ...S.card,textAlign:"center" as const,padding:"40px 20px",color:"rgba(255,255,255,0.35)" }}>No saved deals yet. Run a search and save deals to track them here.</div>
              ) : savedDeals.map(deal=>(
                <div key={deal.id} style={{ ...S.card,marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>{deal.address}</div>
                      <div style={{ display:"flex",gap:8 }}>
                        <span style={{ fontSize:11,color:SOURCE_COLORS[deal.source],background:`${SOURCE_COLORS[deal.source]}18`,borderRadius:4,padding:"2px 8px",border:`1px solid ${SOURCE_COLORS[deal.source]}30` }}>{SOURCE_LABELS[deal.source]}</span>
                        <span style={{ fontSize:11,color:STATUS_COLORS[deal.status]??ACCENT,background:`${STATUS_COLORS[deal.status]??ACCENT}18`,borderRadius:4,padding:"2px 8px",border:`1px solid ${STATUS_COLORS[deal.status]??ACCENT}30` }}>{deal.status.replace("_"," ")}</span>
                        <span style={{ fontSize:11,color:PRIORITY_COLORS[deal.priority]??"#6B7280",background:`${PRIORITY_COLORS[deal.priority]??"#6B7280"}18`,borderRadius:4,padding:"2px 8px",border:`1px solid ${PRIORITY_COLORS[deal.priority]??"#6B7280"}30` }}>{deal.priority}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" as const }}>
                      <div style={{ fontSize:18,fontWeight:800,color:ACCENT }}>{fmt$(deal.list_price)}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" as const }}>
                    {["analyzing","contacted","offer_sent","under_contract","passed"].map(st=>(
                      <button key={st} onClick={()=>deal.id&&updateDealStatus(deal.id,st)} style={{ background:deal.status===st?`${STATUS_COLORS[st]}22`:"rgba(255,255,255,0.04)",color:deal.status===st?(STATUS_COLORS[st]??ACCENT):"rgba(255,255,255,0.4)",border:`1px solid ${deal.status===st?(STATUS_COLORS[st]??"#10B981")+"44":"rgba(255,255,255,0.08)"}`,borderRadius:5,padding:"4px 10px",fontSize:11,cursor:"pointer" }}>
                        {st.replace("_"," ")}
                      </button>
                    ))}
                    <button onClick={()=>deal.id&&deleteDeal(deal.id)} style={{ background:"rgba(239,68,68,0.08)",color:"rgba(239,68,68,0.7)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:5,padding:"4px 10px",fontSize:11,cursor:"pointer",marginLeft:"auto" }}>🗑 Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS */}
      {activeTab==="analytics"&&(
        <div style={{ padding:"24px 32px",display:"flex",flexDirection:"column",gap:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:16,background:`${ACCENT}0a`,border:`1px solid ${ACCENT}28`,borderRadius:12,padding:"16px 20px" }}>
            <span style={{ fontSize:20 }}>🔗</span>
            <div style={{ flex:1 }}>
              <strong style={{ fontSize:14 }}>Connect your tools for live real estate analytics</strong>
              <p style={{ margin:"4px 0 0",fontSize:12,color:"rgba(255,255,255,0.5)" }}>Connect your CRM, MLS data feed, and Google Analytics to track leads, listings, and market performance in real time.</p>
            </div>
            <a href={`/dashboard/${slug}/integrations`} style={{ background:ACCENT,color:"#fff",fontWeight:700,fontSize:12,padding:"8px 16px",borderRadius:8,textDecoration:"none",whiteSpace:"nowrap" as const }}>Connect →</a>
          </div>

          <div style={{ display:"flex",gap:4,borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            {(["market","pipeline","marketing","finance"] as const).map(t=>(
              <button key={t} onClick={()=>setAnalyticsTab(t)} style={{ background:"none",border:"none",color:analyticsTab===t?ACCENT:"rgba(255,255,255,0.4)",fontSize:12,fontWeight:600,padding:"10px 14px",cursor:"pointer",borderBottom:analyticsTab===t?`2px solid ${ACCENT}`:"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap" as const }}>
                {t==="market"?"🏘️ Market":t==="pipeline"?"🔄 Pipeline":t==="marketing"?"📢 Marketing":"💰 Finance"}
              </button>
            ))}
          </div>

          {analyticsTab==="market"&&(
            <>
              <div style={S.statsGrid}>
                {[
                  { label:"Median Home Price",    value:"$—",  icon:"🏠", note:"Your target market",        color:ACCENT },
                  { label:"Days on Market (Avg)", value:"—",   icon:"📅", note:"Market absorption rate",    color:"#06B6D4" },
                  { label:"List/Sale Price Ratio",value:"—%",  icon:"📊", note:"How close to asking",       color:"#a855f7" },
                  { label:"Active Listings",       value:"—",   icon:"📍", note:"Your MLS area",             color:"#f59e0b" },
                  { label:"Months of Inventory",  value:"—",   icon:"🗓️", note:"Supply vs demand metric",   color:"#ef4444" },
                  { label:"Avg Price per Sqft",   value:"$—",  icon:"📐", note:"Market benchmark",          color:ACCENT },
                ].map(s=><REStat key={s.label} {...s} />)}
              </div>
              <div style={S.card}>
                <div style={S.cardHeader}><span style={{ fontSize:14,fontWeight:700 }}>🔗 MLS & Market Data Integrations</span></div>
                {[
                  { name:"Zillow Bridge API",    icon:"🔵", desc:"Property data, Zestimate, and market stats",            url:"https://bridgeinteractive.com" },
                  { name:"ATTOM Data Solutions", icon:"🟣", desc:"Property details, valuation, and neighborhood data",    url:"https://www.attomdata.com" },
                  { name:"Redfin Data Center",   icon:"🔴", desc:"Market trend reports and median price history",         url:"https://www.redfin.com/news/data-center" },
                  { name:"CoreLogic Matrix",     icon:"🟠", desc:"MLS data, tax records, and market analytics",          url:"https://www.corelogic.com" },
                ].map(p=>(
                  <div key={p.name} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize:20 }}>{p.icon}</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,marginBottom:2 }}>{p.name}</div><div style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>{p.desc}</div></div>
                    <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize:12,color:ACCENT,textDecoration:"none",background:`${ACCENT}10`,border:`1px solid ${ACCENT}28`,borderRadius:6,padding:"4px 10px" }}>Connect →</a>
                  </div>
                ))}
              </div>
            </>
          )}

          {analyticsTab==="pipeline"&&(
            <>
              <div style={S.statsGrid}>
                {[
                  { label:"Active Leads",        value:"—",   icon:"📋", note:"In your pipeline",           color:ACCENT },
                  { label:"Showings (30d)",       value:"—",   icon:"🏠", note:"Scheduled showings",          color:"#06B6D4" },
                  { label:"Offers Made (30d)",    value:"—",   icon:"📝", note:"Buyer offers submitted",      color:"#a855f7" },
                  { label:"Under Contract",        value:"—",   icon:"🤝", note:"Active transactions",         color:"#f59e0b" },
                  { label:"Closings (MTD)",        value:"—",   icon:"🔑", note:"Deals closed this month",    color:"#22c55e" },
                  { label:"Lead→Close Rate",       value:"—%",  icon:"🎯", note:"Conversion rate",             color:ACCENT },
                ].map(s=><REStat key={s.label} {...s} />)}
              </div>
              <div style={S.card}>
                <div style={S.cardHeader}><span style={{ fontSize:14,fontWeight:700 }}>🔄 CRM Integrations</span></div>
                {[
                  { name:"Follow Up Boss",  icon:"🟢", desc:"Real estate CRM with pipeline tracking and auto-follow-up",  url:"https://www.followupboss.com" },
                  { name:"LionDesk",        icon:"🦁", desc:"CRM, email/text drips, and video email for agents",          url:"https://www.liondesk.com" },
                  { name:"KvCORE",          icon:"🔵", desc:"All-in-one platform with IDX, CRM, and lead gen",            url:"https://kvcore.com" },
                  { name:"Sierra Interactive",icon:"🟣", desc:"IDX website, CRM, and lead routing for real estate teams", url:"https://www.sierrainteractive.com" },
                ].map(p=>(
                  <div key={p.name} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize:20 }}>{p.icon}</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,marginBottom:2 }}>{p.name}</div><div style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>{p.desc}</div></div>
                    <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize:12,color:ACCENT,textDecoration:"none",background:`${ACCENT}10`,border:`1px solid ${ACCENT}28`,borderRadius:6,padding:"4px 10px" }}>Connect →</a>
                  </div>
                ))}
              </div>
            </>
          )}

          {analyticsTab==="marketing"&&(
            <>
              <div style={S.statsGrid}>
                {[
                  { label:"IDX Website Visits",  value:"—",  icon:"🌐", note:"Connect Google Analytics",  color:ACCENT },
                  { label:"Lead Form Submits",   value:"—",  icon:"📋", note:"Organic lead captures",      color:"#22c55e" },
                  { label:"Email Open Rate",      value:"—%", icon:"📧", note:"Connect Mailchimp/Brevo",    color:"#06B6D4" },
                  { label:"Social Reach (30d)",   value:"—",  icon:"📲", note:"Connect Instagram/Facebook", color:"#a855f7" },
                ].map(s=><REStat key={s.label} {...s} />)}
              </div>
              <div style={S.card}>
                <div style={S.cardHeader}><span style={{ fontSize:14,fontWeight:700 }}>📢 Marketing Platform Integrations</span></div>
                {[
                  { name:"Google Analytics",     icon:"🟡", desc:"Website traffic, lead source attribution, and conversions", url:"https://analytics.google.com" },
                  { name:"Mailchimp",             icon:"🟡", desc:"Email newsletters, market report drips, and automations",   url:"https://mailchimp.com" },
                  { name:"BombBomb",              icon:"🔴", desc:"Video email for personal outreach and listing presentations", url:"https://bombbomb.com" },
                  { name:"Canva for Real Estate", icon:"🔵", desc:"Listing flyers, social posts, and market report templates",  url:"https://www.canva.com/realtors" },
                ].map(p=>(
                  <div key={p.name} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize:20 }}>{p.icon}</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,marginBottom:2 }}>{p.name}</div><div style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>{p.desc}</div></div>
                    <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize:12,color:ACCENT,textDecoration:"none",background:`${ACCENT}10`,border:`1px solid ${ACCENT}28`,borderRadius:6,padding:"4px 10px" }}>Connect →</a>
                  </div>
                ))}
              </div>
            </>
          )}

          {analyticsTab==="finance"&&(
            <>
              <div style={S.statsGrid}>
                {[
                  { label:"GCI (MTD)",           value:"$—", icon:"💰", note:"Gross commission income",    color:"#22c55e" },
                  { label:"Active Transaction $", value:"$—", icon:"🤝", note:"Pipeline deal volume",       color:ACCENT },
                  { label:"Avg Commission",       value:"$—", icon:"📊", note:"Per closed transaction",     color:"#06B6D4" },
                  { label:"Split Take-Home",      value:"$—", icon:"✂️", note:"After brokerage split",      color:"#a855f7" },
                ].map(s=><REStat key={s.label} {...s} />)}
              </div>
              <div style={S.card}>
                <div style={S.cardHeader}><span style={{ fontSize:14,fontWeight:700 }}>💰 Finance Integrations</span></div>
                {[
                  { name:"QuickBooks Self-Employed", icon:"🟢", desc:"Track commission income, mileage, and deductible expenses", url:"https://quickbooks.intuit.com/self-employed" },
                  { name:"Realty Juggler",           icon:"🟠", desc:"Real estate-specific CRM with commission tracking",          url:"https://www.realtyjuggler.com" },
                  { name:"Propertybase",             icon:"🔵", desc:"Salesforce-powered CRM with commission and pipeline mgmt",   url:"https://www.propertybase.com" },
                ].map(p=>(
                  <div key={p.name} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize:20 }}>{p.icon}</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,marginBottom:2 }}>{p.name}</div><div style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>{p.desc}</div></div>
                    <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize:12,color:ACCENT,textDecoration:"none",background:`${ACCENT}10`,border:`1px solid ${ACCENT}28`,borderRadius:6,padding:"4px 10px" }}>Connect →</a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* AGENTS */}
      {activeTab==="agents"&&(
        <div style={S.agentGrid}>
          {[
            {icon:"👑",name:"Nia",role:"Chief of Staff",status:"active",desc:"Running your real estate operations"},
            {icon:"🔍",name:"ScoutAgent",role:"Deal Finder",status:"active",desc:"Finds off-market & FSBO deals daily"},
            {icon:"📋",name:"LeadAgent",role:"Lead Capture",status:"waiting",desc:"Connect IDX form to activate"},
            {icon:"🔁",name:"FollowUpAgent",role:"Follow-Up",status:"waiting",desc:"Auto-follows up on every lead"},
            {icon:"🏠",name:"ShowingAgent",role:"Scheduling",status:"waiting",desc:"Connect calendar to automate showings"},
            {icon:"✍️",name:"CopyAgent",role:"Copywriter",status:"waiting",desc:"Listing descriptions & social posts"},
            {icon:"📊",name:"ReportAgent",role:"Market Reports",status:"waiting",desc:"Weekly sphere market updates"},
            {icon:"📲",name:"SocialAgent",role:"Social Media",status:"waiting",desc:"Just Listed/Sold content"},
            {icon:"📧",name:"InboxAgent",role:"Comms",status:"waiting",desc:"Handles lead inquiries"},
            {icon:"🎬",name:"VideoAgent",role:"Listing Video",status:"waiting",desc:"Listing tours & neighborhood reels"},
            {icon:"🔔",name:"AlertAgent",role:"Monitoring",status:"waiting",desc:"Price changes & new MLS listings"},
            {icon:"📈",name:"AdAgent",role:"Paid Media",status:"waiting",desc:"Facebook Lead Ads & Google PPC"},
            {icon:"🤖",name:"ChatAgent",role:"Website Chat",status:"waiting",desc:"24/7 IDX site lead capture"},
            {icon:"⚖️",name:"LegalAgent",role:"Compliance",status:"active",desc:"License renewal tracker ready"},
            {icon:"💰",name:"TaxAgent",role:"Finance",status:"waiting",desc:"Connect QuickBooks to activate"},
            {icon:"🏗️",name:"StagerAgent",role:"Staging Tips",status:"waiting",desc:"AI staging recommendations"},
            {icon:"📸",name:"PhotoAgent",role:"Media",status:"waiting",desc:"Photo scheduling & MLS upload"},
            {icon:"🗺️",name:"LocalAgent",role:"Local SEO",status:"waiting",desc:"Ranks your site on Google Maps"},
            {icon:"🔎",name:"BuyerAgent",role:"Buyer Search",status:"waiting",desc:"Matches listings to buyer criteria"},
          ].map(a=>(
            <div key={a.name} style={{ ...S.agentCard,...(a.status==="active"?S.agentCardActive:{}) }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}><span style={{ fontSize:24 }}>{a.icon}</span><span style={{ fontSize:10,fontWeight:700,color:a.status==="active"?"#22c55e":"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:1 }}>{a.status==="active"?"● Active":"○ Waiting"}</span></div>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:3 }}>{a.name}</div>
              <div style={{ fontSize:11,color:ACCENT,marginBottom:8 }}>{a.role}</div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.5 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function REStat({ label, value, icon, note, color }: { label: string; value: string; icon: string; note: string; color: string }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)",border:`1px solid ${color}22`,borderRadius:14,padding:"20px 16px" }}>
      <div style={{ fontSize:22,marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:26,fontWeight:800,color:value.includes("—")?"rgba(255,255,255,0.2)":"#fff" }}>{value}</div>
      <div style={{ fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.6)",margin:"4px 0 6px" }}>{label}</div>
      <div style={{ fontSize:11,color:`${color}cc` }}>{note}</div>
    </div>
  );
}

const S: Record<string,React.CSSProperties> = {
  page:{background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",padding:"0 0 80px"},
  centered:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",padding:"80px 32px"},
  spinner:{width:36,height:36,border:"3px solid rgba(16,185,129,0.2)",borderTop:"3px solid #10B981",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"28px 32px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap",gap:16},
  avatar:{width:56,height:56,borderRadius:12,background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"},
  planBadge:{fontSize:10,fontWeight:700,color:"#10B981",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:4,padding:"2px 8px",letterSpacing:1},
  primaryBtn:{background:"linear-gradient(135deg,#10B981,#059669)",color:"#fff",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,textDecoration:"none",border:"none",cursor:"pointer"},
  warningBtn:{background:"rgba(234,179,8,0.1)",border:"1px solid rgba(234,179,8,0.3)",color:"#eab308",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,textDecoration:"none"},
  tabs:{display:"flex",gap:4,padding:"16px 32px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"},
  tab:{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,padding:"10px 16px",cursor:"pointer",borderBottom:"2px solid transparent",marginBottom:-1},
  statsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",gap:12},
  statCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px 16px"},
  card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px"},
  cardHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.06)"},
  agentRow:{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  input:{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#fff",outline:"none"},
  agentGrid:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,padding:"24px 32px"},
  agentCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px"},
  agentCardActive:{borderColor:"rgba(34,197,94,0.25)",background:"rgba(34,197,94,0.04)"},
};
