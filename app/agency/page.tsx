// app/agency/page.tsx — CrewwOS White-Label Agency Portal
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AgencyApplyForm from "./AgencyApplyForm";

export const metadata = {
  title: "CrewwOS Agency — White-Label AI Agent Platform for Agencies",
  description:
    "Launch your own AI agent platform under your brand. Resell 19 AI agents to your clients, keep 100% of margin above cost, and run everything from one agency dashboard.",
};

export default async function AgencyPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const color = "#00D4FF";
  const colorAlt = "#A855F7";

  const tiers = [
    {
      name: "Agency Starter",
      price: "$497",
      period: "/mo",
      desc: "Test the model with your first clients.",
      clients: "Up to 5 client workspaces",
      highlight: false,
      perks: [
        "White-label domain (yourapp.com)",
        "Custom logo & brand colors",
        "5 client workspaces",
        "Agency dashboard",
        "19 agents per workspace",
        "Email support",
      ],
    },
    {
      name: "Agency Pro",
      price: "$1,197",
      period: "/mo",
      desc: "Your full-time recurring revenue engine.",
      clients: "Up to 25 client workspaces",
      highlight: true,
      perks: [
        "Everything in Starter",
        "25 client workspaces",
        "Custom onboarding flow",
        "Client billing control",
        "Priority support + Slack",
        "Co-marketing assets",
        "Early access to new agents",
      ],
    },
    {
      name: "Agency Enterprise",
      price: "Custom",
      period: "",
      desc: "Unlimited scale. Your infrastructure.",
      clients: "Unlimited client workspaces",
      highlight: false,
      perks: [
        "Everything in Pro",
        "Unlimited workspaces",
        "Dedicated infra option",
        "SSO + advanced RBAC",
        "SLA guarantee",
        "Dedicated account manager",
        "API access for custom builds",
      ],
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Apply & get approved",
      desc: "Fill out the agency application. We review within 48 hours. Once approved, you get access to the Agency Portal and your white-label config.",
    },
    {
      num: "02",
      title: "Brand it your way",
      desc: "Set your domain, upload your logo, pick your brand colors. Your clients never see 'CrewwOS' — they see your product, your company, your brand.",
    },
    {
      num: "03",
      title: "Onboard your first client",
      desc: "Create a client workspace from your agency dashboard. They get their own login, their own 19-agent crew, and your branded interface — ready in under 5 minutes.",
    },
    {
      num: "04",
      title: "Set your prices, keep your margin",
      desc: "You set what clients pay. You collect payment your way. We bill you our agency rate. The spread is yours — $200/mo per client adds up fast.",
    },
    {
      num: "05",
      title: "Scale with one dashboard",
      desc: "Every client's workspace, activity, billing status, and agent health in one view. Add clients, pause accounts, run reports — all without touching code.",
    },
  ];

  const economics = [
    { clients: 5,  agencyRate: 497,  yourPrice: 297,   monthly: 1485,  annual: 17820 },
    { clients: 10, agencyRate: 1197, yourPrice: 397,   monthly: 3970,  annual: 47640 },
    { clients: 25, agencyRate: 1197, yourPrice: 497,   monthly: 12425, annual: 149100 },
  ];

  const features = [
    {
      icon: "🏷️",
      title: "Full white-label",
      desc: "Custom domain, your logo, your colors, your name in every email. Zero CrewwOS branding visible to clients — unless you want it.",
    },
    {
      icon: "🏢",
      title: "Multi-client dashboard",
      desc: "One login to see all your clients. Workspace health, agent activity, last login, billing status — all in a single agency control panel.",
    },
    {
      icon: "⚙️",
      title: "Per-client customization",
      desc: "Give each client their own agent personas, custom system prompts, and vertical-specific defaults. One account for a restaurant; another for a trades shop.",
    },
    {
      icon: "💳",
      title: "You own the billing",
      desc: "We don't touch your clients' credit cards. You set prices, collect payment, and invoice however you want. We bill you the agency rate monthly.",
    },
    {
      icon: "🔑",
      title: "Client access control",
      desc: "Decide what each client can see and do. Lock certain agents, hide integrations, restrict plan upgrades. You're the admin of their admin.",
    },
    {
      icon: "📊",
      title: "Agency-level reporting",
      desc: "Export workspace activity, agent usage, and task logs across all clients. Use it for your own reporting or bundle it into client deliverables.",
    },
    {
      icon: "🔗",
      title: "Integration inheritance",
      desc: "Set up shared integrations at the agency level — Resend, Twilio, Vapi — and let clients inherit them. No per-client API key juggling.",
    },
    {
      icon: "🛠️",
      title: "Custom onboarding flow",
      desc: "Replace the default CrewwOS onboarding wizard with your own — your questions, your brand, your intake logic. Pro and Enterprise only.",
    },
  ];

  const useCases = [
    {
      type: "Marketing Agency",
      pitch: "Add $500–2,000/mo per client without adding headcount. Bundle AI agents into your retainer.",
      emoji: "📱",
    },
    {
      type: "Business Consultant",
      pitch: "Deploy a full 19-agent back office for each client engagement. Ongoing SaaS revenue from every engagement.",
      emoji: "💼",
    },
    {
      type: "Web/App Dev Agency",
      pitch: "Offer AI automation as a managed service alongside your builds. Recurring revenue that outlasts the project.",
      emoji: "💻",
    },
    {
      type: "Franchise / Franchisor",
      pitch: "One agency account powers every franchisee location. Consistent ops, brand-safe AI, centrally managed.",
      emoji: "🏪",
    },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#060612", color: "#fff", fontFamily: "Inter, system-ui, sans-serif", overflowX: "hidden" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 1000, height: 700, background: `radial-gradient(ellipse, ${color}0d 0%, ${colorAlt}08 40%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} aria-hidden />

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 64, background: "rgba(6,6,18,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00d8c0, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000" }}>C</span>
          CrewwOS
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textDecoration: "none" }}>← All verticals</Link>
          <Link href="/sign-in" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}>Log in</Link>
          <a href="#apply" style={{ background: `linear-gradient(135deg, ${color}, ${colorAlt})`, color: "#000", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Apply Now →</a>
        </div>
      </nav>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── HERO ── */}
        <section style={{ textAlign: "center", padding: "100px 24px 88px", maxWidth: 960, margin: "0 auto" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 99, padding: "6px 16px", fontSize: 12, color, marginBottom: 36, letterSpacing: "1px", fontFamily: "monospace", fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 8px ${color}` }} />
            WHITE-LABEL AGENCY PROGRAM
          </div>

          <h1 style={{ fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2.5px", margin: "0 0 28px" }}>
            Your brand.<br />
            <span style={{ background: `linear-gradient(135deg, ${color}, ${colorAlt})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Our 19 agents.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(17px, 2.2vw, 21px)", color: "rgba(255,255,255,0.6)", maxWidth: 620, margin: "0 auto 20px", lineHeight: 1.7 }}>
            Launch your own AI agent platform under your logo. Resell to your clients. Keep the margin. We handle the infrastructure — you own the relationship.
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginBottom: 52 }}>
            No coding required. Live in 48 hours. Recurring revenue from day one.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 72 }}>
            <a href="#apply" style={{ background: `linear-gradient(135deg, ${color}, ${colorAlt})`, color: "#000", fontWeight: 800, fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none", boxShadow: `0 8px 32px ${color}30` }}>
              Apply for Agency Access →
            </a>
            <a href="#pricing" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none" }}>
              See pricing
            </a>
          </div>

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
            {[["19","AI agents per client"],["48h","Go-live timeline"],["100%","Your brand shown"],["$0","Per-client dev cost"]].map(([n, l]) => (
              <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "24px 12px", background: "rgba(6,6,18,0.8)" }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{n}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>{l}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHITE-LABEL PREVIEW ── */}
        <section style={{ padding: "0 24px 100px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-block", color: colorAlt, fontSize: 11, fontFamily: "monospace", letterSpacing: 3, background: `${colorAlt}11`, border: `1px solid ${colorAlt}22`, borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>WHAT YOUR CLIENTS SEE</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>
              Your brand. Their office.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
              Clients sign in through your domain and see your name on everything.
            </p>
          </div>

          {/* Mock browser frame showing white-labeled dashboard */}
          <div style={{ background: "#0a0a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" }}>
            {/* Browser chrome */}
            <div style={{ background: "#0d0d20", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ff5f57","#ffbd2e","#28c940"].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
                ))}
              </div>
              <div style={{ flex: 1, background: "#060612", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", textAlign: "center" }}>
                app.youragency.com
              </div>
            </div>

            {/* Mocked white-labeled nav */}
            <div style={{ padding: "0 20px", height: 52, background: "#08081a", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>Y</div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>YourAgency OS</span>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {["Dashboard","Agents","Integrations","Settings"].map(item => (
                  <span key={item} style={{ fontSize: 12, color: item === "Dashboard" ? "#fff" : "rgba(255,255,255,0.4)" }}>{item}</span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Mike Torres · Torres Co.</div>
            </div>

            {/* Mocked dashboard body */}
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, minHeight: 260 }}>
              {/* Main area */}
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 14, fontFamily: "monospace" }}>VIRTUAL OFFICE · TORRES CO.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { name: "Nia", role: "Chief of Staff", emoji: "🎯", active: true },
                    { name: "Marcus", role: "VP Sales", emoji: "💼", active: false },
                    { name: "Kai", role: "SDR", emoji: "📞", active: true },
                    { name: "Luna", role: "CMO", emoji: "🚀", active: false },
                    { name: "Alex", role: "CTO", emoji: "🧠", active: false },
                    { name: "Zoe", role: "Email Mktg", emoji: "📧", active: true },
                    { name: "Victor", role: "COO", emoji: "🏗️", active: false },
                    { name: "Dana", role: "CFO", emoji: "💰", active: false },
                  ].map(a => (
                    <div key={a.name} style={{ background: a.active ? "#6366f115" : "#ffffff05", border: `1px solid ${a.active ? "#6366f133" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{a.emoji}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: a.active ? "#fff" : "rgba(255,255,255,0.5)" }}>{a.name}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{a.role}</div>
                      {a.active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", margin: "4px auto 0", boxShadow: "0 0 4px #10b981" }} />}
                    </div>
                  ))}
                </div>
              </div>
              {/* Side panel */}
              <div style={{ background: "#060612", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: 2, marginBottom: 12 }}>RECENT ACTIVITY</div>
                {[
                  { agent: "Nia", text: "Logged call from Mike Torres", time: "2m ago" },
                  { agent: "Kai", text: "Sent cold email to 3 leads", time: "14m ago" },
                  { agent: "Zoe", text: "Campaign sent · 412 emails", time: "1h ago" },
                  { agent: "Marcus", text: "Demo booked — Fri 2pm", time: "3h ago" },
                ].map((item, i) => (
                  <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>{item.agent}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Your client sees your logo, your domain, your colors. Never ours.
          </div>
        </section>

        {/* ── USE CASES ── */}
        <section style={{ padding: "0 24px 100px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>Built for agencies like yours</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15 }}>Whatever you sell, AI agents become a recurring revenue line.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {useCases.map((uc, i) => (
              <div key={i} style={{ background: "#0a0a1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{uc.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{uc.type}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.6 }}>{uc.pitch}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ padding: "0 24px 100px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", color, fontSize: 11, fontFamily: "monospace", letterSpacing: 3, background: `${color}11`, border: `1px solid ${color}22`, borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>From application to first client in 48 hours</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 680, margin: "0 auto" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: `${color}12`, border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontWeight: 800, fontSize: 12, color, flexShrink: 0 }}>
                    {step.num}
                  </div>
                  {i < steps.length - 1 && <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.07)", margin: "8px 0" }} />}
                </div>
                <div style={{ paddingBottom: i < steps.length - 1 ? 40 : 0, paddingTop: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{step.title}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.65, maxWidth: 520 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ECONOMICS ── */}
        <section style={{ padding: "0 24px 100px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-block", color: "#10b981", fontSize: 11, fontFamily: "monospace", letterSpacing: 3, background: "#10b98111", border: "1px solid #10b98122", borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>THE MATH</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>What the margin looks like</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, maxWidth: 500, margin: "0 auto" }}>
              You set client pricing. We charge you the agency rate. The spread is yours.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Clients", "Your agency rate", "You charge clients", "Monthly gross", "Annual gross"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: h === "Clients" ? "left" : "right", fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, fontFamily: "monospace", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {economics.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "16px", fontWeight: 700 }}>{row.clients} clients</td>
                    <td style={{ padding: "16px", textAlign: "right", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>${row.agencyRate}/mo</td>
                    <td style={{ padding: "16px", textAlign: "right", fontSize: 14 }}>${row.yourPrice}/mo each</td>
                    <td style={{ padding: "16px", textAlign: "right", fontWeight: 700, color: "#10b981", fontSize: 15 }}>${row.monthly.toLocaleString()}/mo</td>
                    <td style={{ padding: "16px", textAlign: "right", fontWeight: 800, fontSize: 15 }}>${row.annual.toLocaleString()}/yr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
            * Illustrative. Your pricing, margin, and client volume determine actual revenue.
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ padding: "0 24px 100px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>Everything you need to run a software business</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
              Built for operators, not developers. No code, no infra, no headcount.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: "#0a0a1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: `${color}10`, border: `1px solid ${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" style={{ padding: "0 24px 100px", maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", color: colorAlt, fontSize: 11, fontFamily: "monospace", letterSpacing: 3, background: `${colorAlt}11`, border: `1px solid ${colorAlt}22`, borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>AGENCY PLANS</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 12 }}>One flat rate. Unlimited potential.</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15 }}>You pay us once per tier. What you charge clients is entirely up to you.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {tiers.map((tier, i) => (
              <div key={i} style={{
                background: tier.highlight ? `linear-gradient(160deg, ${color}0f, ${colorAlt}0a)` : "#0a0a1a",
                border: tier.highlight ? `1px solid ${color}44` : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: 28,
                position: "relative",
                boxShadow: tier.highlight ? `0 0 40px ${color}15` : "none",
              }}>
                {tier.highlight && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg, ${color}, ${colorAlt})`, color: "#000", fontSize: 10, fontWeight: 800, padding: "4px 14px", borderRadius: 20, letterSpacing: 1, whiteSpace: "nowrap" }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>{tier.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: tier.price === "Custom" ? 32 : 40, fontWeight: 900, color: tier.highlight ? color : "#fff" }}>{tier.price}</span>
                  {tier.period && <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>{tier.period}</span>}
                </div>
                <div style={{ fontSize: 12, color: colorAlt, fontWeight: 600, marginBottom: 6 }}>{tier.clients}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 24, lineHeight: 1.5 }}>{tier.desc}</div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 20, marginBottom: 24 }}>
                  {tier.perks.map((p, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <span style={{ color: "#10b981", fontSize: 13, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>{p}</span>
                    </div>
                  ))}
                </div>
                <a href="#apply" style={{
                  display: "block", textAlign: "center",
                  background: tier.highlight ? `linear-gradient(135deg, ${color}, ${colorAlt})` : "rgba(255,255,255,0.07)",
                  border: tier.highlight ? "none" : "1px solid rgba(255,255,255,0.12)",
                  color: tier.highlight ? "#000" : "#fff",
                  fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 12, textDecoration: "none",
                }}>
                  {tier.price === "Custom" ? "Contact us" : "Apply now →"}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── APPLY FORM ── */}
        <section id="apply" style={{ padding: "0 24px 120px", maxWidth: 640, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-block", color, fontSize: 11, fontFamily: "monospace", letterSpacing: 3, background: `${color}11`, border: `1px solid ${color}22`, borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>APPLY NOW</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 12 }}>
              Ready to build your SaaS business?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.6 }}>
              Fill out the form below. We review every application within 48 hours and reach out with next steps.
            </p>
          </div>

          <AgencyApplyForm />
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "28px 24px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ color: "#00D4FF" }}>Crew</span><span style={{ color: "#A855F7" }}>wOS</span>
            <span style={{ margin: "0 10px", color: "rgba(255,255,255,0.15)" }}>·</span>
            M.A.D.E Technologies Inc.
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Home</Link>
            <Link href="/nia" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Meet Nia</Link>
            <Link href="/sign-up" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Get Started</Link>
          </div>
        </div>
      </footer>

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        input:focus, textarea:focus, select:focus { border-color: ${color}55 !important; }
        select option { background: #0d0d20; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      `}</style>
    </main>
  );
}
