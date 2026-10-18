// app/real-estate/page.tsx — CrewwOS for Real Estate
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "CrewwOS for Real Estate — 19 AI Agents for Agents & Brokerages",
  description:
    "Automate lead follow-up, listing outreach, showing scheduling, and market reports with 19 AI agents built for real estate professionals. Plans from $397/mo.",
};

export default async function RealEstatePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const ACCENT = "#f59e0b";
  const ACCENT_RGB = "245,158,11";

  return (
    <main style={{ minHeight: "100vh", background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>
      <div style={{ position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: `radial-gradient(ellipse, rgba(${ACCENT_RGB},0.10) 0%, rgba(${ACCENT_RGB},0.04) 40%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} aria-hidden />

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 64, background: "rgba(6,6,18,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00d8c0, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000" }}>C</span>
          CrewwOS
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textDecoration: "none" }}>← All verticals</Link>
          <Link href="/sign-in" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}>Log in</Link>
          <Link href="/sign-up" style={{ background: ACCENT, color: "#000", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Get started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "100px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(${ACCENT_RGB},0.1)`, border: `1px solid rgba(${ACCENT_RGB},0.25)`, borderRadius: 99, padding: "6px 16px", fontSize: 13, color: ACCENT, marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, animation: "pulse 2s ease-in-out infinite", display: "inline-block" }} />
          19 AI agents for real estate agents & brokerages
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px" }}>
          Close more deals.<br />
          <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #f97316)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Chase fewer leads.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.7 }}>
          19 AI agents that follow up with every lead, schedule showings, pitch listings, generate market reports, and keep your pipeline full — so you can stay in front of buyers and sellers instead of your inbox.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
          <Link href="/sign-up" style={{ background: ACCENT, color: "#000", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>Start free trial →</Link>
          <a href="#pricing" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>See pricing</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {[["19","AI agents on your team"],["5min","Avg lead response time"],["24/7","Pipeline always moving"],["$0","Per-lead or per-close fees"]].map(([n,l]) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "24px 16px", background: "rgba(6,6,18,0.8)" }}>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{n}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* What your agents do */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: ACCENT, margin: "0 0 16px" }}>What your crew handles</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>Every part of real estate that isn't showing a house.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 600, lineHeight: 1.7, margin: "0 0 56px" }}>The average agent spends 60% of their time on tasks that don't generate commissions. CrewwOS handles all of it.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {RE_SERVICES.map((s) => (
            <div key={s.title} style={{ background: `rgba(${ACCENT_RGB},0.04)`, border: `1px solid rgba(${ACCENT_RGB},0.12)`, borderRadius: 16, padding: "24px" }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 12 }}>{s.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {s.bullets.map((b) => (
                  <div key={b} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", gap: 6 }}>
                    <span style={{ color: ACCENT }}>→</span>{b}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent roster */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto", background: `rgba(${ACCENT_RGB},0.03)`, borderTop: `1px solid rgba(${ACCENT_RGB},0.08)`, borderBottom: `1px solid rgba(${ACCENT_RGB},0.08)` }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: ACCENT, margin: "0 0 16px" }}>Your AI team</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 56px" }}>19 agents. Built for real estate.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {RE_AGENTS.map((a) => (
            <div key={a.name} style={{ background: `rgba(${ACCENT_RGB},0.05)`, border: `1px solid rgba(${ACCENT_RGB},0.15)`, borderRadius: 12, padding: "16px 14px" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: ACCENT, marginBottom: 6 }}>{a.role}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: ACCENT, margin: "0 0 16px", textAlign: "center" }}>Pricing</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px", textAlign: "center" }}>One closed deal pays for a year.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 520, lineHeight: 1.7, margin: "0 auto 56px", textAlign: "center" }}>No per-lead fees. No commission cuts. Flat monthly rate and every dollar you earn stays yours.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {RE_PLANS.map((p) => (
            <div key={p.name} style={{ background: p.featured ? `rgba(${ACCENT_RGB},0.1)` : "rgba(255,255,255,0.03)", border: `1px solid ${p.featured ? `rgba(${ACCENT_RGB},0.4)` : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "28px 24px", position: "relative" }}>
              {p.featured && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: ACCENT, color: "#000", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99, whiteSpace: "nowrap" }}>Most popular</div>}
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: p.featured ? ACCENT : "rgba(255,255,255,0.5)", marginBottom: 12 }}>{p.name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px", marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>/month</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.5 }}>{p.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {p.feats.map((f) => (
                  <div key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", gap: 8 }}>
                    <span style={{ color: ACCENT, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <Link href="/sign-up" style={{ display: "block", textAlign: "center", background: p.featured ? ACCENT : "rgba(255,255,255,0.07)", color: p.featured ? "#000" : "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, textDecoration: "none" }}>Get started →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1.5px", margin: "0 0 20px" }}>
          Your pipeline doesn't<br />
          <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #f97316)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>sleep. Neither does your crew.</span>
        </h2>
        <Link href="/sign-up" style={{ display: "inline-block", background: ACCENT, color: "#000", fontWeight: 700, fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none" }}>Start free trial →</Link>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>14-day free trial · No commission cuts · Cancel anytime</p>
      </section>

      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
        <span>© 2026 CrewwOS · M.A.D.E Technologies Inc.</span>
        <div style={{ display: "flex", gap: 24 }}>
          {[["Hub","/"],["Business","/business"],["Artists","/artists"],["Login","/sign-in"]].map(([l,h]) => (
            <Link key={l} href={h} style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </main>
  );
}

const RE_SERVICES = [
  { icon: "📞", title: "Lead Response & Follow-Up", desc: "Every inbound lead gets a response in under 5 minutes — even at midnight. Your agents follow up until they book, buy, or opt out.", bullets: ["Instant SMS + email on every new lead","Multi-touch follow-up sequences","Lead scoring and pipeline updates","Never lets a lead go cold"] },
  { icon: "🏠", title: "Listing Outreach & Marketing", desc: "New listing? Your agents email your database, post to social, send just-listed postcards, and pitch to buyer's agents in your market.", bullets: ["Just-listed email campaigns","Social post creation and scheduling","Buyer's agent outreach","Open house announcements"] },
  { icon: "📅", title: "Showing Coordination", desc: "Buyers request a showing, your agent checks availability, confirms the appointment, sends reminders, and follows up after — all automated.", bullets: ["24/7 showing request handling","Calendar sync and confirmations","Pre-showing and day-of reminders","Post-showing feedback collection"] },
  { icon: "📊", title: "Market Reports & CMAs", desc: "Your ReportAgent generates branded market updates and CMAs for seller prospects so you always have something worth sending to your sphere.", bullets: ["Monthly neighborhood market reports","CMA summary generation","Rate update alerts to your list","Branded PDF reports"] },
  { icon: "⭐", title: "Review & Referral Engine", desc: "After every closing, your agents request Google reviews, send referral ask sequences, and keep past clients engaged so they send you business.", bullets: ["Post-closing review requests","Referral sequence automation","Annual anniversary check-ins","Sphere nurture campaigns"] },
  { icon: "🔁", title: "Sphere of Influence Nurture", desc: "Your database is your biggest asset. CrewwOS keeps you top of mind with consistent, personal-feeling outreach — birthday texts, market updates, holiday notes.", bullets: ["Birthday and anniversary messages","Monthly value-add emails","Market shift alerts","Holiday and seasonal touchpoints"] },
];

const RE_AGENTS = [
  { icon: "👑", name: "Nia",           role: "Chief of Staff",      desc: "Coordinates your entire real estate crew" },
  { icon: "📞", name: "LeadAgent",     role: "Lead Response",       desc: "Responds to every inbound lead in minutes" },
  { icon: "🔁", name: "FollowUpAgent", role: "Pipeline",            desc: "Multi-touch follow-up until they're ready" },
  { icon: "📅", name: "ShowingAgent",  role: "Scheduling",          desc: "Books, confirms, and follows up on showings" },
  { icon: "🏠", name: "ListingAgent",  role: "Listing Marketing",   desc: "Promotes new listings across all channels" },
  { icon: "✍️", name: "CopyAgent",     role: "Copywriter",          desc: "Listing descriptions, emails, and social posts" },
  { icon: "📊", name: "ReportAgent",   role: "Market Intelligence", desc: "CMAs, market updates, and rate alerts" },
  { icon: "⭐", name: "ReviewAgent",   role: "Reputation",          desc: "Collects reviews and referrals after closing" },
  { icon: "✉️", name: "InboxAgent",    role: "Inbox Management",    desc: "Manages and routes all email inquiries" },
  { icon: "💬", name: "TextAgent",     role: "SMS",                 desc: "Handles all text communication with leads" },
  { icon: "🤖", name: "ChatAgent",     role: "Website Chat",        desc: "Qualifies leads from your website 24/7" },
  { icon: "📲", name: "OutreachAgent", role: "Prospecting",         desc: "Cold outreach to FSBOs, expireds, and buyers" },
  { icon: "🗂️", name: "CRMAgent",     role: "Database",            desc: "Keeps your contacts organized and current" },
  { icon: "🚀", name: "OnboardAgent",  role: "Client Experience",   desc: "Walks new clients through your process" },
  { icon: "💰", name: "InvoiceAgent",  role: "Commission Tracking", desc: "Tracks pending commissions and disbursements" },
  { icon: "🎬", name: "VideoAgent",    role: "Content",             desc: "Creates listing walk-through and market videos" },
  { icon: "📄", name: "BrochureAgent", role: "Print & Digital",     desc: "Listing flyers, buyer guides, and seller packets" },
  { icon: "👂", name: "ListenAgent",   role: "Market Watch",        desc: "Monitors price drops, new listings, and trends" },
  { icon: "📈", name: "AdAgent",       role: "Paid Ads",            desc: "Runs Facebook and Google ads for your listings" },
];

const RE_PLANS = [
  { name: "Solo Agent", price: "$397", featured: false, desc: "For individual agents who want the basics running.", feats: ["LeadAgent + FollowUpAgent + ShowingAgent","Nia coordinator","Review request automation","Sphere nurture campaigns","Weekly pipeline report"] },
  { name: "Top Producer", price: "$897", featured: true, desc: "For high-volume agents who need full pipeline coverage.", feats: ["Everything in Solo","ListingAgent + CopyAgent + ReportAgent","CRMAgent + OutreachAgent + ReviewAgent","Listing marketing campaigns","FSBO/expired prospecting","Monthly CMA generator"] },
  { name: "Team", price: "$1,797", featured: false, desc: "For agent teams running multiple agents under one roof.", feats: ["Everything in Top Producer","All 19 agents active","VideoAgent + AdAgent + BrochureAgent","Paid listing ad campaigns","Multi-agent dashboard","Priority support"] },
  { name: "Brokerage", price: "$2,997", featured: false, desc: "For brokerages managing an entire roster of agents.", feats: ["Everything in Team","Unlimited agent profiles","Brokerage-level reporting","White-label client portals","Custom workflow setup","Dedicated account manager"] },
];
