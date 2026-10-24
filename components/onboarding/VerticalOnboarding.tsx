// components/onboarding/VerticalOnboarding.tsx
"use client";
import { useState, CSSProperties } from "react";

// ─── Shared static styles ──────────────────────────────────────────────────────

const cardStyle: CSSProperties = { background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 32 };
const labelStyle: CSSProperties = { color: "#ffffff88", fontSize: 12, letterSpacing: 1, marginBottom: 6, display: "block", textTransform: "uppercase" };
const inputStyle: CSSProperties = { width: "100%", background: "#060612", border: "1px solid #ffffff22", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 };
const rowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const titleStyle: CSSProperties = { color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 6 };
const subStyle: CSSProperties = { color: "#ffffff66", fontSize: 13, marginBottom: 24, lineHeight: 1.6 };
const btnPrimaryStyle: CSSProperties = { width: "100%", background: "linear-gradient(135deg, #00D4FF, #A855F7)", border: "none", borderRadius: 10, padding: "12px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8 };
const btnSecondaryStyle: CSSProperties = { width: "100%", background: "transparent", border: "1px solid #ffffff22", borderRadius: 10, padding: "12px", color: "#ffffff66", fontWeight: 600, fontSize: 14, cursor: "pointer", marginTop: 8 };

// ─── Shared helper functions ───────────────────────────────────────────────────

function chipStyle(active: boolean, color = "#00D4FF"): CSSProperties {
  return {
    padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${active ? color : "#ffffff22"}`,
    background: active ? `${color}20` : "transparent",
    color: active ? color : "#ffffff88",
  };
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ height: 3, background: "#ffffff15", borderRadius: 4, marginBottom: 28, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${(step / total) * 100}%`, background: "linear-gradient(90deg, #00D4FF, #A855F7)", transition: "width 0.3s" }} />
    </div>
  );
}

function StepHeader({ step, total, title, sub }: { step: number; total: number; title: string; sub: string }) {
  return (
    <>
      <ProgressBar step={step} total={total} />
      <div style={titleStyle}>{title}</div>
      <div style={subStyle}>{sub}</div>
    </>
  );
}

// ─── REAL ESTATE ONBOARDING ────────────────────────────────────────────────────
export interface RealEstateProfile {
  licenseNumber: string; licenseState: string; licenseExpiry: string;
  agentType: string; brokerageName: string; yearsExperience: string;
  markets: string; specialties: string[];
  mls: string; nrdsId: string;
  phone: string; website: string; instagram: string;
  crm: string; leadSources: string[];
  monthlyLeadGoal: string; avgDealSize: string;
}

const RE_SPECIALTIES = ["Buyer Rep", "Seller Rep", "Luxury", "Investment", "Foreclosures", "New Construction", "Land", "Commercial", "Multi-Family", "Short Sales", "Relocation"];
const RE_LEAD_SOURCES = ["Zillow", "Realtor.com", "Cold Calling", "Door Knocking", "Social Media", "Referrals", "Open Houses", "Sphere of Influence", "PPC Ads", "Mailers"];

