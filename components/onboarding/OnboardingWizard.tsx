// components/onboarding/OnboardingWizard.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type EntityStep = "ask" | "setup" | "skip";

interface Vertical {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  color: string;
}

const VERTICALS: Vertical[] = [
  { id: "music",       emoji: "🎵", label: "Music & Entertainment", desc: "Artists, labels, studios, event promoters",        color: "#A855F7" },
  { id: "realestate",  emoji: "🏠", label: "Real Estate",           desc: "Agents, brokers, investors, property managers",   color: "#00D4FF" },
  { id: "ecommerce",   emoji: "🛍️", label: "E-Commerce",            desc: "Dropshipping, DTC brands, online stores",         color: "#F59E0B" },
  { id: "trades",      emoji: "🔧", label: "Trades & Services",      desc: "Contractors, electricians, plumbers, cleaners",   color: "#10B981" },
  { id: "cannabis",    emoji: "🌿", label: "Cannabis",               desc: "Dispensaries, cultivators, delivery services",    color: "#84CC16" },
  { id: "restaurant",  emoji: "🍽️", label: "Food & Restaurant",      desc: "Restaurants, food trucks, catering",              color: "#F97316" },
  { id: "general",     emoji: "🏢", label: "General Business",       desc: "Any business not listed above",                  color: "#6B7280" },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [entityChoice, setEntityChoice] = useState<EntityStep | null>(null);

  const selectedVertical = VERTICALS.find(v => v.id === vertical);

  const create = async () => {
    if (!name.trim()) {
      setError("Give your workspace a name — usually your company's name.");
      return;
    }
    if (!vertical) {
      setError("Select your industry to continue.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), vertical }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't create workspace");
      setCreatedSlug(data.workspace.slug);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    }
    setCreating(false);
  };

  const handleEntityChoice = (choice: EntityStep) => {
    setEntityChoice(choice);
    if (choice === "setup") {
      router.push(`/dashboard/${createdSlug}/business-setup`);
    } else {
      setStep(4);
    }
  };

  const goToDashboard = () => {
    if (vertical === "realestate") {
      router.push(`/dashboard/${createdSlug}/realestate`);
    } else {
      router.push(`/dashboard/${createdSlug}`);
    }
  };

  const stepLabel =
    step === 1 ? "STEP 1 OF 3" :
    step === 2 ? "STEP 2 OF 3" :
    step === 3 ? "STEP 2 OF 3" :
    "STEP 3 OF 3";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: step === 2 ? 640 : 480 }}>
        <div style={{ color: "#00D4FF", fontSize: 12, letterSpacing: 3, marginBottom: 8, textAlign: "center" }} className="mono">
          CREWOS · {stepLabel}
        </div>

        {/* ── Step 1: Name workspace ───────────────────────────────────── */}
        {step === 1 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 }}>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Name your workspace</div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              This is usually your company's name — it's what your crew of agents will work under. You can create more workspaces later for other businesses.
            </div>
            {error && <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <input
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && name.trim() && setStep(2)}
              placeholder="e.g. Made Estates"
              autoFocus
              style={{
                width: "100%", background: "#060612", border: "1px solid #ffffff22",
                borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14,
                outline: "none", marginBottom: 20, boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => { if (name.trim()) { setError(null); setStep(2); } else setError("Give your workspace a name."); }}
              style={{
                width: "100%", background: "linear-gradient(135deg, #00D4FF, #A855F7)", border: "none",
                borderRadius: 10, padding: "12px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              Continue →
            </button>
            <div style={{ color: "#ffffff33", fontSize: 11, marginTop: 14, textAlign: "center" }}>
              Starts on the Starter plan — upgrade anytime from Settings.
            </div>
          </div>
        )}

        {/* ── Step 2: Pick vertical ────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 }}>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>What industry is <span style={{ color: "#00D4FF" }}>{name}</span> in?</div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              CrewwOS deploys a specialized crew built for your vertical — the right agents, workflows, and tools from day one.
            </div>
            {error && <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {VERTICALS.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVertical(v.id)}
                  style={{
                    background: vertical === v.id ? `${v.color}18` : "#060612",
                    border: `1px solid ${vertical === v.id ? v.color : "#ffffff18"}`,
                    borderRadius: 12, padding: "14px 16px", color: "#fff",
                    textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{v.emoji}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, color: vertical === v.id ? v.color : "#fff" }}>{v.label}</div>
                  <div style={{ color: "#ffffff55", fontSize: 11, lineHeight: 1.4 }}>{v.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, background: "transparent", border: "1px solid #ffffff22", borderRadius: 10,
                padding: "12px", color: "#ffffff66", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>← Back</button>
              <button onClick={create} disabled={creating || !vertical} style={{
                flex: 2, background: vertical ? "linear-gradient(135deg, #00D4FF, #A855F7)" : "#ffffff22",
                border: "none", borderRadius: 10, padding: "12px",
                color: vertical ? "#000" : "#ffffff44", fontWeight: 700, fontSize: 14,
                cursor: vertical ? "pointer" : "not-allowed", opacity: creating ? 0.6 : 1,
              }}>
                {creating ? "Setting up your crew..." : `Create ${name} →`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Business entity question ────────────────────────── */}
        {step === 3 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🏢</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
              Is your business officially registered?
            </div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 24, lineHeight: 1.6, textAlign: "center" }}>
              CrewwOS can help you form your LLC, get your EIN, and register with your state — all in one place.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => handleEntityChoice("skip")} style={{
                background: "#060612", border: "1px solid #10B98155", borderRadius: 12,
                padding: "14px 16px", color: "#fff", textAlign: "left", cursor: "pointer",
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>✅ Yes, I'm already registered</div>
                <div style={{ color: "#ffffff55", fontSize: 12 }}>I have my LLC/Corp and EIN sorted</div>
              </button>
              <button onClick={() => handleEntityChoice("setup")} style={{
                background: "linear-gradient(135deg, #00D4FF11, #A855F711)",
                border: "1px solid #00D4FF55", borderRadius: 12,
                padding: "14px 16px", color: "#fff", textAlign: "left", cursor: "pointer",
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>🚀 No — help me get set up</div>
                <div style={{ color: "#ffffff55", fontSize: 12 }}>Walk me through forming my entity, getting my EIN, and registering with my state</div>
              </button>
              <button onClick={() => handleEntityChoice("skip")} style={{
                background: "transparent", border: "1px solid #ffffff15", borderRadius: 12,
                padding: "14px 16px", color: "#ffffff55", textAlign: "left", cursor: "pointer",
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>⏱ I'll do this later</div>
                <div style={{ color: "#ffffff33", fontSize: 12 }}>Find it anytime under Settings → Business & Legal</div>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ──────────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #10B98155", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{selectedVertical?.emoji ?? "✅"}</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{name} is live</div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              {vertical === "realestate"
                ? "Your real estate crew is ready — Scout Agent is standing by to find off-market deals in your market."
                : "Your crew is seeded and ready. Connect a tool so agents can actually do things — or head straight to the office."}
            </div>
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              <button onClick={goToDashboard} style={{
                background: "linear-gradient(135deg, #00D4FF, #A855F7)", border: "none", borderRadius: 10,
                padding: "12px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
                {vertical === "realestate" ? "🏠 Open Real Estate Dashboard" : "Go to the office →"}
              </button>
              {vertical !== "realestate" && (
                <button onClick={() => router.push(`/dashboard/${createdSlug}/integrations`)} style={{
                  background: "transparent", border: "1px solid #ffffff22", borderRadius: 10,
                  padding: "12px", color: "#ffffff88", fontWeight: 600, fontSize: 14, cursor: "pointer",
                }}>
                  Connect your first tool
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
