"use client";
/**
 * app/dashboard/[slug]/ecommerce/page.tsx
 * CrewwOS for E-Commerce — online store command center
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface EcommerceProfile {
  id: string; store_name: string; platform?: string; logo_url?: string;
  onboarding_complete: boolean; onboarding_step: number;
  store_url?: string; plan: string;
}

const ACCENT = "#8B5CF6"; // purple for ecommerce

const MOCK_STATS = [
  { label: "Orders Today",    value: "—",  icon: "📦", note: "Connect Shopify/WooCommerce" },
  { label: "Revenue (Today)", value: "$0", icon: "💰", note: "Connect your store" },
  { label: "Abandoned Carts", value: "—",  icon: "🛒", note: "RecoverAgent waiting" },
  { label: "Avg Rating",      value: "—",  icon: "⭐", note: "Connect review platform" },
  { label: "Inventory Alerts",value: "—",  icon: "⚠️", note: "Connect inventory" },
];

const AGENT_FEED = [
  { agent: "Nia",           icon: "👑", action: "Your crew is ready — complete setup to activate",        time: "Waiting" },
  { agent: "OrderAgent",    icon: "📦", action: "Connect your store to start tracking orders",            time: "Waiting" },
  { agent: "RecoverAgent",  icon: "🛒", action: "Recovers abandoned carts automatically via email/SMS",  time: "Waiting" },
  { agent: "SocialAgent",   icon: "📲", action: "Product drops, UGC, and daily content",                 time: "Waiting" },
  { agent: "ReviewAgent",   icon: "⭐", action: "Monitors and responds to product reviews",              time: "Waiting" },
  { agent: "AdAgent",       icon: "📈", action: "Connect Meta Ads to optimize campaigns",                time: "Waiting" },
];

export default function EcommerceDashboard() {
  const params = useParams();
  const slug = params?.slug as string ?? "";
  const base = `/dashboard/${slug}/ecommerce`;
  const [profile, setProfile] = useState<EcommerceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "agents">("overview");

  useEffect(() => {
    fetch("/api/ecommerce/onboard").then(r=>r.json())
      .then(d => { if(d.profile) setProfile(d.profile); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.centered}><div style={{ ...S.spinner,borderTopColor:ACCENT,borderColor:`${ACCENT}33` }} /><p style={{ color:"rgba(255,255,255,0.4)",marginTop:16,fontSize:14 }}>Loading your store...</p></div>;
  if (!profile) return (
    <div style={S.centered}>
      <div style={{ fontSize:48,marginBottom:16 }}>🛍️</div>
      <h2 style={{ fontSize:22,fontWeight:700,marginBottom:8 }}>Set up your store profile</h2>
      <p style={{ color:"rgba(255,255,255,0.5)",marginBottom:24,fontSize:14 }}>Complete onboarding to activate your crew.</p>
      <a href={`${base}/onboard`} style={{ ...S.primaryBtn,background:`linear-gradient(135deg,${ACCENT},#7C3AED)` }}>Start onboarding →</a>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{ display:"flex",alignItems:"center",gap:16 }}>
          <div style={{ ...S.avatar,background:`${ACCENT}22`,border:`1px solid ${ACCENT}44` }}>{profile.logo_url?<img src={profile.logo_url} alt={profile.store_name} style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:12 }} />:<span style={{ fontSize:28 }}>🛍️</span>}</div>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <h1 style={{ fontSize:22,fontWeight:800,margin:0 }}>{profile.store_name}</h1>
              <span style={{ ...S.planBadge,color:ACCENT,background:`${ACCENT}18`,borderColor:`${ACCENT}40` }}>{profile.plan.toUpperCase()}</span>
            </div>
            <p style={{ fontSize:13,color:"rgba(255,255,255,0.45)",margin:"4px 0 0" }}>{profile.platform??"Online Store"} · CrewwOS E-Commerce</p>
          </div>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          {!profile.onboarding_complete&&<a href={`${base}/onboard`} style={S.warningBtn}>⚡ Complete setup ({profile.onboarding_step}/5)</a>}
          <a href={`${base}/products`} style={{ ...S.primaryBtn,background:`linear-gradient(135deg,${ACCENT},#7C3AED)` }}>+ Add product</a>
        </div>
      </div>

      <div style={S.tabs}>
        {(["overview","agents"] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{ ...S.tab,...(activeTab===t?{ ...S.tabActive,color:ACCENT,borderBottomColor:ACCENT }:{}) }}>
            {t==="overview"?"📊 Overview":"🤖 Agents"}
          </button>
        ))}
      </div>

      {activeTab==="overview"&&(
        <div>
          <div style={S.statsGrid}>{MOCK_STATS.map(s=>(<div key={s.label} style={S.statCard}><div style={{ fontSize:24,marginBottom:8 }}>{s.icon}</div><div style={{ fontSize:28,fontWeight:800 }}>{s.value}</div><div style={{ fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.6)",margin:"4px 0 6px" }}>{s.label}</div><div style={{ fontSize:11,color:`${ACCENT}cc` }}>{s.note}</div></div>))}</div>
          <div style={{ ...S.card,margin:"16px 32px" }}>
            <div style={S.cardHeader}><span style={{ fontSize:16,fontWeight:700 }}>🤖 Agent Activity</span></div>
            {AGENT_FEED.map(a=>(<div key={a.agent} style={S.agentRow}><span style={{ fontSize:20 }}>{a.icon}</span><div style={{ flex:1 }}><span style={{ fontSize:12,fontWeight:700,color:ACCENT }}>{a.agent}</span><span style={{ fontSize:13,color:"rgba(255,255,255,0.7)",marginLeft:8 }}>{a.action}</span></div><span style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>{a.time}</span></div>))}
          </div>
        </div>
      )}
      {activeTab==="agents"&&(
        <div style={S.agentGrid}>
          {[
            {icon:"👑",name:"Nia",role:"Chief of Staff",status:"active",desc:"Running your store operations"},
            {icon:"📦",name:"OrderAgent",role:"Order Management",status:"waiting",desc:"Tracks & processes all orders"},
            {icon:"🛒",name:"RecoverAgent",role:"Cart Recovery",status:"waiting",desc:"Recovers abandoned carts 24/7"},
            {icon:"📲",name:"SocialAgent",role:"Social Media",status:"waiting",desc:"Product launches & UGC content"},
            {icon:"⭐",name:"ReviewAgent",role:"Reputation",status:"waiting",desc:"Monitors & replies to reviews"},
            {icon:"📈",name:"AdAgent",role:"Paid Media",status:"waiting",desc:"Meta & Google Ads optimizer"},
            {icon:"✍️",name:"CopyAgent",role:"Copywriter",status:"waiting",desc:"Product descriptions & emails"},
            {icon:"📧",name:"InboxAgent",role:"Comms",status:"waiting",desc:"Customer support & inquiries"},
            {icon:"📊",name:"ReportAgent",role:"Analytics",status:"waiting",desc:"Daily sales & conversion reports"},
            {icon:"🔔",name:"AlertAgent",role:"Monitoring",status:"waiting",desc:"Inventory low & refund alerts"},
            {icon:"🎬",name:"VideoAgent",role:"Content",status:"waiting",desc:"Product videos & unboxing reels"},
            {icon:"🔁",name:"RetentionAgent",role:"Loyalty",status:"waiting",desc:"Re-engages past customers"},
            {icon:"💰",name:"TaxAgent",role:"Finance",status:"waiting",desc:"Connect QuickBooks to activate"},
            {icon:"🗺️",name:"SEOAgent",role:"SEO",status:"waiting",desc:"Product & collection page SEO"},
            {icon:"🤖",name:"ChatAgent",role:"Live Chat",status:"waiting",desc:"AI chat on your storefront"},
            {icon:"🎯",name:"UpsellAgent",role:"Revenue",status:"waiting",desc:"Post-purchase upsell flows"},
            {icon:"⚖️",name:"LegalAgent",role:"Compliance",status:"active",desc:"Terms & privacy policy ready"},
            {icon:"🧾",name:"InvoiceAgent",role:"Billing",status:"waiting",desc:"Wholesale & B2B invoices"},
            {icon:"📦",name:"FulfillAgent",role:"Fulfillment",status:"waiting",desc:"Connect 3PL to activate"},
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

const S: Record<string,React.CSSProperties> = {
  page:{background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",padding:"0 0 80px"},
  centered:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",padding:"80px 32px"},
  spinner:{width:36,height:36,border:"3px solid rgba(139,92,246,0.2)",borderTop:"3px solid #8B5CF6",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"28px 32px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap",gap:16},
  avatar:{width:56,height:56,borderRadius:12,background:"rgba(139,92,246,0.15)",border:"1px solid rgba(139,92,246,0.3)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"},
  planBadge:{fontSize:10,fontWeight:700,borderRadius:4,padding:"2px 8px",letterSpacing:1},
  primaryBtn:{color:"#fff",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,textDecoration:"none",border:"none",cursor:"pointer"},
  warningBtn:{background:"rgba(234,179,8,0.1)",border:"1px solid rgba(234,179,8,0.3)",color:"#eab308",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,textDecoration:"none"},
  tabs:{display:"flex",gap:4,padding:"16px 32px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"},
  tab:{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,padding:"10px 16px",cursor:"pointer",borderBottom:"2px solid transparent",marginBottom:-1},
  tabActive:{borderBottom:"2px solid"},
  statsGrid:{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:12,padding:"24px 32px 0"},
  statCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px 16px"},
  card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px"},
  cardHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.06)"},
  agentRow:{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  agentGrid:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,padding:"24px 32px"},
  agentCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px"},
  agentCardActive:{borderColor:"rgba(34,197,94,0.25)",background:"rgba(34,197,94,0.04)"},
};