export function RealEstateOnboarding({ workspaceId, onComplete }: { workspaceId: string; onComplete: (p: RealEstateProfile) => void }) {
  const [step, setStep] = useState(1);
  const TOTAL = 4;
  const [p, setP] = useState<RealEstateProfile>({
    licenseNumber: "", licenseState: "", licenseExpiry: "", agentType: "", brokerageName: "", yearsExperience: "",
    markets: "", specialties: [], mls: "", nrdsId: "", phone: "", website: "", instagram: "",
    crm: "", leadSources: [], monthlyLeadGoal: "", avgDealSize: "",
  });
  const set = (k: keyof RealEstateProfile, v: any) => setP(prev => ({ ...prev, [k]: v }));
  const toggleArr = (k: "specialties" | "leadSources", val: string) =>
    set(k, p[k].includes(val) ? p[k].filter((x: string) => x !== val) : [...p[k], val]);

  const finish = async () => {
    await fetch(`/api/workspaces/${workspaceId}/realestate-profile`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
    }).catch(() => {});
    onComplete(p);
  };

  return (
    <div style={cardStyle}>
      <div style={{ color: "#00D4FF", fontSize: 11, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>🏠 Real Estate Setup · Step {step} of {TOTAL}</div>

      {step === 1 && (
        <>
          <StepHeader step={1} total={TOTAL} title="Your license & brokerage" sub="We use this to pull MLS data, verify your markets, and set up your compliance tools." />
          <label style={labelStyle}>License Number</label>
          <input style={inputStyle} value={p.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} placeholder="e.g. 123456" />
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>License State</label>
              <input style={inputStyle} value={p.licenseState} onChange={e => set("licenseState", e.target.value)} placeholder="OK" maxLength={2} />
            </div>
            <div>
              <label style={labelStyle}>Expiry Date</label>
              <input style={inputStyle} type="date" value={p.licenseExpiry} onChange={e => set("licenseExpiry", e.target.value)} />
            </div>
          </div>
          <label style={labelStyle}>Agent Type</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["Solo Agent", "Team Lead", "Broker Owner", "Buyer's Agent", "Listing Specialist"].map(t => (
              <button key={t} onClick={() => set("agentType", t)} style={chipStyle(p.agentType === t, "#00D4FF")}>{t}</button>
            ))}
          </div>
          <label style={labelStyle}>Brokerage Name</label>
          <input style={inputStyle} value={p.brokerageName} onChange={e => set("brokerageName", e.target.value)} placeholder="e.g. Keller Williams, eXp Realty" />
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Years in Real Estate</label>
              <input style={inputStyle} value={p.yearsExperience} onChange={e => set("yearsExperience", e.target.value)} placeholder="5" />
            </div>
            <div>
              <label style={labelStyle}>NRDS / NAR ID</label>
              <input style={inputStyle} value={p.nrdsId} onChange={e => set("nrdsId", e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <button style={btnPrimaryStyle} onClick={() => setStep(2)}>Next →</button>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader step={2} total={TOTAL} title="Your markets & specialties" sub="Scout Agent will focus on these areas and property types first." />
          <label style={labelStyle}>Primary Markets (cities / zip codes)</label>
          <input style={inputStyle} value={p.markets} onChange={e => set("markets", e.target.value)} placeholder="e.g. OKC, Edmond, 73034" />
          <label style={labelStyle}>MLS Association</label>
          <input style={inputStyle} value={p.mls} onChange={e => set("mls", e.target.value)} placeholder="e.g. MLSOK, ARMLS" />
          <label style={labelStyle}>Specialties (pick all that apply)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {RE_SPECIALTIES.map(t => (
              <button key={t} onClick={() => toggleArr("specialties", t)} style={chipStyle(p.specialties.includes(t), "#00D4FF")}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(1)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={() => setStep(3)}>Next →</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeader step={3} total={TOTAL} title="Lead sources & CRM" sub="Your crew will prioritize these channels and sync with your existing tools." />
          <label style={labelStyle}>Current CRM (if any)</label>
          <input style={inputStyle} value={p.crm} onChange={e => set("crm", e.target.value)} placeholder="e.g. Follow Up Boss, LionDesk, KV Core" />
          <label style={labelStyle}>Where do your leads come from?</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {RE_LEAD_SOURCES.map(t => (
              <button key={t} onClick={() => toggleArr("leadSources", t)} style={chipStyle(p.leadSources.includes(t), "#00D4FF")}>{t}</button>
            ))}
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Monthly Lead Goal</label>
              <input style={inputStyle} value={p.monthlyLeadGoal} onChange={e => set("monthlyLeadGoal", e.target.value)} placeholder="e.g. 50" />
            </div>
            <div>
              <label style={labelStyle}>Avg Deal Size ($)</label>
              <input style={inputStyle} value={p.avgDealSize} onChange={e => set("avgDealSize", e.target.value)} placeholder="e.g. 250000" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(2)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={() => setStep(4)}>Next →</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <StepHeader step={4} total={TOTAL} title="Contact & social" sub="Your agents will use these to market your listings and respond to leads." />
          <label style={labelStyle}>Business Phone</label>
          <input style={inputStyle} value={p.phone} onChange={e => set("phone", e.target.value)} placeholder="(405) 555-0100" />
          <label style={labelStyle}>Website</label>
          <input style={inputStyle} value={p.website} onChange={e => set("website", e.target.value)} placeholder="https://yourdomain.com" />
          <label style={labelStyle}>Instagram Handle</label>
          <input style={inputStyle} value={p.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@yourhandle" />
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(3)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={finish}>Launch Real Estate Dashboard 🏠</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── RESTAURANT ONBOARDING ─────────────────────────────────────────────────────
export interface RestaurantProfile {
  conceptType: string; cuisineType: string; seatingCapacity: string;
  locations: string; yearsOpen: string; avgTicket: string;
  hasDelivery: boolean; deliveryPlatforms: string[];
  posSystem: string; onlineOrdering: string;
  phone: string; website: string; instagram: string;
  hoursOpen: string; teamSize: string;
  painPoints: string[];
}

const DELIVERY_PLATFORMS = ["DoorDash", "Uber Eats", "Grubhub", "Postmates", "In-house", "Catering"];
const PAIN_POINTS_REST = ["No-shows / cancellations", "Labor scheduling", "Food waste", "Slow nights", "Online reputation", "Social media content", "Inventory tracking", "Staff training"];

export function RestaurantOnboarding({ workspaceId, onComplete }: { workspaceId: string; onComplete: (p: RestaurantProfile) => void }) {
  const [step, setStep] = useState(1);
  const TOTAL = 3;
  const [p, setP] = useState<RestaurantProfile>({
    conceptType: "", cuisineType: "", seatingCapacity: "", locations: "1", yearsOpen: "", avgTicket: "",
    hasDelivery: false, deliveryPlatforms: [], posSystem: "", onlineOrdering: "",
    phone: "", website: "", instagram: "", hoursOpen: "", teamSize: "", painPoints: [],
  });
  const set = (k: keyof RestaurantProfile, v: any) => setP(prev => ({ ...prev, [k]: v }));
  const toggleArr = (k: "deliveryPlatforms" | "painPoints", val: string) =>
    set(k, (p[k] as string[]).includes(val) ? (p[k] as string[]).filter((x: string) => x !== val) : [...(p[k] as string[]), val]);

  const finish = async () => {
    await fetch(`/api/workspaces/${workspaceId}/restaurant-profile`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
    }).catch(() => {});
    onComplete(p);
  };

  return (
    <div style={cardStyle}>
      <div style={{ color: "#F97316", fontSize: 11, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>🍽️ Restaurant Setup · Step {step} of {TOTAL}</div>

      {step === 1 && (
        <>
          <StepHeader step={1} total={TOTAL} title="Tell us about your concept" sub="Your crew will create content, manage reviews, and run promos tailored to your vibe." />
          <label style={labelStyle}>Concept Type</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["Full-Service Restaurant", "Fast Casual", "Food Truck", "Ghost Kitchen", "Bar & Grill", "Café", "Catering", "Bakery"].map(t => (
              <button key={t} onClick={() => set("conceptType", t)} style={chipStyle(p.conceptType === t, "#F97316")}>{t}</button>
            ))}
          </div>
          <label style={labelStyle}>Cuisine Type</label>
          <input style={inputStyle} value={p.cuisineType} onChange={e => set("cuisineType", e.target.value)} placeholder="e.g. Southern BBQ, Mexican, American" />
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Seating Capacity</label>
              <input style={inputStyle} value={p.seatingCapacity} onChange={e => set("seatingCapacity", e.target.value)} placeholder="e.g. 60" />
            </div>
            <div>
              <label style={labelStyle}>Number of Locations</label>
              <input style={inputStyle} value={p.locations} onChange={e => set("locations", e.target.value)} placeholder="1" />
            </div>
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Years in Business</label>
              <input style={inputStyle} value={p.yearsOpen} onChange={e => set("yearsOpen", e.target.value)} placeholder="e.g. 3" />
            </div>
            <div>
              <label style={labelStyle}>Avg Ticket Size ($)</label>
              <input style={inputStyle} value={p.avgTicket} onChange={e => set("avgTicket", e.target.value)} placeholder="e.g. 18" />
            </div>
          </div>
          <button style={btnPrimaryStyle} onClick={() => setStep(2)}>Next →</button>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader step={2} total={TOTAL} title="Tech stack & delivery" sub="Connect your existing tools so your agents can automate the right things." />
          <label style={labelStyle}>POS System</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["Toast", "Square", "Clover", "Lightspeed", "TouchBistro", "Aloha", "Custom / Other"].map(t => (
              <button key={t} onClick={() => set("posSystem", t)} style={chipStyle(p.posSystem === t, "#F97316")}>{t}</button>
            ))}
          </div>
          <label style={labelStyle}>Online Ordering Platform</label>
          <input style={inputStyle} value={p.onlineOrdering} onChange={e => set("onlineOrdering", e.target.value)} placeholder="e.g. Olo, Toast Online, ChowNow" />
          <label style={labelStyle}>Do you offer delivery?</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button onClick={() => set("hasDelivery", true)} style={chipStyle(p.hasDelivery === true, "#F97316")}>Yes</button>
            <button onClick={() => set("hasDelivery", false)} style={chipStyle(p.hasDelivery === false, "#F97316")}>No</button>
          </div>
          {p.hasDelivery && (
            <>
              <label style={labelStyle}>Delivery Platforms</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {DELIVERY_PLATFORMS.map(t => (
                  <button key={t} onClick={() => toggleArr("deliveryPlatforms", t)} style={chipStyle(p.deliveryPlatforms.includes(t), "#F97316")}>{t}</button>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(1)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={() => setStep(3)}>Next →</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeader step={3} total={TOTAL} title="Operations & biggest headaches" sub="Your agents will attack your pain points first." />
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Team Size</label>
              <input style={inputStyle} value={p.teamSize} onChange={e => set("teamSize", e.target.value)} placeholder="e.g. 12" />
            </div>
            <div>
              <label style={labelStyle}>Hours Open</label>
              <input style={inputStyle} value={p.hoursOpen} onChange={e => set("hoursOpen", e.target.value)} placeholder="e.g. Tue–Sun 11am–10pm" />
            </div>
          </div>
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={p.phone} onChange={e => set("phone", e.target.value)} placeholder="(405) 555-0100" />
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Website</label>
              <input style={inputStyle} value={p.website} onChange={e => set("website", e.target.value)} placeholder="https://" />
            </div>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={p.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@yourhandle" />
            </div>
          </div>
          <label style={labelStyle}>Biggest pain points (pick all that apply)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {PAIN_POINTS_REST.map(t => (
              <button key={t} onClick={() => toggleArr("painPoints", t)} style={chipStyle(p.painPoints.includes(t), "#F97316")}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(2)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={finish}>Launch Restaurant Dashboard 🍽️</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── TRADES ONBOARDING ─────────────────────────────────────────────────────────
export interface TradesProfile {
  tradeType: string; licenseNumber: string; licenseState: string;
  yearsExperience: string; teamSize: string; serviceArea: string;
  services: string[]; avgJobSize: string; monthlyJobGoal: string;
  softwareUsed: string; hasInsurance: boolean; bondAmount: string;
  phone: string; website: string; instagram: string;
  painPoints: string[];
}

const TRADE_TYPES = ["General Contractor", "Electrician", "Plumber", "HVAC", "Roofer", "Painter", "Landscaper", "Cleaner", "Handyman", "Flooring", "Concrete", "Fence"];
const TRADES_PAIN = ["Getting leads", "Following up on quotes", "Scheduling jobs", "Collecting payment", "Managing crew", "Reviews & reputation", "Social media", "No-shows / cancellations"];

export function TradesOnboarding({ workspaceId, onComplete }: { workspaceId: string; onComplete: (p: TradesProfile) => void }) {
  const [step, setStep] = useState(1);
  const TOTAL = 3;
  const [p, setP] = useState<TradesProfile>({
    tradeType: "", licenseNumber: "", licenseState: "", yearsExperience: "", teamSize: "", serviceArea: "",
    services: [], avgJobSize: "", monthlyJobGoal: "", softwareUsed: "", hasInsurance: true, bondAmount: "",
    phone: "", website: "", instagram: "", painPoints: [],
  });
  const set = (k: keyof TradesProfile, v: any) => setP(prev => ({ ...prev, [k]: v }));
  const toggleArr = (k: "services" | "painPoints", val: string) =>
    set(k, (p[k] as string[]).includes(val) ? (p[k] as string[]).filter((x: string) => x !== val) : [...(p[k] as string[]), val]);

  const finish = async () => {
    await fetch(`/api/workspaces/${workspaceId}/trades-profile`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
    }).catch(() => {});
    onComplete(p);
  };

  return (
    <div style={cardStyle}>
      <div style={{ color: "#10B981", fontSize: 11, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>🔧 Trades Setup · Step {step} of {TOTAL}</div>

      {step === 1 && (
        <>
          <StepHeader step={1} total={TOTAL} title="Your trade & credentials" sub="Your crew will qualify leads, send quotes, and follow up on jobs in your name." />
          <label style={labelStyle}>Trade / Service Type</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {TRADE_TYPES.map(t => (
              <button key={t} onClick={() => set("tradeType", t)} style={chipStyle(p.tradeType === t, "#10B981")}>{t}</button>
            ))}
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>License Number (if applicable)</label>
              <input style={inputStyle} value={p.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label style={labelStyle}>License State</label>
              <input style={inputStyle} value={p.licenseState} onChange={e => set("licenseState", e.target.value)} placeholder="OK" maxLength={2} />
            </div>
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Years in Business</label>
              <input style={inputStyle} value={p.yearsExperience} onChange={e => set("yearsExperience", e.target.value)} placeholder="e.g. 7" />
            </div>
            <div>
              <label style={labelStyle}>Team Size</label>
              <input style={inputStyle} value={p.teamSize} onChange={e => set("teamSize", e.target.value)} placeholder="e.g. 4" />
            </div>
          </div>
          <label style={labelStyle}>Service Area (cities / zip codes)</label>
          <input style={inputStyle} value={p.serviceArea} onChange={e => set("serviceArea", e.target.value)} placeholder="e.g. OKC, Edmond, Moore, 73034" />
          <label style={labelStyle}>Insured?</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button onClick={() => set("hasInsurance", true)} style={chipStyle(p.hasInsurance === true, "#10B981")}>Yes</button>
            <button onClick={() => set("hasInsurance", false)} style={chipStyle(p.hasInsurance === false, "#10B981")}>No</button>
          </div>
          <button style={btnPrimaryStyle} onClick={() => setStep(2)}>Next →</button>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader step={2} total={TOTAL} title="Jobs & business goals" sub="Your agents will prioritize leads and track jobs based on these numbers." />
          <label style={labelStyle}>What services do you offer?</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["Installations", "Repairs", "Inspections", "Emergency / 24hr", "Maintenance Contracts", "Renovations", "New Construction", "Commercial", "Residential"].map(t => (
              <button key={t} onClick={() => toggleArr("services", t)} style={chipStyle(p.services.includes(t), "#10B981")}>{t}</button>
            ))}
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Avg Job Size ($)</label>
              <input style={inputStyle} value={p.avgJobSize} onChange={e => set("avgJobSize", e.target.value)} placeholder="e.g. 1500" />
            </div>
            <div>
              <label style={labelStyle}>Jobs Per Month Goal</label>
              <input style={inputStyle} value={p.monthlyJobGoal} onChange={e => set("monthlyJobGoal", e.target.value)} placeholder="e.g. 20" />
            </div>
          </div>
          <label style={labelStyle}>Software You Use (if any)</label>
          <input style={inputStyle} value={p.softwareUsed} onChange={e => set("softwareUsed", e.target.value)} placeholder="e.g. Jobber, ServiceTitan, HousecallPro" />
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(1)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={() => setStep(3)}>Next →</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeader step={3} total={TOTAL} title="Contact & biggest headaches" sub="Your agents will focus on fixing these first." />
          <label style={labelStyle}>Business Phone</label>
          <input style={inputStyle} value={p.phone} onChange={e => set("phone", e.target.value)} placeholder="(405) 555-0100" />
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Website</label>
              <input style={inputStyle} value={p.website} onChange={e => set("website", e.target.value)} placeholder="https://" />
            </div>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={p.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@yourhandle" />
            </div>
          </div>
          <label style={labelStyle}>Biggest pain points (pick all that apply)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {TRADES_PAIN.map(t => (
              <button key={t} onClick={() => toggleArr("painPoints", t)} style={chipStyle(p.painPoints.includes(t), "#10B981")}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(2)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={finish}>Launch Trades Dashboard 🔧</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── E-COMMERCE ONBOARDING ─────────────────────────────────────────────────────
export interface EcommerceProfile {
  businessModel: string; platform: string; niche: string;
  avgOrderValue: string; monthlyOrders: string; skuCount: string;
  supplierCountry: string; fulfillmentMethod: string;
  hasStorefront: boolean; storeUrl: string;
  salesChannels: string[]; marketingChannels: string[];
  phone: string; instagram: string; tiktok: string;
  painPoints: string[];
}

const ECOM_CHANNELS = ["Shopify", "Amazon", "Etsy", "eBay", "TikTok Shop", "Facebook Shops", "Walmart", "Own Website"];
const ECOM_MARKETING = ["TikTok Ads", "Meta Ads", "Google Ads", "Influencers", "Email", "SMS", "Organic Social", "SEO"];
const ECOM_PAIN = ["Finding winning products", "Ad spend / ROAS", "Abandoned carts", "Returns & refunds", "Supplier reliability", "Content creation", "Customer service", "Inventory forecasting"];

export function EcommerceOnboarding({ workspaceId, onComplete }: { workspaceId: string; onComplete: (p: EcommerceProfile) => void }) {
  const [step, setStep] = useState(1);
  const TOTAL = 3;
  const [p, setP] = useState<EcommerceProfile>({
    businessModel: "", platform: "", niche: "", avgOrderValue: "", monthlyOrders: "", skuCount: "",
    supplierCountry: "", fulfillmentMethod: "", hasStorefront: false, storeUrl: "",
    salesChannels: [], marketingChannels: [], phone: "", instagram: "", tiktok: "", painPoints: [],
  });
  const set = (k: keyof EcommerceProfile, v: any) => setP(prev => ({ ...prev, [k]: v }));
  const toggleArr = (k: "salesChannels" | "marketingChannels" | "painPoints", val: string) =>
    set(k, (p[k] as string[]).includes(val) ? (p[k] as string[]).filter((x: string) => x !== val) : [...(p[k] as string[]), val]);

  const finish = async () => {
    await fetch(`/api/workspaces/${workspaceId}/ecommerce-profile`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
    }).catch(() => {});
    onComplete(p);
  };

  return (
    <div style={cardStyle}>
      <div style={{ color: "#F59E0B", fontSize: 11, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>🛍️ E-Commerce Setup · Step {step} of {TOTAL}</div>

      {step === 1 && (
        <>
          <StepHeader step={1} total={TOTAL} title="Your store & business model" sub="Your crew will find products, write copy, and manage ads based on how you sell." />
          <label style={labelStyle}>Business Model</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["Dropshipping", "Print on Demand", "Private Label", "Wholesale", "DTC Brand", "Handmade / Artisan", "Digital Products", "Subscription Box"].map(t => (
              <button key={t} onClick={() => set("businessModel", t)} style={chipStyle(p.businessModel === t, "#F59E0B")}>{t}</button>
            ))}
          </div>
          <label style={labelStyle}>Niche / Product Category</label>
          <input style={inputStyle} value={p.niche} onChange={e => set("niche", e.target.value)} placeholder="e.g. Men's Streetwear, Pet Accessories, Home Decor" />
          <label style={labelStyle}>Primary Platform / Store Builder</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["Shopify", "WooCommerce", "BigCommerce", "Wix", "Squarespace", "Custom", "None yet"].map(t => (
              <button key={t} onClick={() => set("platform", t)} style={chipStyle(p.platform === t, "#F59E0B")}>{t}</button>
            ))}
          </div>
          {p.platform && p.platform !== "None yet" && (
            <>
              <label style={labelStyle}>Store URL</label>
              <input style={inputStyle} value={p.storeUrl} onChange={e => set("storeUrl", e.target.value)} placeholder="https://yourstore.com" />
            </>
          )}
          <label style={labelStyle}>Fulfillment Method</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["Self-fulfilled", "3PL / Warehouse", "Amazon FBA", "Supplier ships direct", "Print-on-demand partner"].map(t => (
              <button key={t} onClick={() => set("fulfillmentMethod", t)} style={chipStyle(p.fulfillmentMethod === t, "#F59E0B")}>{t}</button>
            ))}
          </div>
          <button style={btnPrimaryStyle} onClick={() => setStep(2)}>Next →</button>
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader step={2} total={TOTAL} title="Sales channels & numbers" sub="Your agents will optimize your top channels and flag opportunities on others." />
          <label style={labelStyle}>Where do you sell?</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {ECOM_CHANNELS.map(t => (
              <button key={t} onClick={() => toggleArr("salesChannels", t)} style={chipStyle(p.salesChannels.includes(t), "#F59E0B")}>{t}</button>
            ))}
          </div>
          <label style={labelStyle}>How do you market?</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {ECOM_MARKETING.map(t => (
              <button key={t} onClick={() => toggleArr("marketingChannels", t)} style={chipStyle(p.marketingChannels.includes(t), "#F59E0B")}>{t}</button>
            ))}
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Avg Order Value ($)</label>
              <input style={inputStyle} value={p.avgOrderValue} onChange={e => set("avgOrderValue", e.target.value)} placeholder="e.g. 45" />
            </div>
            <div>
              <label style={labelStyle}>Orders / Month</label>
              <input style={inputStyle} value={p.monthlyOrders} onChange={e => set("monthlyOrders", e.target.value)} placeholder="e.g. 200" />
            </div>
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}># of SKUs</label>
              <input style={inputStyle} value={p.skuCount} onChange={e => set("skuCount", e.target.value)} placeholder="e.g. 30" />
            </div>
            <div>
              <label style={labelStyle}>Supplier Country</label>
              <input style={inputStyle} value={p.supplierCountry} onChange={e => set("supplierCountry", e.target.value)} placeholder="e.g. China, USA, Mexico" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(1)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={() => setStep(3)}>Next →</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <StepHeader step={3} total={TOTAL} title="Socials & pain points" sub="Your content agent will post to these, and your ops agent will tackle these headaches first." />
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={p.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@yourhandle" />
            </div>
            <div>
              <label style={labelStyle}>TikTok</label>
              <input style={inputStyle} value={p.tiktok} onChange={e => set("tiktok", e.target.value)} placeholder="@yourhandle" />
            </div>
          </div>
          <label style={labelStyle}>Biggest pain points (pick all that apply)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {ECOM_PAIN.map(t => (
              <button key={t} onClick={() => toggleArr("painPoints", t)} style={chipStyle(p.painPoints.includes(t), "#F59E0B")}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnSecondaryStyle, flex: 1 }} onClick={() => setStep(2)}>← Back</button>
            <button style={{ ...btnPrimaryStyle, flex: 2 }} onClick={finish}>Launch E-Commerce Dashboard 🛍️</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── GENERAL BUSINESS ONBOARDING ──────────────────────────────────────────────
export interface GeneralProfile {
  businessType: string; industry: string; yearsInBusiness: string;
  teamSize: string; revenueRange: string; serviceArea: string;
  services: string; targetCustomer: string;
  phone: string; website: string; instagram: string;
  painPoints: string[];
}

const GENERAL_PAIN = ["Getting new customers", "Marketing & content", "Following up on leads", "Customer retention", "Admin & paperwork", "Hiring & HR", "Cash flow", "Online reviews"];

export function GeneralOnboarding({ workspaceId, onComplete }: { workspaceId: string; onComplete: (p: GeneralProfile) => void }) {
  const [p, setP] = useState<GeneralProfile>({
    businessType: "", industry: "", yearsInBusiness: "", teamSize: "", revenueRange: "", serviceArea: "",
    services: "", targetCustomer: "", phone: "", website: "", instagram: "", painPoints: [],
  });
  const set = (k: keyof GeneralProfile, v: any) => setP(prev => ({ ...prev, [k]: v }));
  const togglePain = (val: string) =>
    set("painPoints", p.painPoints.includes(val) ? p.painPoints.filter((x: string) => x !== val) : [...p.painPoints, val]);

  const finish = async () => {
    await fetch(`/api/workspaces/${workspaceId}/general-profile`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
    }).catch(() => {});
    onComplete(p);
  };

  return (
    <div style={cardStyle}>
      <div style={{ color: "#6B7280", fontSize: 11, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>🏢 Business Setup</div>
      <StepHeader step={1} total={1} title="Tell us about your business" sub="Your crew will be deployed around your specific goals and pain points." />
      <label style={labelStyle}>Business Type</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {["Service Business", "Product Business", "Consulting", "Agency", "Freelance", "Non-Profit", "Startup"].map(t => (
          <button key={t} onClick={() => set("businessType", t)} style={chipStyle(p.businessType === t, "#6B7280")}>{t}</button>
        ))}
      </div>
      <label style={labelStyle}>Industry</label>
      <input style={inputStyle} value={p.industry} onChange={e => set("industry", e.target.value)} placeholder="e.g. Marketing, Healthcare, Finance, Education" />
      <label style={labelStyle}>What do you sell / offer?</label>
      <input style={inputStyle} value={p.services} onChange={e => set("services", e.target.value)} placeholder="Briefly describe your product or service" />
      <label style={labelStyle}>Who is your target customer?</label>
      <input style={inputStyle} value={p.targetCustomer} onChange={e => set("targetCustomer", e.target.value)} placeholder="e.g. Small businesses, homeowners, parents" />
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Years in Business</label>
          <input style={inputStyle} value={p.yearsInBusiness} onChange={e => set("yearsInBusiness", e.target.value)} placeholder="e.g. 2" />
        </div>
        <div>
          <label style={labelStyle}>Team Size</label>
          <input style={inputStyle} value={p.teamSize} onChange={e => set("teamSize", e.target.value)} placeholder="e.g. 5" />
        </div>
      </div>
      <label style={labelStyle}>Annual Revenue Range</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {["Pre-revenue", "Under $50K", "$50K–$250K", "$250K–$1M", "$1M–$5M", "$5M+"].map(t => (
          <button key={t} onClick={() => set("revenueRange", t)} style={chipStyle(p.revenueRange === t, "#6B7280")}>{t}</button>
        ))}
      </div>
      <label style={labelStyle}>Phone</label>
      <input style={inputStyle} value={p.phone} onChange={e => set("phone", e.target.value)} placeholder="(405) 555-0100" />
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Website</label>
          <input style={inputStyle} value={p.website} onChange={e => set("website", e.target.value)} placeholder="https://" />
        </div>
        <div>
          <label style={labelStyle}>Instagram</label>
          <input style={inputStyle} value={p.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@yourhandle" />
        </div>
      </div>
      <label style={labelStyle}>Biggest pain points (pick all that apply)</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {GENERAL_PAIN.map(t => (
          <button key={t} onClick={() => togglePain(t)} style={chipStyle(p.painPoints.includes(t), "#6B7280")}>{t}</button>
        ))}
      </div>
      <button style={btnPrimaryStyle} onClick={finish}>Launch My Dashboard 🏢</button>
    </div>
  );
}