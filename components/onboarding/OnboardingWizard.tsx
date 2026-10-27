// components/onboarding/OnboardingWizard.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import MusicOnboarding, { MusicArtistProfile } from "@/components/onboarding/MusicOnboarding";
import {
  RealEstateOnboarding, RealEstateProfile,
  RestaurantOnboarding, RestaurantProfile,
  TradesOnboarding, TradesProfile,
  EcommerceOnboarding, EcommerceProfile,
  GeneralOnboarding, GeneralProfile,
} from "@/components/onboarding/VerticalOnboarding";
import ConnectTools from "@/components/onboarding/ConnectTools";

type EntityStep = "ask" | "setup" | "skip";
// steps: 1=pick industry, 2=name workspace, "plan"=pick plan, intake steps, 3=biz entity, "connect"=connect tools, 4=success
type StepType = 1 | 2 | "plan" | 3 | 4 | "connect" | "music" | "realestate" | "restaurant" | "trades" | "ecommerce" | "general";

interface Vertical {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  color: string;
}

const VERTICALS: Vertical[] = [
  { id: "music",      emoji: "🎵", label: "Music & Entertainment", desc: "Artists, labels, studios, event promoters",       color: "#A855F7" },
  { id: "realestate", emoji: "🏠", label: "Real Estate",           desc: "Agents, brokers, investors, property managers",  color: "#00D4FF" },
  { id: "ecommerce",  emoji: "🛍️", label: "E-Commerce",            desc: "Dropshipping, DTC brands, online stores",        color: "#F59E0B" },
  { id: "trades",     emoji: "🔧", label: "Trades & Services",     desc: "Contractors, electricians, plumbers, cleaners",  color: "#10B981" },
  { id: "restaurant", emoji: "🍽️", label: "Food & Restaurant",     desc: "Restaurants, food trucks, catering",             color: "#F97316" },
  { id: "general",    emoji: "🏢", label: "General Business",      desc: "Any business not listed above",                  color: "#6B7280" },
];

// Contextual placeholder for the name input based on chosen industry
const NAME_PLACEHOLDER: Record<string, string> = {
  music:      "e.g. Made Music Group",
  realestate: "e.g. Made Realty",
  ecommerce:  "e.g. Made Shop",
  trades:     "e.g. Made Services",
  restaurant: "e.g. Made Kitchen",
  general:    "e.g. Made Enterprises",
};

interface Plan {
  slug: string;
  name: string;
  basePrice: number;       // monthly base in dollars
  includedAgents: number;  // agents included in base price (0 = unlimited)
  agentAddonPrice: number; // per extra agent/mo (0 = no add-on)
  niaCreditOnly: boolean;  // true = Nia is credits-based, can upgrade for $100/mo
  niaUnlimited: boolean;   // true = Nia unlimited already included
  highlight: boolean;
  color: string;
  integrations: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    slug: "starter",
    name: "Starter",
    basePrice: 97,
    includedAgents: 5,
    agentAddonPrice: 15,
    niaCreditOnly: true,
    niaUnlimited: false,
    highlight: false,
    color: "#6B7280",
    integrations: "2 integrations",
    features: ["5 AI agents + Nia", "2 tool integrations", "Office dashboard", "Agent chat"],
  },
  {
    slug: "growth",
    name: "Growth",
    basePrice: 297,
    includedAgents: 10,
    agentAddonPrice: 12,
    niaCreditOnly: true,
    niaUnlimited: false,
    highlight: true,
    color: "#A855F7",
    integrations: "5 integrations",
    features: ["10 AI agents + Nia", "5 tool integrations", "Full agent roster", "Priority support", "Reports & analytics"],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    basePrice: 997,
    includedAgents: 0,   // all 20 agents
    agentAddonPrice: 0,
    niaCreditOnly: false,
    niaUnlimited: true,
    highlight: false,
    color: "#00D4FF",
    integrations: "Unlimited",
    features: ["All 20 AI agents + Nia ∞", "Unlimited integrations", "Custom workflows", "Dedicated support", "API access"],
  },
  {
    slug: "agency",
    name: "Agency",
    basePrice: 2497,
    includedAgents: 15,
    agentAddonPrice: 10,
    niaCreditOnly: false,
    niaUnlimited: true,
    highlight: false,
    color: "#F59E0B",
    integrations: "Unlimited",
    features: ["15 AI agents + Nia ∞", "5 client workspaces", "White-label ready", "Agency dashboard", "Client billing"],
  },
];

