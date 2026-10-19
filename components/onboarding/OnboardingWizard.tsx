// components/onboarding/OnboardingWizard.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type EntityStep = "ask" | "setup" | "skip";

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [entityChoice, setEntityChoice] = useState<EntityStep | null>(null);

  const create = async () => {
    if (!name.trim()) {
      setError("Give your workspace a name — usually your company's name.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't create workspace");
      setCreatedSlug(data.workspace.slug);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    }
    setCreating(false);
  };

  const handleEntityChoice = (choice: EntityStep) => {
    setEntityChoice(choice);
    if (choice === "setup") {
      // Route to business launch flow inside their new dashboard
      router.push(`/dashboard/${createdSlug}/business-setup`);
    } else {
      setStep(3);
    }
  };

  const stepLabel =
    step === 1 ? "STEP 1 OF 3" :
    step === 2 ? "STEP 2 OF 3" :
    "STEP 3 OF 3";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ color: "#00D4FF", fontSize: 12, letterSpacing: 3, marginBottom: 8, textAlign: "center" }} className="mono">
          CREWOS · {stepLabel}
        </div>

        {/* ── Step 1: Name workspace ────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 }}>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Name your workspace</div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              This is usually your company's name — it's what your crew of agents will work under. You can create more workspaces later for other businesses.
            </div>
            {error && <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <input
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && create()}
              placeholder="e.g. Box Flow OS"
              autoFocus
              style={{
                width: "100%", background: "#060612", border: "1px solid #ffffff22",
                borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14,
                outline: "none", marginBottom: 20, boxSizing: "border-box",
              }}
            />
            <button onClick={create} disabled={creating} style={{
              width: "100%", background: "linear-gradient(135deg, #00D4FF, #A855F7)", border: "none",
              borderRadius: 10, padding: "12px", color: "#000", fontWeight: 700, fontSize: 14,
              cursor: "pointer", opacity: creating ? 0.6 : 1,
            }}>
              {creating ? "Setting up your crew..." : "Create workspace"}
            </button>
            <div style={{ color: "#ffffff33", fontSize: 11, marginTop: 14, textAlign: "center" }}>
              Starts on the Starter plan — upgrade anytime from Settings.
            </div>
          </div>
        )}

        {/* ── Step 2: Business entity question ─────────────────────────── */}
        {step === 2 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🏢</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
              Is your business officially registered?
            </div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 24, lineHeight: 1.6, textAlign: "center" }}>
              CrewwOS can help you form your LLC, get your EIN, and register with your state — all in one place.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Already registered */}
              <button
                onClick={() => handleEntityChoice("skip")}
                style={{
                  background: "#060612", border: "1px solid #10B98155", borderRadius: 12,
                  padding: "14px 16px", color: "#fff", textAlign: "left", cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>✅ Yes, I'm already registered</div>
                <div style={{ color: "#ffffff55", fontSize: 12 }}>I have my LLC/Corp and EIN sorted</div>
              </button>

              {/* Help me register */}
              <button
                onClick={() => handleEntityChoice("setup")}
                style={{
                  background: "linear-gradient(135deg, #00D4FF11, #A855F711)",
                  border: "1px solid #00D4FF55", borderRadius: 12,
                  padding: "14px 16px", color: "#fff", textAlign: "left", cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>🚀 No — help me get set up</div>
                <div style={{ color: "#ffffff55", fontSize: 12 }}>Walk me through forming my entity, getting my EIN, and registering with my state</div>
              </button>

              {/* Do it later */}
              <button
                onClick={() => handleEntityChoice("skip")}
                style={{
                  background: "transparent", border: "1px solid #ffffff15", borderRadius: 12,
                  padding: "14px 16px", color: "#ffffff55", textAlign: "left", cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>⏱ I'll do this later</div>
                <div style={{ color: "#ffffff33", fontSize: 12 }}>Find it anytime under Settings → Business & Legal</div>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Success ───────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #10B98155", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{name} is live</div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              Your crew is seeded and ready. Connect a tool so agents can actually do things — or head straight to the office and start chatting.
            </div>
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              <button onClick={() => router.push(`/dashboard/${createdSlug}/integrations`)} style={{
                background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", borderRadius: 10,
                padding: "12px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
                Connect your first tool
              </button>
              <button onClick={() => router.push(`/dashboard/${createdSlug}`)} style={{
                background: "transparent", border: "1px solid #ffffff22", borderRadius: 10,
                padding: "12px", color: "#ffffff88", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>
                Go straight to the office
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
