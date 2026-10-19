"use client";

import { useEffect, useRef, useState } from "react";

export const metadata = undefined; // metadata exported from layout covers this route

/**
 * /demo — CrewwOS Interactive Feature Demo
 *
 * Self-contained page that replicates the full demo experience:
 * agents, interactive chat, dashboard, and pricing.
 * No external artifact dependency — lives entirely at crewwos.com/demo.
 */

// ─── Data ────────────────────────────────────────────────────────────────────

const AGENTS = [
  {
    emoji: "💼",
    name: "Alex",
    role: "Sales Agent",
    color: "#00D4FF",
    tasks: ["Qualifies leads", "Books demos", "Follows up"],
  },
  {
    emoji: "📣",
    name: "Maya",
    role: "Marketing Agent",
    color: "#A855F7",
    tasks: ["Creates content", "Runs campaigns", "Tracks analytics"],
  },
  {
    emoji: "👥",
    name: "Jordan",
    role: "HR Agent",
    color: "#10B981",
    tasks: ["Screens candidates", "Onboards hires", "Handles policies"],
  },
  {
    emoji: "💰",
    name: "Morgan",
    role: "Finance Agent",
    color: "#F59E0B",
    tasks: ["Tracks revenue", "Flags anomalies", "Generates reports"],
  },
  {
    emoji: "🎯",
    name: "Riley",
    role: "Customer Success",
    color: "#EF4444",
    tasks: ["Resolves tickets", "Sends check-ins", "Reduces churn"],
  },
  {
    emoji: "🔍",
    name: "Scout",
    role: "Research Agent",
    color: "#6366F1",
    tasks: ["Monitors competitors", "Finds prospects", "Summarizes trends"],
  },
];

const CHAT_RESPONSES: Record<string, string> = {
  schedule:
    "I've checked your calendar and found 3 open slots this week. I'll send the prospect a Calendly link and follow up if they don't book within 24 hours. Want me to add a reminder?",
  send: "Email drafted and queued. Subject: 'Quick question about your team' — sending Tuesday at 9am for best open rates. I'll notify you when they reply.",
  pipeline:
    "Your pipeline currently has 14 active leads. 3 are hot (opened emails 3+ times), 6 are warm (clicked links), 5 are cold. Want me to prioritize outreach to the hot ones?",
  leads:
    "Found 23 new prospects matching your ICP: B2B SaaS, 10-50 employees, Oklahoma City area. I've added them to Brevo and triggered the cold outreach sequence.",
  default:
    "On it. I'll handle that and report back with results. Anything else you need while I'm working on this?",
};

function getChatResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const key of Object.keys(CHAT_RESPONSES)) {
    if (lower.includes(key)) return CHAT_RESPONSES[key];
  }
  return CHAT_RESPONSES.default;
}