const INTAKE_STEP: Record<string, StepType> = {
  music:      "music",
  realestate: "realestate",
  restaurant: "restaurant",
  trades:     "trades",
  ecommerce:  "ecommerce",
  general:    "general",
};

const DASHBOARD_ROUTE: Record<string, string> = {
  realestate: "realestate",
  restaurant: "restaurant",
  music:      "music",
  trades:     "trades",
  ecommerce:  "ecommerce",
  general:    "",
};

const SUCCESS_COPY: Record<string, { msg: string; btn: string }> = {
  music:      { msg: "Your artist crew is ready — your EPK is on file and your agents are standing by to pitch, promote, and distribute.", btn: "🎤 Open Artist Dashboard" },
  realestate: { msg: "Your real estate crew is ready — Scout Agent is standing by to find off-market deals in your market.", btn: "🏠 Open Real Estate Dashboard" },
  restaurant: { msg: "Your restaurant crew is ready — your agents will handle reviews, social, promos, and more.", btn: "🍽️ Open Restaurant Dashboard" },
  trades:     { msg: "Your trades crew is ready — Lead Agent is standing by to bring in jobs and follow up on quotes.", btn: "🔧 Open Trades Dashboard" },
  ecommerce:  { msg: "Your e-commerce crew is ready — Product Agent is hunting for winners and your ads agent is on standby.", btn: "🛍️ Open E-Commerce Dashboard" },
  general:    { msg: "Your crew is seeded and ready. Connect a tool so agents can actually do things — or head straight to the office.", btn: "🏢 Go to the Office →" },
};

