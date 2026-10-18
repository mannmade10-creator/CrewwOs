// app/page.tsx — CrewwOS Hub (public landing, redirects signed-in users to dashboard)
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "CrewwOS — The AI Agent Platform",
  description:
    "19 AI agents that run your communications, sales, content, and operations — 24/7, for any industry.",
};

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="hub-root">
      {/* ── ambient glow ── */}
      <div className="hub-glow" aria-hidden />

      {/* ── NAV ── */}
      <nav className="hub-nav">
        <Link href="/" className="hub-logo">
          <span className="hub-logo-mark">C</span>
          CrewwOS
        </Link>
        <ul className="hub-nav-links">
          <li><a href="#verticals">Industries</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#agents">Agents</a></li>
          <li><a href="#white-label">White Label</a></li>
        </ul>
        <div className="hub-nav-right">
          <Link href="/sign-in" className="hub-login">Log in</Link>
          <Link href="/sign-up" className="hub-cta">Get started →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hub-hero">
        <div className="hub-badge">
          <span className="hub-badge-dot" />
          Now live — 19 AI agents for every industry
        </div>
        <h1 className="hub-h1">
          One platform.<br />
          <span className="hub-gradient">Any business.<br />Full automation.</span>
        </h1>
        <p className="hub-sub">
          CrewwOS deploys AI agents that run your communications, sales, content, operations,
          and intelligence — 24/7, without hiring. Pick your industry and go live in minutes.
        </p>
        <div className="hub-actions">
          <a href="#verticals" className="hub-btn-primary">Find your industry →</a>
          <a href="#agents" className="hub-btn-ghost">Explore all 19 agents</a>
        </div>
        <div className="hub-stats">
          {[
            { num: "19",  label: "AI agents per account" },
            { num: "6+",  label: "Industry verticals" },
            { num: "24/7",label: "Always running" },
            { num: "$0",  label: "Per-action or per-lead fees" },
          ].map((s) => (
            <div key={s.num}>
              <span className="hub-stat-num">{s.num}</span>
              <span className="hub-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── VERTICALS ── */}
      <section id="verticals" className="hub-section" style={{ paddingTop: 0 }}>
        <p className="hub-eyebrow">Choose your vertical</p>
        <h2 className="hub-section-title">Built for your world.</h2>
        <p className="hub-section-sub">
          Same powerful AI agents, tuned to the language, workflows, and goals of your industry.
        </p>
        <div className="hub-verticals-grid">
          {VERTICALS.map((v) => (
            <VerticalCard key={v.id} {...v} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="hub-section">
        <p className="hub-eyebrow">How it works</p>
        <h2 className="hub-section-title">Live in under 10 minutes.</h2>
        <p className="hub-section-sub">
          No developers, no integrations to build. Pick your agents, connect your accounts,
          and your crew is running.
        </p>
        <div className="hub-how-grid">
          {HOW_STEPS.map((s) => (
            <div key={s.num} className="hub-how-step">
              <span className="hub-how-num">{s.num}</span>
              <div className="hub-how-title">{s.title}</div>
              <div className="hub-how-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AGENT TICKER ── */}
      <section id="agents" className="hub-section" style={{ paddingBottom: 60 }}>
        <p className="hub-eyebrow">The full roster</p>
        <h2 className="hub-section-title">19 agents. Every department.</h2>
        <p className="hub-section-sub">
          From answering phones to generating video ads — your CrewwOS agents cover every
          part of running a modern business.
        </p>
        <div className="hub-ticker-wrap">
          <div className="hub-ticker-track">
            {[...ALL_AGENTS, ...ALL_AGENTS].map((a, i) => (
              <div key={i} className="hub-ticker-chip">
                <span>{a.icon}</span>{a.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHITE LABEL ── */}
      <section id="white-label" className="hub-section hub-wl-section">
        <div className="hub-wl-inner">
          <div>
            <p className="hub-eyebrow">For agencies &amp; resellers</p>
            <h2 className="hub-section-title">Your brand.<br />Our engine.</h2>
            <p className="hub-section-sub">
              Sign clients under your own brand. They see your logo, your name, your pricing.
              You keep the margin. CrewwOS powers everything behind the scenes.
            </p>
            <div className="hub-wl-feats">
              {WL_FEATS.map((f) => (
                <div key={f.title} className="hub-wl-feat">
                  <div className="hub-wl-feat-icon">{f.icon}</div>
                  <div>
                    <div className="hub-wl-feat-title">{f.title}</div>
                    <div className="hub-wl-feat-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hub-wl-card">
            <div className="hub-wl-card-top">
              <div className="hub-wl-dot">✨</div>
              <span className="hub-wl-brand">Example Client Co.</span>
              <span className="hub-wl-active">● Active</span>
            </div>
            {[["Starter", "$0/mo"], ["Growth", "$49/mo"], ["Pro", "$199/mo"]].map(([n, p]) => (
              <div key={n} className="hub-wl-row">
                <span className="hub-wl-plan">{n}</span>
                <span className="hub-wl-price">{p}</span>
              </div>
            ))}
            <p className="hub-wl-powered">Powered by CrewwOS · M.A.D.E Technologies Inc.</p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="hub-section hub-cta-section">
        <div className="hub-cta-inner">
          <h2 className="hub-cta-h2">
            The world runs on people.<br />
            <span className="hub-gradient">Now it runs on agents too.</span>
          </h2>
          <p className="hub-cta-sub">
            Whether you're a barber in OKC, a rapper in Atlanta, or a contractor in Dallas —
            CrewwOS gives you the same AI workforce that Fortune 500s pay millions for.
            At a price that makes sense.
          </p>
          <Link href="/sign-up" className="hub-btn-primary" style={{ display: "inline-flex", marginBottom: 32 }}>
            Choose your industry →
          </Link>
          <div className="hub-cta-grid">
            <Link href="/business" className="hub-cta-card">
              <div className="hub-cta-card-label" style={{ color: "#3b82f6" }}>Business</div>
              <div className="hub-cta-card-title">For local &amp; service businesses →</div>
            </Link>
            <Link href="/artists" className="hub-cta-card">
              <div className="hub-cta-card-label" style={{ color: "#a855f7" }}>Artists</div>
              <div className="hub-cta-card-title">For musicians &amp; producers →</div>
            </Link>
            <Link href="/white-label" className="hub-cta-card">
              <div className="hub-cta-card-label" style={{ color: "#00d8c0" }}>Agencies</div>
              <div className="hub-cta-card-title">White-label for resellers →</div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="hub-footer">
        <span>© 2026 CrewwOS · M.A.D.E Technologies Inc.</span>
        <div className="hub-footer-links">
          <Link href="/business">Business</Link>
          <Link href="/artists">Artists</Link>
          <Link href="/sign-in">Login</Link>
        </div>
      </footer>
    </main>
  );
}

/* ── Sub-component ── */
function VerticalCard({ href, color, colorRgb, icon, name, sub, agents, priceFrom, price, live }: (typeof VERTICALS)[0]) {
  const card = (
    <div
      className={`hub-vc${!live ? " hub-vc-coming" : ""}`}
      style={{ "--vc": `rgba(${colorRgb},0.07)`, "--vc-b": `rgba(${colorRgb},0.28)` } as React.CSSProperties}
    >
      <div className="hub-vc-top">
        <div className="hub-vc-icon" style={{ background: `rgba(${colorRgb},0.12)` }}>{icon}</div>
        <span className="hub-vc-badge" style={live ? { color, background: `rgba(${colorRgb},0.10)` } : {}}>
          {live ? "Live" : "Coming soon"}
        </span>
      </div>
      <div className="hub-vc-name">{name}</div>
      <div className="hub-vc-sub">{sub}</div>
      <div className="hub-vc-chips">
        {agents.map((a) => <span key={a} className="hub-vc-chip">{a}</span>)}
      </div>
      <div className="hub-vc-price">
        <span className="hub-vc-from">Starting at</span>
        <span className="hub-vc-num" style={{ color }}>{price}</span>
        <span className="hub-vc-arrow">→</span>
      </div>
    </div>
  );
  return live ? <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{card}</Link> : card;
}

/* ── Data ── */
const VERTICALS = [
  {
    id: "biz", href: "/business", color: "#3b82f6", colorRgb: "59,130,246", icon: "🏢",
    name: "CrewwOS for Business", live: true,
    sub: "Cleaning companies, salons, contractors, auto shops, and any local service business. Automate your phones, sales, scheduling, and reviews.",
    agents: ["PhoneAgent", "ScheduleAgent", "ReviewAgent", "InboxAgent"],
    priceFrom: true, price: "$297/mo",
  },
  {
    id: "music", href: "/artists", color: "#a855f7", colorRgb: "168,85,247", icon: "🎵",
    name: "CrewwOS for Artists", live: true,
    sub: "Independent musicians and producers who need a release machine — curator pitching, fan engagement, content creation, and algorithm-feeding on autopilot.",
    agents: ["PitchAgent", "VideoAgent", "FanAgent", "SaveAgent"],
    priceFrom: true, price: "$97/mo",
  },
  {
    id: "realestate", href: "/real-estate", color: "#f59e0b", colorRgb: "245,158,11", icon: "🏠",
    name: "CrewwOS for Real Estate", live: true,
    sub: "Agents and brokerages. Automated listing outreach, lead follow-up, showing scheduling, and market reporting — so you close more with less chasing.",
    agents: ["LeadAgent", "ShowingAgent", "ListingAgent"],
    priceFrom: true, price: "$397/mo",
  },
  {
    id: "food", href: "/restaurants", color: "#ef4444", colorRgb: "239,68,68", icon: "🍽️",
    name: "CrewwOS for Restaurants", live: true,
    sub: "Food trucks, pop-ups, and brick-and-mortar. Reservation handling, review management, catering outreach, and daily social content — fully automated.",
    agents: ["ReservationAgent", "ReviewAgent", "CateringAgent"],
    priceFrom: true, price: "$197/mo",
  },
  {
    id: "trades", href: "/trades", color: "#10b981", colorRgb: "16,185,129", icon: "🔧",
    name: "CrewwOS for Trades", live: true,
    sub: "Electricians, plumbers, HVAC, and general contractors. Quote generation, job scheduling, follow-up, and review collection running in the background while you work.",
    agents: ["QuoteAgent", "DispatchAgent", "FollowUpAgent"],
    priceFrom: true, price: "$297/mo",
  },
  {
    id: "ecom", href: "/ecommerce", color: "#f43f8e", colorRgb: "244,63,142", icon: "🛒",
    name: "CrewwOS for E-Commerce", live: true,
    sub: "Dropshippers and online store owners. Product description writing, abandoned cart follow-up, ad copy generation, and customer service — automated end to end.",
    agents: ["CartAgent", "AdAgent", "CopyAgent"],
    priceFrom: true, price: "$197/mo",
  },
];

const HOW_STEPS = [
  { num: "01", title: "Pick your industry", desc: "Choose the vertical that matches your business. Your agent roster is pre-configured for your workflows from day one." },
  { num: "02", title: "Build your stack", desc: "Select the agents you need. Start with 3, scale to all 19. Your plan adjusts automatically as you add more." },
  { num: "03", title: "Connect your tools", desc: "Link your phone number, email, calendar, and social accounts. Each agent knows exactly where to work." },
  { num: "04", title: "Let Nia run it", desc: "Nia, your AI Chief of Staff, coordinates every agent and keeps you informed. You just review what matters." },
];

const ALL_AGENTS = [
  { icon: "👑", name: "Nia — Chief of Staff" }, { icon: "📞", name: "PhoneAgent" },
  { icon: "💬", name: "TextAgent" }, { icon: "✉️", name: "InboxAgent" },
  { icon: "🤖", name: "ChatAgent" }, { icon: "📲", name: "OutreachAgent" },
  { icon: "🔁", name: "FollowUpAgent" }, { icon: "📋", name: "QuoteAgent" },
  { icon: "⭐", name: "ReviewAgent" }, { icon: "🗂️", name: "CRMAgent" },
  { icon: "📅", name: "ScheduleAgent" }, { icon: "💰", name: "InvoiceAgent" },
  { icon: "🚀", name: "OnboardAgent" }, { icon: "📊", name: "ReportAgent" },
  { icon: "📦", name: "SupplyAgent" }, { icon: "🎬", name: "VideoAgent" },
  { icon: "✍️", name: "CopyAgent" }, { icon: "📄", name: "BrochureAgent" },
  { icon: "👂", name: "ListenAgent" }, { icon: "📈", name: "TrendAgent" },
];

const WL_FEATS = [
  { icon: "🎨", title: "Fully branded client portals", desc: "Custom logo, colors, domain, and pricing — your clients never see "CrewwOS."" },
  { icon: "💰", title: "Set your own pricing", desc: "Charge $500, $1,000, $2,000/mo — the difference between your price and ours is your margin." },
  { icon: "📊", title: "Agency dashboard", desc: "Manage every client from one place. See their agents, usage, and billing at a glance." },
  { icon: "⚡", title: "Launch a client in minutes", desc: "New client? Spin up their branded portal, assign agents, and hand them over — same day." },
];