// ─── Components ───────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: (typeof AGENTS)[0] }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${agent.color}33`,
        borderRadius: 16,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `${agent.color}22`,
            border: `1px solid ${agent.color}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          {agent.emoji}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{agent.name}</div>
          <div style={{ fontSize: 13, color: agent.color }}>{agent.role}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {agent.tasks.map((t) => (
          <span
            key={t}
            style={{
              background: `${agent.color}15`,
              border: `1px solid ${agent.color}30`,
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 12,
              color: agent.color,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChatDemo() {
  const [messages, setMessages] = useState([
    {
      from: "alex",
      text: "Hey! I'm Alex, your AI Sales Agent. I'm currently monitoring 14 active leads and have 3 follow-ups scheduled for today. What do you need?",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { from: "user", text: userMsg }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { from: "alex", text: getChatResponse(userMsg) },
      ]);
    }, 1200);
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(0,212,255,0.2)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: 380,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(0,212,255,0.05)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(0,212,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          💼
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Alex — Sales Agent</div>
          <div style={{ fontSize: 12, color: "#10B981" }}>● Online · 14 active leads</div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.from === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius: m.from === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background:
                  m.from === "user"
                    ? "linear-gradient(135deg,#00D4FF,#A855F7)"
                    : "rgba(255,255,255,0.07)",
                color: m.from === "user" ? "#000" : "#fff",
                fontSize: 14,
                lineHeight: 1.5,
                fontWeight: m.from === "user" ? 600 : 400,
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", gap: 4, padding: "8px 14px" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#00D4FF",
                  animation: `bounce 1s ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: 10,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder='Try "schedule a demo" or "find leads"'
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#fff",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          style={{
            background: "linear-gradient(135deg,#00D4FF,#A855F7)",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            color: "#000",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const C = {
    bg: "#060612",
    bg2: "#0d0d2e",
    fg: "#ffffff",
    muted: "rgba(255,255,255,0.6)",
    dim: "rgba(255,255,255,0.25)",
    cyan: "#00D4FF",
    purple: "#A855F7",
    green: "#10B981",
    card: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
  };

  const section: React.CSSProperties = {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "80px 24px",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.cyan,
    marginBottom: 12,
  };

  const h2: React.CSSProperties = {
    fontSize: "clamp(28px,5vw,48px)",
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: 16,
  };

  return (
    <div style={{ background: C.bg, color: C.fg, fontFamily: "system-ui,sans-serif", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,6,18,0.85)", backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 64,
      }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 20, color: C.cyan, textDecoration: "none", letterSpacing: 1 }}>
          CREWWOS
        </a>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/pitch" style={{ fontSize: 14, color: C.muted, textDecoration: "none" }}>Pitch Deck</a>
          <a href="tel:+18887619438" style={{
            background: `linear-gradient(135deg,${C.cyan},${C.purple})`,
            borderRadius: 8, padding: "8px 18px",
            color: "#000", fontWeight: 700, fontSize: 14, textDecoration: "none",
          }}>
            Start Free Trial
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ ...section, textAlign: "center", paddingBottom: 40 }}>
        <div style={sectionLabel}>Interactive Demo</div>
        <h1 style={{ ...h2, background: `linear-gradient(90deg,${C.cyan},${C.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Meet Your AI Crew
        </h1>
        <p style={{ fontSize: 18, color: C.muted, maxWidth: 600, margin: "0 auto 32px" }}>
          Up to 19 specialized AI agents running your business 24/7. Sales, marketing, HR, finance, customer success — all included.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {[["6–19", "AI Agents"], ["$297/mo", "vs $450K/yr"], ["24/7", "Always On"], ["14 days", "Free Trial"]].map(([val, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.cyan }}>{val}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div style={{ ...section, paddingTop: 40 }}>
        <div style={sectionLabel}>Your Crew</div>
        <h2 style={h2}>The agents working for you</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {AGENTS.map((a) => <AgentCard key={a.name} agent={a} />)}
        </div>
      </div>

      {/* Live Demo */}
      <div style={{ ...section, paddingTop: 40 }}>
        <div style={sectionLabel}>Live Demo</div>
        <h2 style={h2}>Talk to Alex — your Sales Agent</h2>
        <p style={{ color: C.muted, marginBottom: 24 }}>
          Try: "schedule a demo", "send a follow-up", "check my pipeline", or "find leads"
        </p>
        <ChatDemo />
      </div>

      {/* Pricing */}
      <div style={{ ...section, paddingTop: 40 }}>
        <div style={sectionLabel}>Pricing</div>
        <h2 style={h2}>Simple, transparent pricing</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
          {[
            { name: "Starter", price: "$97", period: "/mo", agents: "6 AI agents", features: ["Sales + Marketing", "Email automation", "Basic dashboard", "Email support"], color: C.border, popular: false },
            { name: "Growth", price: "$297", period: "/mo", agents: "Up to 19 AI agents", features: ["All departments", "Nia Voice CoO", "Advanced analytics", "Priority support", "Brevo integration"], color: C.cyan, popular: true },
            { name: "Enterprise", price: "Custom", period: "", agents: "Unlimited agents", features: ["Custom workflows", "Dedicated success mgr", "SLA guarantee", "White-label option"], color: C.purple, popular: false },
          ].map((plan) => (
            <div key={plan.name} style={{
              background: plan.popular ? `linear-gradient(135deg,rgba(0,212,255,0.08),rgba(168,85,247,0.08))` : C.card,
              border: `1px solid ${plan.popular ? C.cyan : C.border}`,
              borderRadius: 20, padding: 28, position: "relative",
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: `linear-gradient(135deg,${C.cyan},${C.purple})`,
                  borderRadius: 20, padding: "4px 16px", fontSize: 11, fontWeight: 700, color: "#000",
                }}>MOST POPULAR</div>
              )}
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{plan.agents}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: plan.popular ? C.cyan : C.fg }}>{plan.price}</span>
                <span style={{ color: C.muted }}>{plan.period}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", gap: 8, fontSize: 14, color: C.muted }}>
                    <span style={{ color: C.green }}>✓</span> {f}
                  </div>
                ))}
              </div>
              {plan.name === "Enterprise" ? (
                <a href="tel:+18887619438" style={{
                  display: "block", textAlign: "center",
                  border: `1px solid ${C.purple}`, borderRadius: 10,
                  padding: "12px 0", color: C.purple, fontWeight: 700, fontSize: 14, textDecoration: "none",
                }}>📞 Call Nia — AI Sales</a>
              ) : (
                <a href="https://crewwos.com" style={{
                  display: "block", textAlign: "center",
                  background: plan.popular ? `linear-gradient(135deg,${C.cyan},${C.purple})` : "rgba(255,255,255,0.08)",
                  border: plan.popular ? "none" : `1px solid ${C.border}`,
                  borderRadius: 10, padding: "12px 0",
                  color: plan.popular ? "#000" : C.fg, fontWeight: 700, fontSize: 14, textDecoration: "none",
                }}>Start Free Trial</a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ ...section, textAlign: "center", paddingTop: 40 }}>
        <h2 style={{ ...h2, background: `linear-gradient(90deg,${C.cyan},${C.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Your crew is ready. Are you?
        </h2>
        <p style={{ color: C.muted, marginBottom: 28 }}>14-day free trial. No credit card. Full access.</p>
        <a href="https://crewwos.com" style={{
          background: `linear-gradient(135deg,${C.cyan},${C.purple})`,
          borderRadius: 50, padding: "16px 48px",
          color: "#000", fontWeight: 800, fontSize: 18, textDecoration: "none", display: "inline-block",
        }}>Start Free Trial →</a>
        <div style={{ marginTop: 24, fontSize: 14, color: C.dim }}>
          support@crewwos.com · <a href="tel:+18887619438" style={{ color: C.muted, textDecoration: "none" }}>(888) 761-9438</a>
        </div>
      </div>
    </div>
  );
}