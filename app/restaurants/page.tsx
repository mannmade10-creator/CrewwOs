// app/restaurants/page.tsx — CrewwOS for Restaurants
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "CrewwOS for Restaurants — 19 AI Agents for Food Businesses",
  description:
    "Automate reservations, reviews, catering outreach, and social content with 19 AI agents built for restaurants, food trucks, and caterers. Plans from $197/mo.",
};

export default async function RestaurantsPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const ACCENT = "#ef4444";
  const ACCENT_RGB = "239,68,68";

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
          <Link href="/sign-up" style={{ background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Get started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "100px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(${ACCENT_RGB},0.1)`, border: `1px solid rgba(${ACCENT_RGB},0.25)`, borderRadius: 99, padding: "6px 16px", fontSize: 13, color: ACCENT, marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, animation: "pulse 2s ease-in-out infinite", display: "inline-block" }} />
          For restaurants, food trucks, and caterers
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px" }}>
          A full house, every night.<br />
          <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #f97316)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Without the headcount.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.7 }}>
          19 AI agents that handle reservations, manage your reviews, run your catering outreach, post your content, and keep guests coming back — so you can stay in the kitchen instead of the office.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
          <Link href="/sign-up" style={{ background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>Start free trial →</Link>
          <a href="#pricing" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>See pricing</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {[["19","AI agents on your crew"],["24/7","Review monitoring"],["<2min","Avg reservation response"],["0","Commission per cover"]].map(([n,l]) => (
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
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>Everything but the cooking.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 600, lineHeight: 1.7, margin: "0 0 56px" }}>The average restaurant owner spends 3+ hours a day on communication and marketing. That&apos;s time back in your hands.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {REST_SERVICES.map((s) => (
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
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 56px" }}>19 agents. Built for food businesses.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {REST_AGENTS.map((a) => (
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
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px", textAlign: "center" }}>Less than one no-show costs you.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 520, lineHeight: 1.7, margin: "0 auto 56px", textAlign: "center" }}>No per-reservation fees. No cover cuts. One flat monthly rate that pays for itself in week one.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {REST_PLANS.map((p) => (
            <div key={p.name} style={{ background: p.featured ? `rgba(${ACCENT_RGB},0.1)` : "rgba(255,255,255,0.03)", border: `1px solid ${p.featured ? `rgba(${ACCENT_RGB},0.4)` : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "28px 24px", position: "relative" }}>
              {p.featured && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: ACCENT, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99, whiteSpace: "nowrap" }}>Most popular</div>}
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
              <Link href="/sign-up" style={{ display: "block", textAlign: "center", background: p.featured ? ACCENT : "rgba(255,255,255,0.07)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, textDecoration: "none" }}>Get started →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1.5px", margin: "0 0 20px" }}>
          Your kitchen never sleeps.<br />
          <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #f97316)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Now neither does your crew.</span>
        </h2>
        <Link href="/sign-up" style={{ display: "inline-block", background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none" }}>Start free trial →</Link>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>14-day free trial · No per-cover fees · Cancel anytime</p>
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

const REST_SERVICES = [
  { icon: "📅", title: "Reservations & Waitlist", desc: "Handles every reservation request across phone, DM, text, and your website — books, confirms, and sends reminders without you touching it.", bullets: ["24/7 booking via any channel","Confirmation + reminder texts","Waitlist management","No-show follow-up and rebooking"] },
  { icon: "⭐", title: "Review Management", desc: "Monitors Google, Yelp, and TripAdvisor. Responds to positive reviews instantly. Flags negatives for your attention before they do damage.", bullets: ["Real-time review alerts","AI responses to 5-star reviews","Negative review escalation","Monthly reputation report"] },
  { icon: "🍽️", title: "Catering & Private Events", desc: "Follows up with every catering inquiry, sends menus and packages, collects deposits, and books private dining rooms — all automated.", bullets: ["Catering inquiry follow-up","Menu and pricing sends","Deposit collection flow","Event confirmation and details"] },
  { icon: "📲", title: "Social Media & Content", desc: "Posts daily to Instagram and Facebook — food photos, specials, behind-the-scenes — keeping your brand alive without you being online all day.", bullets: ["Daily post creation and scheduling","Menu special announcements","Story and reel scripts","Holiday and seasonal content"] },
  { icon: "🎁", title: "Loyalty & Guest Retention", desc: "Keeps your regulars coming back with birthday messages, VIP perks, and win-back campaigns for guests you haven't seen in a while.", bullets: ["Birthday and anniversary offers","VIP loyalty communications","Lapsed guest win-back campaigns","Monthly special promotions"] },
  { icon: "📊", title: "Marketing & Outreach", desc: "Runs your email list, pitches local press and food bloggers, reaches out to local businesses for corporate lunch accounts and partnerships.", bullets: ["Weekly email newsletter","Food blogger and press outreach","Corporate lunch account pitching","Local partnership campaigns"] },
];

const REST_AGENTS = [
  { icon: "👑", name: "Nia",           role: "Chief of Staff",       desc: "Coordinates your entire restaurant crew" },
  { icon: "📅", name: "ResyAgent",     role: "Reservations",         desc: "Books and confirms every table request" },
  { icon: "⏰", name: "RemindAgent",   role: "Guest Reminders",      desc: "Sends pre-visit reminders and directions" },
  { icon: "⭐", name: "ReviewAgent",   role: "Reputation",           desc: "Monitors and responds to all reviews" },
  { icon: "🍽️", name: "CateringAgent", role: "Events & Catering",   desc: "Handles all private dining and catering leads" },
  { icon: "📲", name: "SocialAgent",   role: "Content",              desc: "Posts daily content to all social channels" },
  { icon: "📸", name: "PhotoAgent",    role: "Food Content",         desc: "Creates captions and stories for food photos" },
  { icon: "🎁", name: "LoyaltyAgent",  role: "Guest Retention",      desc: "Manages VIP and loyalty communications" },
  { icon: "✉️", name: "EmailAgent",    role: "Newsletter",           desc: "Runs your weekly email list and promotions" },
  { icon: "💬", name: "TextAgent",     role: "SMS",                  desc: "Handles all text from guests and inquiries" },
  { icon: "🤖", name: "ChatAgent",     role: "Website Chat",         desc: "Answers menu and hours questions 24/7" },
  { icon: "🎉", name: "EventAgent",    role: "Specials & Events",    desc: "Promotes weekly specials and events" },
  { icon: "📰", name: "PRAgent",       role: "Press & Outreach",     desc: "Pitches food bloggers and local press" },
  { icon: "🏢", name: "B2BAgent",      role: "Corporate Accounts",   desc: "Pitches corporate lunch and catering accounts" },
  { icon: "🔁", name: "WinbackAgent",  role: "Re-engagement",        desc: "Win-back campaigns for lapsed guests" },
  { icon: "📊", name: "ReportAgent",   role: "Insights",             desc: "Monthly review and performance summaries" },
  { icon: "✍️", name: "CopyAgent",     role: "Copywriter",           desc: "Menu copy, promos, and ad descriptions" },
  { icon: "📣", name: "AdAgent",       role: "Paid Ads",             desc: "Facebook and Instagram ad campaigns" },
  { icon: "📋", name: "InboxAgent",    role: "Inbox",                desc: "Sorts and routes all incoming messages" },
];

const REST_PLANS = [
  { name: "Food Truck", price: "$197", featured: false, desc: "For solo operators and food trucks running lean.", feats: ["ResyAgent + ReviewAgent + SocialAgent","Nia coordinator","Review response automation","Daily social posting","Weekly performance report"] },
  { name: "Restaurant", price: "$497", featured: true, desc: "For full-service restaurants ready to grow.", feats: ["Everything in Food Truck","CateringAgent + LoyaltyAgent + EmailAgent","TextAgent + ChatAgent + EventAgent","Catering lead automation","Loyalty program comms","Weekly email newsletter"] },
  { name: "Multi-Location", price: "$997", featured: false, desc: "For groups and multi-location operators.", feats: ["Everything in Restaurant","All 19 agents active","PRAgent + B2BAgent + AdAgent","Press and blogger outreach","Corporate account pitching","Paid social ad campaigns"] },
  { name: "Enterprise", price: "$1,797", featured: false, desc: "For large hospitality groups and franchises.", feats: ["Everything in Multi-Location","Unlimited locations","Custom brand voice training","White-label guest portals","Dedicated account manager","Priority support"] },
];
