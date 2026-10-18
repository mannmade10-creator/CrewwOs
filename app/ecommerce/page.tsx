// app/ecommerce/page.tsx — CrewwOS for E-Commerce
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "CrewwOS for E-Commerce — 19 AI Agents for Online Sellers",
  description:
    "Automate product descriptions, abandoned cart recovery, ad copy, and customer service with 19 AI agents built for e-commerce stores and dropshippers. Plans from $197/mo.",
};

export default async function EcommercePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const ACCENT = "#f43f8e";
  const ACCENT_RGB = "244,63,142";

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
          For Shopify stores, dropshippers, and DTC brands
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px" }}>
          Your store never closes.<br />
          <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #f97316)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Your crew never clocks out.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.7 }}>
          19 AI agents that write product listings, recover abandoned carts, create ad copy, handle customer service, and grow your email list — so you can scale your store without scaling your headcount.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
          <Link href="/sign-up" style={{ background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>Start free trial →</Link>
          <a href="#pricing" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>See pricing</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {[["19","AI agents in your store"],["24/7","Cart recovery running"],["3×","Avg email revenue lift"],["0","Revenue share or cuts"]].map(([n,l]) => (
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
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>Every revenue lever. Automated.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 600, lineHeight: 1.7, margin: "0 0 56px" }}>The average e-commerce store leaves 30% of revenue on the table from abandoned carts, weak listings, and no post-purchase flow. CrewwOS captures all of it.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {ECOM_SERVICES.map((s) => (
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
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 56px" }}>19 agents. Built for e-commerce.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {ECOM_AGENTS.map((a) => (
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
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px", textAlign: "center" }}>We don&apos;t take a cut of your revenue.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 520, lineHeight: 1.7, margin: "0 auto 56px", textAlign: "center" }}>Flat monthly rate. No revenue share, no per-order fees. Every dollar your agents earn stays in your store.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {ECOM_PLANS.map((p) => (
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
          Your next sale is already<br />
          <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #f97316)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>in someone&apos;s cart.</span>
        </h2>
        <Link href="/sign-up" style={{ display: "inline-block", background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none" }}>Start free trial →</Link>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>14-day free trial · No revenue share · Cancel anytime</p>
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

const ECOM_SERVICES = [
  { icon: "🛒", title: "Abandoned Cart Recovery", desc: "Your CartAgent sends 3-touch email + SMS sequences to every shopper who left without buying. Most stores recover 15–25% of abandoned revenue.", bullets: ["Triggered within 1 hour of abandonment","3-touch email + SMS sequence","Discount offer on final touch","Recovery revenue tracking"] },
  { icon: "✍️", title: "Product Listing Copy", desc: "Paste in a product name and specs. Your CopyAgent writes SEO-optimized titles, descriptions, and bullet points for every SKU in your catalog.", bullets: ["SEO-optimized product titles","Conversion-focused descriptions","Benefit-led bullet points","Brand voice consistency"] },
  { icon: "📣", title: "Ad Copy & Creative", desc: "New drop coming? Your AdAgent writes Facebook, Instagram, TikTok, and Google ad copy for every product — hooks, headlines, body copy, and CTAs.", bullets: ["Platform-specific ad formats","A/B test copy variations","UGC-style scripts","Seasonal and launch angles"] },
  { icon: "📧", title: "Email Marketing Flows", desc: "Welcome series, post-purchase flows, win-back campaigns, and weekly promotional emails — all running automatically while you sleep.", bullets: ["Welcome series (5 emails)","Post-purchase upsell flow","60-day win-back campaign","Weekly promotional blasts"] },
  { icon: "💬", title: "Customer Service", desc: "Your SupportAgent handles order status, return requests, product questions, and complaints — 24/7, in your brand voice, without a ticket queue.", bullets: ["Order status and tracking","Return and exchange requests","Product and sizing questions","Complaint de-escalation"] },
  { icon: "📲", title: "Social & Content Engine", desc: "Daily product posts, reels scripts, TikTok content ideas, unboxing concepts, and influencer outreach — your social presence stays active automatically.", bullets: ["Daily product posts","Reel and TikTok scripts","Influencer outreach emails","UGC campaign management"] },
];

const ECOM_AGENTS = [
  { icon: "👑", name: "Nia",           role: "Chief of Staff",    desc: "Coordinates your entire e-commerce crew" },
  { icon: "🛒", name: "CartAgent",     role: "Cart Recovery",     desc: "Recovers abandoned carts via email + SMS" },
  { icon: "✍️", name: "CopyAgent",     role: "Product Copy",      desc: "Writes listings and descriptions for every SKU" },
  { icon: "📣", name: "AdAgent",       role: "Paid Ads",          desc: "Writes ad copy for every platform" },
  { icon: "📧", name: "EmailAgent",    role: "Email Flows",       desc: "Runs all lifecycle email marketing" },
  { icon: "💬", name: "SupportAgent",  role: "Customer Service",  desc: "Handles all customer questions 24/7" },
  { icon: "🔁", name: "RetentionAgent",role: "Retention",         desc: "Win-back and reorder campaigns" },
  { icon: "📲", name: "SocialAgent",   role: "Social Content",    desc: "Creates and schedules daily product posts" },
  { icon: "🎬", name: "VideoAgent",    role: "Video Scripts",     desc: "Writes reel and TikTok video scripts" },
  { icon: "🤝", name: "InfluencerAgent",role:"Influencers",       desc: "Outreaches to micro-influencers and UGC" },
  { icon: "⭐", name: "ReviewAgent",   role: "Reviews",           desc: "Requests reviews and UGC post-purchase" },
  { icon: "📊", name: "ReportAgent",   role: "Analytics",         desc: "Weekly revenue and performance breakdowns" },
  { icon: "🔍", name: "SEOAgent",      role: "SEO",               desc: "Optimizes collections and product pages" },
  { icon: "💎", name: "VIPAgent",      role: "VIP Customers",     desc: "Manages high-LTV customer relationships" },
  { icon: "🎁", name: "ReferralAgent", role: "Referral Program",  desc: "Runs referral and affiliate outreach" },
  { icon: "📦", name: "LaunchAgent",   role: "Product Launches",  desc: "Plans and executes new product drops" },
  { icon: "🤖", name: "ChatAgent",     role: "Website Chat",      desc: "Guides shoppers to the right products" },
  { icon: "💸", name: "SaleAgent",     role: "Flash Sales",       desc: "Plans and promotes flash sale events" },
  { icon: "🔔", name: "BackAgent",     role: "Back In Stock",     desc: "Notifies waitlists when items restock" },
];

const ECOM_PLANS = [
  { name: "Starter", price: "$197", featured: false, desc: "For new stores and solo dropshippers.", feats: ["CartAgent + CopyAgent + EmailAgent","Nia coordinator","Abandoned cart recovery","Welcome email series","Weekly performance report"] },
  { name: "Growth", price: "$497", featured: true, desc: "For stores doing consistent revenue ready to scale.", feats: ["Everything in Starter","AdAgent + SupportAgent + SocialAgent","ReviewAgent + RetentionAgent","Ad copy for all platforms","Full customer service coverage","Post-purchase flows"] },
  { name: "Scale", price: "$997", featured: false, desc: "For 7-figure stores with a full catalog.", feats: ["Everything in Growth","All 19 agents active","InfluencerAgent + LaunchAgent + VIPAgent","Influencer outreach campaigns","Product launch playbooks","VIP customer management"] },
  { name: "Empire", price: "$1,997", featured: false, desc: "For multi-brand operators and agencies.", feats: ["Everything in Scale","Unlimited product SKUs","Multi-brand management","White-label client reporting","Custom agent workflows","Dedicated account manager"] },
];
