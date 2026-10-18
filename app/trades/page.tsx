// app/trades/page.tsx — CrewwOS for Trades
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "CrewwOS for Trades — 19 AI Agents for Contractors & Tradespeople",
  description:
    "Automate quotes, job scheduling, follow-up, and review collection with 19 AI agents built for electricians, plumbers, HVAC, and general contractors. Plans from $297/mo.",
};

export default async function TradesPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const ACCENT = "#10b981";
  const ACCENT_RGB = "16,185,129";

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
          For electricians, plumbers, HVAC, and contractors
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px" }}>
          Your tools are in the truck.<br />
          <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #059669)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Your crew is in the cloud.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.7 }}>
          19 AI agents that send quotes, schedule jobs, follow up on estimates, collect reviews, and manage your inbox — so you can stay on the job site instead of the phone.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
          <Link href="/sign-up" style={{ background: ACCENT, color: "#000", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>Start free trial →</Link>
          <a href="#pricing" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>See pricing</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {[["19","AI agents on your crew"],["<5min","Quote response time"],["24/7","Lead follow-up, never stops"],["$0","Per-job or per-lead fees"]].map(([n,l]) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "24px 16px", background: "rgba(6,6,18,0.8)" }}>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{n}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: ACCENT, margin: "0 0 16px" }}>What your crew handles</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>Everything except the actual work.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 600, lineHeight: 1.7, margin: "0 0 56px" }}>The average tradesperson loses 20% of their revenue to missed calls, slow follow-up, and forgotten reviews. CrewwOS closes every gap.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {TRADES_SERVICES.map((s) => (
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

      {/* Agents */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto", background: `rgba(${ACCENT_RGB},0.03)`, borderTop: `1px solid rgba(${ACCENT_RGB},0.08)`, borderBottom: `1px solid rgba(${ACCENT_RGB},0.08)` }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: ACCENT, margin: "0 0 16px" }}>Your AI team</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 56px" }}>19 agents. Built for the trades.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {TRADES_AGENTS.map((a) => (
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
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px", textAlign: "center" }}>One job pays for a year.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 520, lineHeight: 1.7, margin: "0 auto 56px", textAlign: "center" }}>No per-lead fees. No job cuts. Flat monthly rate that pays for itself on the first booking it closes.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {TRADES_PLANS.map((p) => (
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
          Your leads don&apos;t wait.<br />
          <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #059669)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Neither does your crew.</span>
        </h2>
        <Link href="/sign-up" style={{ display: "inline-block", background: ACCENT, color: "#000", fontWeight: 700, fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none" }}>Start free trial →</Link>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>14-day free trial · No per-job fees · Cancel anytime</p>
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

const TRADES_SERVICES = [
  { icon: "📋", title: "Quote & Estimate Automation", desc: "Every inbound job request gets a fast, professional quote response. Your QuoteAgent collects job details and sends estimates the same day.", bullets: ["Instant quote request response","Job scoping follow-up questions","Estimate follow-up after 48 hours","Win/loss tracking per quote"] },
  { icon: "📅", title: "Job Scheduling & Dispatch", desc: "Books jobs, syncs your calendar, sends confirmation texts to homeowners, and gives your crew a daily job sheet — all automated.", bullets: ["Online booking and calendar sync","Job confirmation and reminder texts","Crew dispatch summaries","Reschedule handling"] },
  { icon: "📞", title: "Lead Follow-Up & Nurture", desc: "Never let a warm lead go cold. Your crew follows up on every inquiry, estimate, and past customer until they book or opt out.", bullets: ["Same-day response to every inquiry","Multi-touch follow-up sequences","Seasonal re-engagement campaigns","Lost lead re-activation"] },
  { icon: "⭐", title: "Review & Reputation Engine", desc: "After every completed job, your ReviewAgent texts the homeowner and asks for a Google review. More 5-stars, less chasing.", bullets: ["Post-job review request texts","Google + Yelp + Angi coverage","Negative review alerts","Monthly reputation report"] },
  { icon: "💰", title: "Invoice & Payment Follow-Up", desc: "Sends invoices, follows up on unpaid balances, and tracks what's owed — so you collect faster without the awkward conversations.", bullets: ["Automated invoice sends","Payment reminder sequences","Overdue balance follow-up","Monthly AR summary"] },
  { icon: "📣", title: "Marketing & Local Outreach", desc: "Keeps your brand visible with social posts, seasonal promotions, referral campaigns, and outreach to local property managers and real estate agents.", bullets: ["Weekly social media posts","Seasonal promotion campaigns","Referral program outreach","Property manager partnerships"] },
];

const TRADES_AGENTS = [
  { icon: "👑", name: "Nia",           role: "Chief of Staff",     desc: "Coordinates your entire trades crew" },
  { icon: "📋", name: "QuoteAgent",    role: "Estimates",          desc: "Responds to job requests and sends quotes" },
  { icon: "📅", name: "ScheduleAgent", role: "Job Scheduling",     desc: "Books jobs and manages the calendar" },
  { icon: "📞", name: "LeadAgent",     role: "Lead Response",      desc: "Responds to every inbound inquiry fast" },
  { icon: "🔁", name: "FollowUpAgent", role: "Follow-Up",          desc: "Follows up on estimates until they book" },
  { icon: "✉️", name: "InboxAgent",    role: "Inbox Management",   desc: "Sorts and routes all messages" },
  { icon: "💬", name: "TextAgent",     role: "SMS",                desc: "Manages all text communication" },
  { icon: "⭐", name: "ReviewAgent",   role: "Reputation",         desc: "Requests reviews after every job" },
  { icon: "💰", name: "InvoiceAgent",  role: "Billing",            desc: "Sends invoices and follows up on payments" },
  { icon: "🤖", name: "ChatAgent",     role: "Website Chat",       desc: "Qualifies job requests 24/7 from your site" },
  { icon: "📲", name: "SocialAgent",   role: "Content",            desc: "Posts project photos and tips weekly" },
  { icon: "🏠", name: "PMAgent",       role: "Property Mgrs",      desc: "Outreaches to property management companies" },
  { icon: "🔧", name: "ServiceAgent",  role: "Service Plans",      desc: "Sells and manages maintenance contracts" },
  { icon: "🎁", name: "ReferralAgent", role: "Referrals",          desc: "Runs referral programs with past clients" },
  { icon: "🗂️", name: "CRMAgent",     role: "Customer DB",        desc: "Keeps all customer records organized" },
  { icon: "📊", name: "ReportAgent",   role: "Business Intel",     desc: "Weekly revenue and pipeline reports" },
  { icon: "✍️", name: "CopyAgent",     role: "Copywriter",         desc: "Ad copy, email promos, and service pages" },
  { icon: "📣", name: "AdAgent",       role: "Paid Ads",           desc: "Google Local Services and Facebook ads" },
  { icon: "🚀", name: "OnboardAgent",  role: "New Customers",      desc: "Walks new clients through your process" },
];

const TRADES_PLANS = [
  { name: "Solo", price: "$297", featured: false, desc: "For solo tradespeople and owner-operators.", feats: ["QuoteAgent + ScheduleAgent + LeadAgent","Nia coordinator","Review request automation","Invoice follow-up","Weekly pipeline report"] },
  { name: "Crew", price: "$697", featured: true, desc: "For small crews ready to grow their book.", feats: ["Everything in Solo","ReviewAgent + FollowUpAgent + ServiceAgent","ReferralAgent + InboxAgent + TextAgent","Maintenance contract selling","Referral program automation","Monthly revenue report"] },
  { name: "Company", price: "$1,497", featured: false, desc: "For established contractors scaling up.", feats: ["Everything in Crew","All 19 agents active","PMAgent + AdAgent + SocialAgent","Property manager outreach","Google Local Services ads","Multi-crew scheduling"] },
  { name: "Enterprise", price: "$2,497", featured: false, desc: "For large contractors and multi-trade businesses.", feats: ["Everything in Company","Unlimited job types","Multi-location support","Custom workflow setup","White-label client portal","Dedicated account manager"] },
];
