"use client";
/**
 * app/dashboard/[slug]/trades/page.tsx
 * CrewwOS for Trades — skilled trades & contractor command center + Analytics
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface TradesProfile {
  id: string; business_name: string; trade_type?: string; logo_url?: string;
  onboarding_complete: boolean; onboarding_step: number;
  phone_number?: string; license_number?: string; plan: string;
}

const ACCENT = "#F59E0B";

const MOCK_STATS = [
  { label: "Open Jobs",       value: "—",  icon: "🔧", note: "Connect your job board" },
  { label: "Revenue (MTD)",   value: "$0", icon: "💰", note: "Log your invoices" },
  { label: "Estimates Sent",  value: "—",  icon: "📋", note: "EstimateAgent waiting" },
  { label: "Reviews (Avg)",   value: "—",  icon: "⭐", note: "Connect Google Business" },
  { label: "Jobs This Week",  value: "—",  icon: "📅", note: "Connect your calendar" },
];

const AGENT_FEED = [
  { agent: "Nia",            icon: "👑", action: "Your crew is ready — complete setup to activate",         time: "Waiting" },
  { agent: "EstimateAgent",  icon: "📋", action: "Auto-sends quotes & estimates to new leads",              time: "Waiting" },
  { agent: "InvoiceAgent",   icon: "🧾", action: "Creates and sends invoices when jobs are marked done",    time: "Waiting" },
  { agent: "FollowUpAgent",  icon: "🔁", action: "Follows up on estimates that haven't been accepted",      time: "Waiting" },
  { agent: "ReviewAgent",    icon: "⭐", action: "Asks for reviews after every completed job",              time: "Waiting" },
  { agent: "ScheduleAgent",  icon: "📅", action: "Connect your calendar to automate job scheduling",       time: "Waiting" },
];

export default function TradesDashboard() {
  const params = useParams();
  const slug = params?.slug as string ?? "";
  const base = `/dashboard/${slug}/trades`;
  const [profile, setProfile] = useState<TradesProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "agents">("overview");
  const [analyticsTab, setAnalyticsTab] = useState<"jobs" | "revenue" | "reviews" | "marketing">("jobs");

  useEffect(() => {
    fetch("/api/trades/onboard").then(r=>r.json())
      .then(d => { if(d.profile) setProfile(d.profile); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={S.centered}><div style={{ ...S.spinner,borderTopColor:ACCENT,borderColor:`${ACCENT}33` }} /><p style={{ color:"rgba(255,255,255,0.4)",marginTop:16,fontSize:14 }}>Loading your business...</p></div>;
  if (!profile) return (
    <div style={S.centered}>
      <div style={{ fontSize:48,marginBottom:16 }}>🔧</div>
      <h2 style={{ fontSize:22,fontWeight:700,marginBottom:8 }}>Set up your trades profile</h2>
      <p style={{ color:"rgba(255,255,255,0.5)",marginBottom:24,fontSize:14 }}>Complete onboarding to activate your crew.</p>
      <a href={`${base}/onboard`} style={{ ...S.primaryBtn,background:`linear-gradient(135deg,${ACCENT},#D97706)` }}>Start onboarding →</a>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{ display:"flex",alignItems:"center",gap:16 }}>
          <div style={{ ...S.avatar,background:`${ACCENT}22`,border:`1px solid ${ACCENT}44` }}>{profile.logo_url?<img src={profile.logo_url} alt={profile.business_name} style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:12 }} />:<span style={{ fontSize:28 }}>🔧</span>}</div>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <h1 style={{ fontSize:22,fontWeight:800,margin:0 }}>{profile.business_name}</h1>
              <span style={{ ...S.planBadge,color:ACCENT,background:`${ACCENT}18`,borderColor:`${ACCENT}40` }}>{profile.plan.toUpperCase()}</span>
            </div>
            <p style={{ fontSize:13,color:"rgba(255,255,255,0.45)",margin:"4px 0 0" }}>{profile.trade_type??"Skilled Trades"} · CrewwOS Trades</p>
          </div>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          {!profile.onboarding_complete&&<a href={`${base}/onboard`} style={S.warningBtn}>⚡ Complete setup ({profile.onboarding_step}/5)</a>}
          <a href={`${base}/jobs/new`} style={{ ...S.primaryBtn,background:`linear-gradient(135deg,${ACCENT},#D97706)` }}>+ New job</a>
        </div>
      </div>

      <div style={S.tabs}>
        {(["overview","analytics","agents"] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{ ...S.tab,...(activeTab===t?{ color:ACCENT,borderBottom:`2px solid ${ACCENT}`,marginBottom:-1 }:{}) }}>
            {t==="overview"?"📊 Overview":t==="analytics"?"📈 Analytics":"🤖 Agents"}
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

      {activeTab==="analytics"&&(
        <div style={{ padding:"24px 32px",display:"flex",flexDirection:"column",gap:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:16,background:`${ACCENT}0a`,border:`1px solid ${ACCENT}28`,borderRadius:12,padding:"16px 20px" }}>
            <span style={{ fontSize:20 }}>🔗</span>
            <div style={{ flex:1 }}>
              <strong style={{ fontSize:14 }}>Connect your tools for live job and revenue analytics</strong>
              <p style={{ margin:"4px 0 0",fontSize:12,color:"rgba(255,255,255,0.5)" }}>QuickBooks for revenue, Google Business for reviews, Jobber or ServiceTitan for job tracking.</p>
            </div>
            <a href={`/dashboard/${slug}/integrations`} style={{ background:ACCENT,color:"#000",fontWeight:700,fontSize:12,padding:"8px 16px",borderRadius:8,textDecoration:"none",whiteSpace:"nowrap" as const }}>Connect →</a>
          </div>

          <div style={{ display:"flex",gap:4,borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            {(["jobs","revenue","reviews","marketing"] as const).map(t=>(
              <button key={t} onClick={()=>setAnalyticsTab(t)} style={{ background:"none",border:"none",color:analyticsTab===t?ACCENT:"rgba(255,255,255,0.4)",fontSize:12,fontWeight:600,padding:"10px 14px",cursor:"pointer",borderBottom:analyticsTab===t?`2px solid ${ACCENT}`:"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap" as const }}>
                {t==="jobs"?"🔧 Jobs":t==="revenue"?"💰 Revenue":t==="reviews"?"⭐ Reviews":"📢 Marketing"}
              </button>
            ))}
          </div>

          {analyticsTab==="jobs"&&(
            <>
              <div style={S.statsGrid}>
                {[
                  { label:"Open Jobs",         value:"—",  icon:"🔧", note:"Active job orders",        color:ACCENT },
                  { label:"Jobs Completed (MTD)", value:"—",icon:"✅", note:"Finished this month",       color:"#22c55e" },
                  { label:"Avg Job Duration",   value:"—d", icon:"⏱️", note:"Days start to finish",     color:"#06B6D4" },
                  { label:"Estimate Win Rate",  value:"—%", icon:"📋", note:"Accepted ÷ Sent",          color:"#a855f7" },
                  { label:"Jobs Scheduled",     value:"—",  icon:"📅", note:"Upcoming this week",        color:ACCENT },
                  { label:"Callback Rate",      value:"—%", icon:"🔁", note:"Repeat customers",          color:"#22c55e" },
                ].map(s=><TradesStat key={s.label} {...s} />)}
              </div>
              <div style={S.card}>
                <div style={S.cardHeader}><span style={{ fontSize:14,fontWeight:700 }}>📊 Job Management Integrations</span></div>
                {[
                  { name:"Jobber",         icon:"🟢", desc:"Field service scheduling, estimates, invoices", url:"https://getjobber.com" },
                  { name:"ServiceTitan",   icon:"🔵", desc:"Enterprise service business management",        url:"https://servicetitan.com" },
                  { name:"Housecall Pro",  icon:"🟠", desc:"HVAC, plumbing, electrical field service",      url:"https://housecallpro.com" },
                  { name:"Google Calendar",icon:"🟡", desc:"Sync job schedule to your crew's calendars",    url:"https://calendar.google.com" },
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

          {analyticsTab==="revenue"&&(
            <>
              <div style={S.statsGrid}>
                {[
                  { label:"Revenue (MTD)",     value:"$—", icon:"💰", note:"Connect QuickBooks",        color:"#22c55e" },
                  { label:"Avg Job Value",      value:"$—", icon:"📋", note:"Revenue ÷ Jobs completed", color:ACCENT },
                  { label:"Outstanding",        value:"$—", icon:"🧾", note:"Unpaid invoices",           color:"#f59e0b" },
                  { label:"Expenses (MTD)",     value:"$—", icon:"📉", note:"Materials + labor",         color:"#ef4444" },
                ].map(s=><TradesStat key={s.label} {...s} />)}
              </div>
              <div style={S.card}>
                <div style={S.cardHeader}><span style={{ fontSize:14,fontWeight:700 }}>💰 Revenue by Service Type</span></div>
                {["Emergency/Urgent Calls","Scheduled Maintenance","Installations","Inspections","Repairs"].map(s=>(
                  <div key={s} style={{ display:"flex",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ flex:1,fontSize:13,color:"rgba(255,255,255,0.7)" }}>{s}</span>
                    <span style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.2)" }}>$— · —%</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {analyticsTab==="reviews"&&(
            <>
              <div style={S.statsGrid}>
                {[
                  { label:"Google Rating",     value:"—",  icon:"⭐", note:"Connect Google Business", color:"#eab308" },
                  { label:"Total Reviews",     value:"—",  icon:"💬", note:"All platforms",            color:ACCENT },
                  { label:"New Reviews (30d)", value:"—",  icon:"🆕", note:"Recent reviews",            color:"#22c55e" },
                  { label:"Response Rate",     value:"—%", icon:"💁", note:"Reviews you replied to",    color:"#06B6D4" },
                ].map(s=><TradesStat key={s.label} {...s} />)}
              </div>
              <div style={S.card}>
                <div style={S.cardHeader}><span style={{ fontSize:14,fontWeight:700 }}>📊 Review Platforms</span></div>
                {[
                  { name:"Google Business",  icon:"🟡", url:"https://business.google.com" },
                  { name:"Angi (Angie's List)", icon:"🟠", url:"https://pro.angi.com" },
                  { name:"HomeAdvisor",      icon:"🔵", url:"https://www.homeadvisor.com/account/" },
                  { name:"Yelp",             icon:"🔴", url:"https://biz.yelp.com" },
                  { name:"Nextdoor",         icon:"🟢", url:"https://business.nextdoor.com" },
                ].map(p=>(
                  <div key={p.name} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize:18 }}>{p.icon}</span>
                    <span style={{ flex:1,fontSize:13,fontWeight:600 }}>{p.name}</span>
                    <span style={{ fontSize:12,color:"rgba(255,255,255,0.2)" }}>— reviews</span>
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
                  { label:"Google Local Rank",  value:"—",  icon:"🗺️", note:"Position in local search",  color:ACCENT },
                  { label:"Profile Views (30d)", value:"—",  icon:"👁️", note:"Google Business views",     color:"#22c55e" },
                  { label:"Direction Requests",  value:"—",  icon:"📍", note:"Map navigation taps",        color:"#06B6D4" },
                  { label:"Website Clicks",      value:"—",  icon:"🌐", note:"From Google profile",        color:"#f59e0b" },
                ].map(s=><TradesStat key={s.label} {...s} />)}
              </div>
              <div style={S.card}>
                <div style={S.cardHeader}><span style={{ fontSize:14,fontWeight:700 }}>📢 Lead Generation Platforms</span></div>
                {[
                  { name:"Google Local Services Ads", icon:"🟡", desc:"Pay per qualified lead, verified contractor badge", url:"https://ads.google.com/local-services-ads" },
                  { name:"Angi Leads",                icon:"🟠", desc:"Homeowner job requests in your service area",        url:"https://pro.angi.com" },
                  { name:"Thumbtack",                 icon:"🔵", desc:"Quote requests from local homeowners",               url:"https://www.thumbtack.com/pro" },
                  { name:"Houzz Pro",                 icon:"🟤", desc:"Renovation & remodel project leads",                 url:"https://www.houzz.com/pro" },
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

      {activeTab==="agents"&&(
        <div style={S.agentGrid}>
          {[
            {icon:"👑",name:"Nia",role:"Chief of Staff",status:"active",desc:"Running your trades operations"},
            {icon:"📋",name:"EstimateAgent",role:"Estimating",status:"waiting",desc:"Sends quotes to new leads"},
            {icon:"🧾",name:"InvoiceAgent",role:"Billing",status:"waiting",desc:"Invoices customers on job completion"},
            {icon:"🔁",name:"FollowUpAgent",role:"Follow-Up",status:"waiting",desc:"Chases unsigned estimates"},
            {icon:"⭐",name:"ReviewAgent",role:"Reputation",status:"waiting",desc:"Requests reviews after every job"},
            {icon:"📅",name:"ScheduleAgent",role:"Scheduling",status:"waiting",desc:"Books jobs & dispatches crew"},
            {icon:"📲",name:"SocialAgent",role:"Social Media",status:"waiting",desc:"Before/after project posts"},
            {icon:"📧",name:"InboxAgent",role:"Comms",status:"waiting",desc:"Handles new job inquiries"},
            {icon:"🗺️",name:"LocalAgent",role:"Local SEO",status:"waiting",desc:"Ranks you higher on Google Maps"},
            {icon:"💰",name:"TaxAgent",role:"Finance",status:"waiting",desc:"Connect QuickBooks to activate"},
            {icon:"🔔",name:"AlertAgent",role:"Monitoring",status:"waiting",desc:"Watches reviews & job board"},
            {icon:"✍️",name:"CopyAgent",role:"Copywriter",status:"waiting",desc:"Job proposals & website copy"},
            {icon:"📈",name:"AdAgent",role:"Paid Media",status:"waiting",desc:"Google Local Service Ads"},
            {icon:"🤖",name:"ChatAgent",role:"Website Chat",status:"waiting",desc:"24/7 lead capture on your site"},
            {icon:"🎬",name:"VideoAgent",role:"Content",status:"waiting",desc:"Project walkthroughs & reels"},
            {icon:"🔍",name:"LeadAgent",role:"Lead Gen",status:"waiting",desc:"Finds homeowners in your area"},
            {icon:"📊",name:"ReportAgent",role:"Analytics",status:"waiting",desc:"Weekly revenue & job reports"},
            {icon:"⚖️",name:"LegalAgent",role:"Compliance",status:"active",desc:"License renewal tracker ready"},
            {icon:"🏷️",name:"PricingAgent",role:"Strategy",status:"waiting",desc:"Competitor pricing intel"},
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

function TradesStat({ label, value, icon, note, color }: { label: string; value: string; icon: string; note: string; color: string }) {
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
  spinner:{width:36,height:36,border:"3px solid rgba(245,158,11,0.2)",borderTop:"3px solid #F59E0B",borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"28px 32px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap",gap:16},
  avatar:{width:56,height:56,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"},
  planBadge:{fontSize:10,fontWeight:700,borderRadius:4,padding:"2px 8px",letterSpacing:1},
  primaryBtn:{color:"#fff",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,textDecoration:"none",border:"none",cursor:"pointer"},
  warningBtn:{background:"rgba(234,179,8,0.1)",border:"1px solid rgba(234,179,8,0.3)",color:"#eab308",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:8,textDecoration:"none"},
  tabs:{display:"flex",gap:4,padding:"16px 32px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"},
  tab:{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:600,padding:"10px 16px",cursor:"pointer",borderBottom:"2px solid transparent",marginBottom:-1},
  statsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",gap:12},
  statCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px 16px"},
  card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px"},
  cardHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.06)"},
  agentRow:{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  agentGrid:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,padding:"24px 32px"},
  agentCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px"},
  agentCardActive:{borderColor:"rgba(34,197,94,0.25)",background:"rgba(34,197,94,0.04)"},
};
