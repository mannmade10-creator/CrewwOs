// app/nia/page.tsx
// Dedicated landing page for Nia — Chief of Staff, face of CrewwOS.

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function NiaPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const capabilities = [
    {
      icon: "📞",
      title: "Voice Reception",
      desc: "Answers your business phone 24/7. Greets callers by company name, captures their name, company, and need — then routes or takes a message. Never a missed call, never a cold voicemail.",
    },
    {
      icon: "📧",
      title: "Email Triage",
      desc: "Reads every inbound email within seconds. Drafts a professional acknowledgment from your company domain, tags the request, and hands it to the right team member with full context already written.",
    },
    {
      icon: "🎯",
      title: "Smart Routing",
      desc: "Knows every agent's role. Sales leads go to Kai or Marcus. Tech issues go to Alex. Brand requests go to Luna. Multi-department asks get split, briefed, and dispatched — simultaneously.",
    },
    {
      icon: "📋",
      title: "CRM First Responder",
      desc: "Every new contact — call, email, form fill — automatically becomes a CRM record. Name, company, channel, request, and routing decision logged before she ever hands off.",
    },
    {
      icon: "🏢",
      title: "All-Hands Broadcast",
      desc: "Need to brief the whole team? Send Nia a message and she relays it to all 19 agents simultaneously. Each one responds from their role — Nia compiles the replies and surfaces what matters.",
    },
    {
      icon: "⚡",
      title: "Instant Context",
      desc: "Before handing off, Nia pulls the contact's CRM history, any open tasks, and recent team activity — so no agent ever walks into a conversation cold.",
    },
  ];

  const industries = [
    { emoji: "🏢", name: "Business & Consulting" },
    { emoji: "🎨", name: "Creators & Agencies" },
    { emoji: "🏠", name: "Real Estate" },
    { emoji: "🍽️", name: "Restaurants" },
    { emoji: "🎵", name: "Music & Entertainment" },
    { emoji: "🔧", name: "Trades & Contractors" },
    { emoji: "🛍️", name: "E-Commerce" },
  ];

  const roster = [
    { slug: "cto",      name: "Alex",    role: "CTO",                    dept: "Engineering", emoji: "🧠" },
    { slug: "pm",       name: "Jordan",  role: "Product Manager",         dept: "Engineering", emoji: "📋" },
    { slug: "frontend", name: "Maya",    role: "Frontend Developer",       dept: "Engineering", emoji: "🎨" },
    { slug: "backend",  name: "Dev",     role: "Backend Developer",        dept: "Engineering", emoji: "⚙️" },
    { slug: "devops",   name: "Sam",     role: "DevOps Engineer",          dept: "Engineering", emoji: "☁️" },
    { slug: "qa",       name: "Riley",   role: "QA Engineer",              dept: "Engineering", emoji: "🔬" },
    { slug: "designer", name: "Nova",    role: "UI/UX Designer",           dept: "Engineering", emoji: "✅" },
    { slug: "vpsales",  name: "Marcus",  role: "VP of Sales",              dept: "Sales",       emoji: "💼" },
    { slug: "sdr",      name: "Kai",     role: "Sales Dev Rep",            dept: "Sales",       emoji: "📞" },
    { slug: "csm",      name: "Priya",   role: "Customer Support",         dept: "Sales",       emoji: "🤝" },
    { slug: "cmo",      name: "Luna",    role: "CMO / Growth Lead",        dept: "Marketing",   emoji: "🚀" },
    { slug: "content",  name: "Sage",    role: "Content Strategist",       dept: "Marketing",   emoji: "✍️" },
    { slug: "ads",      name: "Rex",     role: "Paid Ads Manager",         dept: "Marketing",   emoji: "📈" },
    { slug: "email",    name: "Zoe",     role: "Email Marketing",          dept: "Marketing",   emoji: "📧" },
    { slug: "scout",    name: "Scout",   role: "Product Research",         dept: "Marketing",   emoji: "🔍" },
    { slug: "coo",      name: "Victor",  role: "COO",                      dept: "Operations",  emoji: "🏗️" },
    { slug: "cfo",      name: "Dana",    role: "CFO / Controller",         dept: "Operations",  emoji: "💰" },
    { slug: "hr",       name: "Morgan",  role: "HR / People Ops",          dept: "Operations",  emoji: "👥" },
    { slug: "legal",    name: "Justice", role: "Legal Counsel",            dept: "Operations",  emoji: "⚖️" },
  ];

  const deptColors: Record<string, string> = {
    Engineering: "#3b82f6",
    Sales:       "#10b981",
    Marketing:   "#a855f7",
    Operations:  "#f59e0b",
    "Real Estate": "#F59E0B",
    Restaurant:    "#EF4444",
    "Music & Entertainment": "#8B5CF6",
    "E-Commerce": "#EC4899",
  };

  return (
    <div style={{ background: "#060612", minHeight: "100vh", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,6,18,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #ffffff0f",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1200, margin: "0 auto",
      }}>
        <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 16 }}>
          <span style={{ color: "#00D4FF" }}>Crew</span><span style={{ color: "#A855F7" }}>wOS</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/" style={{ color: "#ffffff66", fontSize: 13, textDecoration: "none" }}>All Verticals</a>
          <a href="/sign-up" style={{
            background: "linear-gradient(135deg, #00D4FF, #A855F7)",
            padding: "8px 18px", borderRadius: 8, color: "#000",
            fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}>Deploy Nia →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* ── HERO ── */}
        <section style={{ paddingTop: 100, paddingBottom: 80, textAlign: "center" }}>

          {/* Avatar glow */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 40 }}>
            <div style={{
              width: 140, height: 140, borderRadius: "50%",
              background: "linear-gradient(135deg, #00D4FF22, #A855F722)",
              border: "2px solid #00D4FF44",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 64, position: "relative", zIndex: 2,
              boxShadow: "0 0 60px #00D4FF33, 0 0 120px #A855F722",
            }}>
              🎯
            </div>
            {/* Pulse rings */}
            <div style={{
              position: "absolute", inset: -12,
              borderRadius: "50%", border: "1px solid #00D4FF22",
              animation: "pulse 2.5s ease-out infinite",
            }} />
            <div style={{
              position: "absolute", inset: -26,
              borderRadius: "50%", border: "1px solid #00D4FF11",
              animation: "pulse 2.5s ease-out 0.5s infinite",
            }} />
          </div>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#00D4FF11", border: "1px solid #00D4FF33",
            borderRadius: 20, padding: "6px 16px", marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00D4FF", boxShadow: "0 0 8px #00D4FF" }} />
            <span style={{ color: "#00D4FF", fontSize: 12, fontWeight: 600, letterSpacing: 1, fontFamily: "monospace" }}>
              CHIEF OF STAFF · CREWWOS
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(52px, 8vw, 88px)",
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: "-2px", marginBottom: 24,
          }}>
            Meet{" "}
            <span style={{
              background: "linear-gradient(135deg, #00D4FF, #A855F7)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Nia
            </span>
          </h1>

          <p style={{
            fontSize: "clamp(18px, 2.5vw, 24px)",
            color: "#ffffff88", lineHeight: 1.6,
            maxWidth: 680, margin: "0 auto 16px",
          }}>
            Your AI Chief of Staff. She answers the phone, triages email,<br />
            routes every request to the right agent, and logs every contact.
          </p>
          <p style={{ color: "#ffffff44", fontSize: 16, marginBottom: 48 }}>
            First point of contact. 24/7. Never off, never slow, never cold.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/sign-up" style={{
              background: "linear-gradient(135deg, #00D4FF, #A855F7)",
              padding: "16px 36px", borderRadius: 12, color: "#000",
              fontWeight: 800, fontSize: 16, textDecoration: "none",
              boxShadow: "0 8px 32px #00D4FF33",
            }}>
              Deploy Nia Free →
            </a>
            <a href="/" style={{
              background: "transparent", border: "1px solid #ffffff22",
              padding: "16px 36px", borderRadius: 12, color: "#ffffff88",
              fontWeight: 600, fontSize: 16, textDecoration: "none",
            }}>
              See All Verticals
            </a>
          </div>

          {/* Live call simulation */}
          <div style={{
            marginTop: 72, background: "#0d0d1a",
            border: "1px solid #00D4FF22", borderRadius: 20,
            padding: 32, maxWidth: 640, margin: "72px auto 0",
            textAlign: "left",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 24,
              paddingBottom: 16, borderBottom: "1px solid #ffffff0a",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
              <span style={{ color: "#10b981", fontSize: 11, fontFamily: "monospace", letterSpacing: 1 }}>LIVE CALL IN PROGRESS</span>
              <div style={{ marginLeft: "auto", color: "#ffffff33", fontSize: 11, fontFamily: "monospace" }}>0:23</div>
            </div>
            {[
              { speaker: "Caller", color: "#ffffff88", text: "Hi, I'm looking to book a quote for some electrical work — commercial space, about 4,000 sq ft." },
              { speaker: "Nia 🎯", color: "#00D4FF",   text: "Hi! Thanks for calling. I'm Nia, Chief of Staff here. I'd love to get you set up. Can I get your name and the best email to send the quote to?" },
              { speaker: "Caller", color: "#ffffff88", text: "Sure — Mike Torres, mike@torresco.com." },
              { speaker: "Nia 🎯", color: "#00D4FF",   text: "Perfect, Mike. I'm logging you in our system now and looping in our estimating team. You'll have a quote proposal in your inbox within 2 hours. Anything else I can help with today?" },
            ].map((msg, i) => (
              <div key={i} style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: msg.color, fontWeight: 700, fontSize: 12, fontFamily: "monospace", minWidth: 60, paddingTop: 2 }}>
                  {msg.speaker}
                </span>
                <span style={{ color: "#ffffff88", fontSize: 14, lineHeight: 1.5 }}>{msg.text}</span>
              </div>
            ))}
            <div style={{
              marginTop: 20, padding: "10px 14px",
              background: "#00D4FF08", border: "1px solid #00D4FF22",
              borderRadius: 10, display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 12 }}>📋</span>
              <span style={{ color: "#00D4FF88", fontSize: 12, fontFamily: "monospace" }}>
                CRM record created · Routed → Estimating · Lead logged
              </span>
            </div>
          </div>
        </section>

        {/* ── WHAT NIA DOES ── */}
        <section style={{ paddingBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{
              display: "inline-block", color: "#00D4FF",
              fontSize: 11, fontFamily: "monospace", letterSpacing: 3,
              background: "#00D4FF11", border: "1px solid #00D4FF22",
              borderRadius: 20, padding: "6px 16px", marginBottom: 20,
            }}>
              NIA'S CAPABILITIES
            </div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, marginBottom: 16 }}>
              Everything a great Chief of Staff does
            </h2>
            <p style={{ color: "#ffffff55", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
              Across every channel. Every hour. Every contact.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}>
            {capabilities.map((cap, i) => (
              <div key={i} style={{
                background: "#0a0a1a",
                border: "1px solid #ffffff0d",
                borderRadius: 16, padding: 28,
                transition: "border-color 0.2s",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "#00D4FF11", border: "1px solid #00D4FF22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, marginBottom: 16,
                }}>
                  {cap.icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{cap.title}</div>
                <div style={{ color: "#ffffff55", fontSize: 14, lineHeight: 1.6 }}>{cap.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HER CREW ── */}
        <section style={{ paddingBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{
              display: "inline-block", color: "#A855F7",
              fontSize: 11, fontFamily: "monospace", letterSpacing: 3,
              background: "#A855F711", border: "1px solid #A855F722",
              borderRadius: 20, padding: "6px 16px", marginBottom: 20,
            }}>
              THE TEAM SHE MANAGES
            </div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, marginBottom: 16 }}>
              Nia routes to 18 specialized agents
            </h2>
            <p style={{ color: "#ffffff55", fontSize: 16, maxWidth: 540, margin: "0 auto" }}>
              She knows every agent's role, skills, and workload. Every request lands in the right hands — automatically.
            </p>
          </div>

          {/* Dept headers + agents grid */}
          {(["Engineering", "Sales", "Marketing", "Operations", "Real Estate", "Restaurant", "Music & Entertainment", "E-Commerce"] as const).map(dept => {
            const agents = roster.filter(a => a.dept === dept);
            const color = deptColors[dept];
            return (
              <div key={dept} style={{ marginBottom: 36 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
                }}>
                  <div style={{ height: 1, flex: 1, background: `${color}22` }} />
                  <span style={{
                    color, fontSize: 10, fontFamily: "monospace", letterSpacing: 3,
                    fontWeight: 700,
                  }}>{dept.toUpperCase()}</span>
                  <div style={{ height: 1, flex: 1, background: `${color}22` }} />
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12,
                }}>
                  {agents.map(agent => (
                    <div key={agent.slug} style={{
                      background: "#0a0a1a",
                      border: `1px solid ${color}22`,
                      borderRadius: 12, padding: "14px 16px",
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${color}15`, border: `1px solid ${color}33`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, flexShrink: 0,
                      }}>
                        {agent.emoji}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{agent.name}</div>
                        <div style={{ color: "#ffffff44", fontSize: 11 }}>{agent.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Nia center node visual */}
          <div style={{
            marginTop: 48, background: "#0a0a1a",
            border: "1px solid #00D4FF22", borderRadius: 20,
            padding: 32, textAlign: "center",
          }}>
            <div style={{ fontSize: 13, color: "#ffffff44", marginBottom: 16 }}>Every inbound request flows through</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              background: "#00D4FF11", border: "1px solid #00D4FF33",
              borderRadius: 40, padding: "12px 24px",
            }}>
              <span style={{ fontSize: 28 }}>🎯</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Nia</div>
                <div style={{ color: "#00D4FF", fontSize: 12, fontFamily: "monospace" }}>Chief of Staff</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#ffffff44", marginTop: 16 }}>before reaching any other agent</div>
          </div>
        </section>

        {/* ── INDUSTRY FIT ── */}
        <section style={{ paddingBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 12 }}>
              Nia works in every vertical
            </h2>
            <p style={{ color: "#ffffff55", fontSize: 15 }}>
              Same AI, shaped to your industry's communication style.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}>
            {industries.map((ind, i) => (
              <div key={i} style={{
                background: "#0a0a1a",
                border: "1px solid #ffffff0d",
                borderRadius: 14, padding: "20px 16px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{ind.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffffcc" }}>{ind.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS ── */}
        <section style={{ paddingBottom: 100 }}>
          <div style={{
            background: "linear-gradient(135deg, #00D4FF08, #A855F708)",
            border: "1px solid #00D4FF18",
            borderRadius: 24, padding: "48px 40px",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 32, textAlign: "center",
            }}>
              {[
                { stat: "<3s",    label: "Average response time" },
                { stat: "24/7",   label: "No shifts, no downtime" },
                { stat: "18",     label: "Agents she routes to" },
                { stat: "100%",   label: "Contacts logged to CRM" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{
                    fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 900,
                    background: "linear-gradient(135deg, #00D4FF, #A855F7)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text", marginBottom: 8,
                  }}>
                    {s.stat}
                  </div>
                  <div style={{ color: "#ffffff55", fontSize: 14 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ paddingBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, marginBottom: 12 }}>
              How Nia works
            </h2>
            <p style={{ color: "#ffffff55", fontSize: 16 }}>From contact to action in seconds.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { num: "01", title: "Contact comes in", desc: "Phone call, email, form fill, chat — any channel. Nia is listening on all of them from the moment you deploy.", color: "#00D4FF" },
              { num: "02", title: "Understand & respond", desc: "She greets professionally, asks 1–2 targeted questions to understand the need, and confirms the contact's details in real time.", color: "#A855F7" },
              { num: "03", title: "Log to CRM", desc: "Name, company, channel, request summary, and timestamp — created instantly. No contact ever falls through the cracks.", color: "#10b981" },
              { num: "04", title: "Route to the right agent", desc: "Nia dispatches the request with full context already written. The receiving agent knows what's needed before they read a word.", color: "#f59e0b" },
            ].map((step, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 24, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: `${step.color}15`, border: `1px solid ${step.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "monospace", fontWeight: 800, fontSize: 13,
                    color: step.color, flexShrink: 0,
                  }}>
                    {step.num}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: "#ffffff0a", margin: "8px 0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 40 : 0, paddingTop: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{step.title}</div>
                  <div style={{ color: "#ffffff55", fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ paddingBottom: 120, textAlign: "center" }}>
          <div style={{
            background: "linear-gradient(135deg, #00D4FF0d, #A855F70d)",
            border: "1px solid #00D4FF22",
            borderRadius: 28, padding: "72px 40px",
          }}>
            <div style={{ fontSize: 56, marginBottom: 24 }}>🎯</div>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, marginBottom: 16 }}>
              Ready to put Nia to work?
            </h2>
            <p style={{ color: "#ffffff66", fontSize: 18, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.6 }}>
              Deploy your full 19-agent crew in minutes. Nia answers the phone on day one — before you finish setting up your second integration.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/sign-up" style={{
                background: "linear-gradient(135deg, #00D4FF, #A855F7)",
                padding: "18px 44px", borderRadius: 14, color: "#000",
                fontWeight: 800, fontSize: 17, textDecoration: "none",
                boxShadow: "0 8px 40px #00D4FF44",
              }}>
                Deploy Nia Free →
              </a>
              <a href="/" style={{
                background: "transparent", border: "1px solid #ffffff22",
                padding: "18px 44px", borderRadius: 14, color: "#ffffff77",
                fontWeight: 600, fontSize: 17, textDecoration: "none",
              }}>
                Explore Verticals
              </a>
            </div>
            <p style={{ color: "#ffffff33", fontSize: 13, marginTop: 20 }}>
              No credit card required · Starter plan free · Upgrade anytime
            </p>
          </div>
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid #ffffff0a",
        padding: "32px 24px",
        textAlign: "center",
        color: "#ffffff33",
        fontSize: 13,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ color: "#00D4FF" }}>Crew</span><span style={{ color: "#A855F7" }}>wOS</span>
            <span style={{ marginLeft: 12, color: "#ffffff22" }}>·</span>
            <span style={{ marginLeft: 12 }}>M.A.D.E Technologies Inc.</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="/" style={{ color: "#ffffff33", textDecoration: "none" }}>Home</a>
            <a href="/business" style={{ color: "#ffffff33", textDecoration: "none" }}>Business</a>
            <a href="/sign-up" style={{ color: "#ffffff33", textDecoration: "none" }}>Get Started</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
