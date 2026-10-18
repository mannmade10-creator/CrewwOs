// app/business/page.tsx — CrewwOS for Business
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "CrewwOS for Business — 19 AI Agents for Local & Service Businesses",
  description:
    "Automate your phones, sales, scheduling, reviews, and operations with 19 AI agents built for local and service businesses. Plans from $297/mo.",
};

export default async function BusinessPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main style={{ minHeight: "100vh", background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: "radial-gradient(ellipse, rgba(59,130,246,0.10) 0%, rgba(0,212,255,0.05) 40%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} aria-hidden />

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 64, background: "rgba(6,6,18,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00d8c0, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000" }}>C</span>
          CrewwOS
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textDecoration: "none" }}>← All verticals</Link>
          <Link href="/sign-in" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}>Log in</Link>
          <Link href="/sign-up" style={{ background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Get started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "100px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 99, padding: "6px 16px", fontSize: 13, color: "#3b82f6", marginBottom: 32, letterSpacing: "0.3px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", animation: "pulse 2s ease-in-out infinite", display: "inline-block" }} />
          19 AI agents for local & service businesses
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px" }}>
          Your business, running<br />
          <span style={{ background: "linear-gradient(135deg, #3b82f6, #00D4FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>24/7 on autopilot.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.7 }}>
          19 AI agents that answer your phones, follow up with leads, collect reviews, send quotes, and run your back office — while you focus on the work.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
          <Link href="/sign-up" style={{ background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>Start free trial →</Link>
          <a href="#pricing" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>See pricing</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {[["19","AI agents included"],["<5min","Time to go live"],["24/7","Always running"],["$0","Per-lead fees"]].map(([n,l]) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "24px 16px", background: "rgba(6,6,18,0.8)" }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{n}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Roster */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#3b82f6", margin: "0 0 16px" }}>Your crew</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>19 agents. Every department.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 580, lineHeight: 1.7, margin: "0 0 56px" }}>
          From answering the phone at 2am to sending a quote in under a minute — your CrewwOS agents cover every touchpoint of your business.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {BIZ_AGENTS.map((a) => (
            <div key={a.name} style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "16px 14px" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto", background: "rgba(59,130,246,0.03)", borderTop: "1px solid rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(59,130,246,0.08)" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#3b82f6", margin: "0 0 16px", textAlign: "center" }}>Who it's for</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px", textAlign: "center" }}>Built for businesses like yours.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 560, lineHeight: 1.7, margin: "0 auto 56px", textAlign: "center" }}>
          If you take calls, send quotes, collect reviews, and manage a schedule — CrewwOS was made for you.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {USE_CASES.map((u) => (
            <div key={u.title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px" }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{u.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{u.title}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{u.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#3b82f6", margin: "0 0 16px", textAlign: "center" }}>Pricing</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px", textAlign: "center" }}>Less than one employee.<br />More than a whole team.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 520, lineHeight: 1.7, margin: "0 auto 56px", textAlign: "center" }}>
          The average employee costs $40,000/yr. Your crew of 19 AI agents costs a fraction of that.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {BIZ_PLANS.map((p) => (
            <div key={p.name} style={{ background: p.featured ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${p.featured ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "28px 24px", position: "relative" }}>
              {p.featured && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99, whiteSpace: "nowrap" }}>Most popular</div>}
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: p.featured ? "#3b82f6" : "rgba(255,255,255,0.5)", marginBottom: 12 }}>{p.name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px", marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>/month</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.5 }}>{p.desc}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>UP TO {p.agents} AGENTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {p.feats.map((f) => (
                  <div key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#3b82f6", flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <Link href="/sign-up" style={{ display: "block", textAlign: "center", background: p.featured ? "#3b82f6" : "rgba(255,255,255,0.07)", color: p.featured ? "#fff" : "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, textDecoration: "none" }}>
                Get started →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1.5px", margin: "0 0 20px" }}>
          Your competitors are already<br />
          <span style={{ background: "linear-gradient(135deg, #3b82f6, #00D4FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>automating. Are you?</span>
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: "0 0 40px" }}>
          Get your crew live in under 10 minutes. No contracts. Cancel anytime.
        </p>
        <Link href="/sign-up" style={{ display: "inline-block", background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none" }}>
          Start your free trial →
        </Link>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>14-day free trial · No credit card required</p>
      </section>

      {/* Footer */}
      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
        <span>© 2026 CrewwOS · M.A.D.E Technologies Inc.</span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Hub</Link>
          <Link href="/artists" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Artists</Link>
          <Link href="/sign-in" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Login</Link>
        </div>
      </footer>
    </main>
  );
}

/* ── Data ── */
const BIZ_AGENTS = [
  { icon: "👑", name: "Nia",         desc: "Chief of Staff — coordinates your entire crew" },
  { icon: "📞", name: "PhoneAgent",  desc: "Answers calls 24/7, takes messages, books appointments" },
  { icon: "💬", name: "TextAgent",   desc: "Sends and responds to SMS automatically" },
  { icon: "✉️", name: "InboxAgent",  desc: "Manages your email inbox and replies" },
  { icon: "🤖", name: "ChatAgent",   desc: "Handles website chat and DM questions" },
  { icon: "📲", name: "OutreachAgent", desc: "Sends personalized outreach to new prospects" },
  { icon: "🔁", name: "FollowUpAgent", desc: "Follows up with leads until they respond or opt out" },
  { icon: "📋", name: "QuoteAgent",  desc: "Generates and sends quotes in under a minute" },
  { icon: "⭐", name: "ReviewAgent", desc: "Requests and manages Google & Yelp reviews" },
  { icon: "🗂️", name: "CRMAgent",   desc: "Keeps your customer records current and organized" },
  { icon: "📅", name: "ScheduleAgent", desc: "Books, confirms, and reschedules appointments" },
  { icon: "💰", name: "InvoiceAgent", desc: "Sends invoices and follows up on payments" },
  { icon: "🚀", name: "OnboardAgent", desc: "Walks new clients through your onboarding process" },
  { icon: "📊", name: "ReportAgent", desc: "Delivers weekly performance summaries to your inbox" },
  { icon: "📦", name: "SupplyAgent", desc: "Tracks inventory and reorders supplies automatically" },
  { icon: "🎬", name: "VideoAgent",  desc: "Creates short-form video content for social media" },
  { icon: "✍️", name: "CopyAgent",   desc: "Writes emails, posts, and marketing copy" },
  { icon: "📄", name: "BrochureAgent", desc: "Generates service menus, flyers, and PDFs" },
  { icon: "👂", name: "ListenAgent", desc: "Monitors mentions, reviews, and social buzz" },
];

const USE_CASES = [
  { icon: "🧹", title: "Cleaning & Janitorial",  desc: "Automate quote requests, scheduling, crew dispatch, and review collection. Your phones get answered even when you're on a job." },
  { icon: "✂️", title: "Salons & Barbershops",   desc: "Fill your chair with automated appointment booking, reminder texts, and loyalty follow-ups that bring clients back." },
  { icon: "🔧", title: "Contractors & Trades",   desc: "Send quotes in minutes, dispatch crews, follow up on unpaid invoices, and collect reviews automatically after every job." },
  { icon: "🚗", title: "Auto Shops & Detailers", desc: "Answer the phone 24/7, text appointment reminders, and send post-service review requests without lifting a finger." },
  { icon: "🏥", title: "Med Spas & Wellness",    desc: "Book consultations, send treatment reminders, follow up with post-visit care instructions, and automate re-booking." },
  { icon: "🍔", title: "Food & Catering",        desc: "Handle catering inquiries, confirm event bookings, send menus, and follow up after every event for reviews and repeat business." },
];

const BIZ_PLANS = [
  { name: "Starter", price: "$297", agents: 3,  featured: false, desc: "For solo operators who need the basics automated.", feats: ["PhoneAgent + TextAgent + InboxAgent", "Lead follow-up sequences", "Review request automation", "Nia AI coordinator"] },
  { name: "Growth",  price: "$697", agents: 8,  featured: true,  desc: "For growing businesses that need full comms & sales coverage.", feats: ["Everything in Starter", "QuoteAgent + ScheduleAgent", "CRMAgent + OnboardAgent", "ReviewAgent + FollowUpAgent", "Weekly performance reports"] },
  { name: "Scale",   price: "$1,497", agents: 14, featured: false, desc: "For established businesses running multiple departments.", feats: ["Everything in Growth", "InvoiceAgent + SupplyAgent", "VideoAgent + CopyAgent", "BrochureAgent + ListenAgent", "Priority support"] },
  { name: "Empire",  price: "$2,497", agents: 19, featured: false, desc: "The full 19-agent crew. Maximum automation, maximum results.", feats: ["All 19 agents active", "Custom agent configuration", "Dedicated account manager", "White-glove onboarding", "SLA guarantee"] },
];