// Admin check: matches the isAdminId in lib/admin.ts
const ADMIN_CLERK_ID = process.env.NEXT_PUBLIC_ADMIN_CLERK_ID;

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [step, setStep] = useState<StepType>(1);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [entityChoice, setEntityChoice] = useState<EntityStep | null>(null);
  // Per-plan add-on state: extra agents and Nia upgrade
  const [extraAgents, setExtraAgents] = useState<Record<string, number>>({});
  const [niaUpgrade, setNiaUpgrade] = useState<Record<string, boolean>>({});

  // Handle Stripe success redirect back to /onboarding?checkout=success&slug=...&vertical=...
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const slug = searchParams.get("slug");
    const vert = searchParams.get("vertical");
    if (checkout === "success" && slug && vert) {
      setCreatedSlug(slug);
      setVertical(vert);
      // Jump straight to the vertical intake form
      const intake = INTAKE_STEP[vert];
      if (intake) setStep(intake);
    } else if (checkout === "canceled" && slug) {
      // Payment was canceled — show the plan picker again
      setCreatedSlug(slug);
      const vert2 = vert ?? "general";
      setVertical(vert2);
      setStep("plan");
      setError("Payment was canceled. Choose a plan to continue.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVertical = VERTICALS.find(v => v.id === vertical);
  const isAdmin = user?.id === ADMIN_CLERK_ID;

  const create = async () => {
    if (!name.trim()) { setError("Give your workspace a name — usually your company's name."); return; }
    if (!vertical)    { setError("Select your industry to continue."); return; }
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
      // Admins skip billing entirely — go straight to intake
      if (isAdmin || data.workspace.plan === "superadmin") {
        setStep(INTAKE_STEP[vertical] ?? 3);
      } else {
        setStep("plan");
      }
    } catch (err: any) {
      setError(err.message);
    }
    setCreating(false);
  };

  const choosePlan = async (planSlug: string) => {
    if (!createdSlug) return;
    setCheckingOut(planSlug);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug: createdSlug,
          plan: planSlug,
          returnTo: "onboarding",
          extraAgents: extraAgents[planSlug] ?? 0,
          niaUnlimited: niaUpgrade[planSlug] ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start checkout");
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setError(err.message);
      setCheckingOut(null);
    }
  };

  const handleIntakeComplete = () => setStep(3);

  const handleEntityChoice = (choice: EntityStep) => {
    setEntityChoice(choice);
    if (choice === "setup") {
      router.push(`/dashboard/${createdSlug}/business-setup`);
    } else {
      // Go to Connect Tools step before success
      setStep("connect");
    }
  };

  const goToDashboard = () => {
    const route = DASHBOARD_ROUTE[vertical ?? ""] ?? "";
    router.push(route ? `/dashboard/${createdSlug}/${route}` : `/dashboard/${createdSlug}`);
  };

  const numericSteps: StepType[] = [1, 2, "plan", 3, "connect", 4];
  const isIntakeStep = !numericSteps.includes(step);
  const stepLabel =
    step === 1         ? "STEP 1 OF 5" :
    step === 2         ? "STEP 2 OF 5" :
    step === "plan"    ? "STEP 3 OF 5" :
    step === 3         ? "STEP 3 OF 5" :
    step === "connect" ? "STEP 4 OF 5" :
    isIntakeStep       ? "" :
    "STEP 5 OF 5";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: step === 1 ? 640 : step === "plan" ? 900 : step === "connect" ? 520 : isIntakeStep ? 560 : 480 }}>

        {!isIntakeStep && (
          <div style={{ color: "#00D4FF", fontSize: 12, letterSpacing: 3, marginBottom: 8, textAlign: "center" }} className="mono">
            CREWOS · {stepLabel}
          </div>
        )}

        {/* ── Step 1: Pick vertical ──────────────────────────────── */}
        {step === 1 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 }}>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              What industry are you in?
            </div>
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
            <button
              onClick={() => {
                if (!vertical) { setError("Pick your industry to continue."); return; }
                setError(null);
                setStep(2);
              }}
              disabled={!vertical}
              style={{
                width: "100%",
                background: vertical ? "linear-gradient(135deg, #00D4FF, #A855F7)" : "#ffffff22",
                border: "none", borderRadius: 10, padding: "12px",
                color: vertical ? "#000" : "#ffffff44", fontWeight: 700, fontSize: 14,
                cursor: vertical ? "pointer" : "not-allowed",
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Name workspace ─────────────────────────────── */}
        {step === 2 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 }}>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Name your{" "}
              <span style={{ color: selectedVertical?.color ?? "#00D4FF" }}>
                {selectedVertical?.label ?? "workspace"}
              </span>
            </div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              This is usually your company's name — it's what your crew of agents will work under.
              You can create more workspaces later for other businesses.
            </div>
            {error && <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <input
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && name.trim()) create(); }}
              placeholder={NAME_PLACEHOLDER[vertical ?? "general"] ?? "e.g. Made Enterprises"}
              autoFocus
              style={{ width: "100%", background: "#060612", border: "1px solid #ffffff22", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", marginBottom: 20, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setError(null); setStep(1); }}
                style={{ flex: 1, background: "transparent", border: "1px solid #ffffff22", borderRadius: 10, padding: "12px", color: "#ffffff66", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                ← Back
              </button>
              <button
                onClick={create}
                disabled={creating || !name.trim()}
                style={{
                  flex: 2,
                  background: name.trim() ? "linear-gradient(135deg, #00D4FF, #A855F7)" : "#ffffff22",
                  border: "none", borderRadius: 10, padding: "12px",
                  color: name.trim() ? "#000" : "#ffffff44", fontWeight: 700, fontSize: 14,
                  cursor: name.trim() ? "pointer" : "not-allowed", opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? "Creating your workspace..." : `Continue →`}
              </button>
            </div>
          </div>
        )}

        {/* ── Plan selection ─────────────────────────────────────── */}
        {step === "plan" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                Choose your plan
              </div>
              <div style={{ color: "#ffffff66", fontSize: 13, lineHeight: 1.6 }}>
                Pick the plan that fits where you are today — upgrade anytime from Settings.
              </div>
              {error && <div style={{ color: "#ff9999", fontSize: 12, marginTop: 10 }}>{error}</div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {PLANS.map(plan => {
                const extra = extraAgents[plan.slug] ?? 0;
                const niaBump = (niaUpgrade[plan.slug] ?? false) && plan.niaCreditOnly;
                const total = plan.basePrice + (extra * plan.agentAddonPrice) + (niaBump ? 100 : 0);
                const agentLabel = plan.includedAgents === 0
                  ? "All 20 agents"
                  : `${plan.includedAgents + extra} agent${plan.includedAgents + extra !== 1 ? "s" : ""}`;

                return (
                  <div
                    key={plan.slug}
                    style={{
                      background: plan.highlight ? "linear-gradient(135deg, #A855F711, #00D4FF11)" : "#0d0d1a",
                      border: `1px solid ${plan.highlight ? "#A855F7" : "#ffffff18"}`,
                      borderRadius: 16,
                      padding: "24px 20px",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                    }}
                  >
                    {plan.highlight && (
                      <div style={{
                        position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                        background: "linear-gradient(135deg, #A855F7, #00D4FF)",
                        color: "#000", fontSize: 10, fontWeight: 800, letterSpacing: 2,
                        padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap",
                      }}>
                        MOST POPULAR
                      </div>
                    )}

                    {/* Plan name + dynamic price */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ color: plan.color, fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
                        {plan.name.toUpperCase()}
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, marginBottom: 2 }}>
                        <span style={{ color: "#fff", fontSize: 28, fontWeight: 800 }}>${total.toLocaleString()}</span>
                        <span style={{ color: "#ffffff55", fontSize: 12, marginBottom: 4 }}>/mo</span>
                      </div>
                      <div style={{ color: "#ffffff55", fontSize: 11 }}>{agentLabel} · Nia {plan.niaUnlimited || niaBump ? "∞" : "credits"}</div>
                    </div>

                    {/* Feature list */}
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px 0" }}>
                      {plan.features.map(f => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 7, fontSize: 11, color: "#ffffffaa" }}>
                          <span style={{ color: plan.color, marginTop: 1, flexShrink: 0 }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* Agent add-on stepper (not shown for Enterprise) */}
                    {plan.agentAddonPrice > 0 && (
                      <div style={{ background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: "#ffffff66", marginBottom: 6, letterSpacing: 1 }}>
                          ADD AGENTS · +${plan.agentAddonPrice}/agent/mo
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <button
                            onClick={() => setExtraAgents(p => ({ ...p, [plan.slug]: Math.max(0, (p[plan.slug] ?? 0) - 1) }))}
                            disabled={extra === 0}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #ffffff22", background: "#060612", color: extra === 0 ? "#ffffff22" : "#fff", fontSize: 16, cursor: extra === 0 ? "not-allowed" : "pointer", lineHeight: 1 }}
                          >−</button>
                          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, minWidth: 32, textAlign: "center" }}>
                            {extra > 0 ? `+${extra}` : "0"}
                          </span>
                          <button
                            onClick={() => setExtraAgents(p => ({ ...p, [plan.slug]: (p[plan.slug] ?? 0) + 1 }))}
                            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${plan.color}55`, background: `${plan.color}18`, color: plan.color, fontSize: 16, cursor: "pointer", lineHeight: 1 }}
                          >+</button>
                        </div>
                      </div>
                    )}

                    {/* Nia Unlimited toggle (only for credit-based plans) */}
                    {plan.niaCreditOnly && (
                      <button
                        onClick={() => setNiaUpgrade(p => ({ ...p, [plan.slug]: !(p[plan.slug] ?? false) }))}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: niaBump ? "#A855F711" : "#ffffff08",
                          border: `1px solid ${niaBump ? "#A855F7" : "#ffffff15"}`,
                          borderRadius: 10, padding: "10px 12px", marginBottom: 14,
                          cursor: "pointer", width: "100%",
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 10, color: niaBump ? "#A855F7" : "#ffffff66", letterSpacing: 1, fontWeight: 700 }}>
                            NIA UNLIMITED · +$100/mo
                          </div>
                          <div style={{ fontSize: 10, color: "#ffffff44", marginTop: 2 }}>
                            {niaBump ? "✓ Added" : "Tap to add"}
                          </div>
                        </div>
                        <div style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: niaBump ? "#A855F7" : "#ffffff22",
                          position: "relative", transition: "background 0.15s",
                          flexShrink: 0,
                        }}>
                          <div style={{
                            position: "absolute", top: 3, left: niaBump ? 19 : 3,
                            width: 14, height: 14, borderRadius: "50%",
                            background: "#fff", transition: "left 0.15s",
                          }} />
                        </div>
                      </button>
                    )}

                    {/* Nia included badge for plans with unlimited built in */}
                    {plan.niaUnlimited && (
                      <div style={{ fontSize: 10, color: "#10B981", background: "#10B98110", border: "1px solid #10B98133", borderRadius: 8, padding: "6px 10px", marginBottom: 14, textAlign: "center", letterSpacing: 1, fontWeight: 700 }}>
                        NIA UNLIMITED INCLUDED ✓
                      </div>
                    )}

                    {/* CTA button */}
                    <button
                      onClick={() => choosePlan(plan.slug)}
                      disabled={!!checkingOut}
                      style={{
                        width: "100%", marginTop: "auto",
                        background: plan.highlight
                          ? "linear-gradient(135deg, #A855F7, #00D4FF)"
                          : `${plan.color}22`,
                        border: plan.highlight ? "none" : `1px solid ${plan.color}55`,
                        borderRadius: 10, padding: "11px",
                        color: plan.highlight ? "#000" : plan.color,
                        fontWeight: 700, fontSize: 13,
                        cursor: checkingOut ? "not-allowed" : "pointer",
                        opacity: checkingOut === plan.slug ? 0.6 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {checkingOut === plan.slug
                        ? "Opening Stripe…"
                        : `Get ${plan.name} — $${total.toLocaleString()}/mo →`}
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 16, color: "#ffffff33", fontSize: 11 }}>
              Powered by Stripe · Cancel anytime · No setup fees
            </div>
          </div>
        )}

        {/* ── Vertical intake flows ──────────────────────────────── */}
        {step === "music" && createdSlug && (
          <MusicOnboarding workspaceId={createdSlug} onComplete={(_p: MusicArtistProfile) => handleIntakeComplete()} />
        )}
        {step === "realestate" && createdSlug && (
          <RealEstateOnboarding workspaceId={createdSlug} onComplete={(_p: RealEstateProfile) => handleIntakeComplete()} />
        )}
        {step === "restaurant" && createdSlug && (
          <RestaurantOnboarding workspaceId={createdSlug} onComplete={(_p: RestaurantProfile) => handleIntakeComplete()} />
        )}
        {step === "trades" && createdSlug && (
          <TradesOnboarding workspaceId={createdSlug} onComplete={(_p: TradesProfile) => handleIntakeComplete()} />
        )}
        {step === "ecommerce" && createdSlug && (
          <EcommerceOnboarding workspaceId={createdSlug} onComplete={(_p: EcommerceProfile) => handleIntakeComplete()} />
        )}
        {step === "general" && createdSlug && (
          <GeneralOnboarding workspaceId={createdSlug} onComplete={(_p: GeneralProfile) => handleIntakeComplete()} />
        )}

        {/* ── Step 3: Business entity question ──────────────────── */}
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
              <button onClick={() => handleEntityChoice("skip")} style={{ background: "#060612", border: "1px solid #10B98155", borderRadius: 12, padding: "14px 16px", color: "#fff", textAlign: "left", cursor: "pointer" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>✅ Yes, I'm already registered</div>
                <div style={{ color: "#ffffff55", fontSize: 12 }}>I have my LLC/Corp and EIN sorted</div>
              </button>
              <button onClick={() => handleEntityChoice("setup")} style={{ background: "linear-gradient(135deg, #00D4FF11, #A855F711)", border: "1px solid #00D4FF55", borderRadius: 12, padding: "14px 16px", color: "#fff", textAlign: "left", cursor: "pointer" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>🚀 No — help me get set up</div>
                <div style={{ color: "#ffffff55", fontSize: 12 }}>Walk me through forming my entity, getting my EIN, and registering with my state</div>
              </button>
              <button onClick={() => handleEntityChoice("skip")} style={{ background: "transparent", border: "1px solid #ffffff15", borderRadius: 12, padding: "14px 16px", color: "#ffffff55", textAlign: "left", cursor: "pointer" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>⏱ I'll do this later</div>
                <div style={{ color: "#ffffff33", fontSize: 12 }}>Find it anytime under Settings → Business & Legal</div>
              </button>
            </div>
          </div>
        )}

        {/* ── Connect Tools step ────────────────────────────────── */}
        {step === "connect" && vertical && createdSlug && (
          <ConnectTools
            vertical={vertical}
            workspaceSlug={createdSlug}
            onContinue={() => setStep(4)}
          />
        )}

        {/* ── Step 4: Success ────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #10B98155", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{selectedVertical?.emoji ?? "✅"}</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{name} is live</div>
            <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              {SUCCESS_COPY[vertical ?? "general"]?.msg ?? SUCCESS_COPY["general"].msg}
            </div>
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              <button onClick={goToDashboard} style={{ background: "linear-gradient(135deg, #00D4FF, #A855F7)", border: "none", borderRadius: 10, padding: "12px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {SUCCESS_COPY[vertical ?? "general"]?.btn ?? SUCCESS_COPY["general"].btn}
              </button>
              <button onClick={() => router.push(`/dashboard/${createdSlug}/integrations`)} style={{ background: "transparent", border: "1px solid #ffffff22", borderRadius: 10, padding: "12px", color: "#ffffff88", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Connect your first tool
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}