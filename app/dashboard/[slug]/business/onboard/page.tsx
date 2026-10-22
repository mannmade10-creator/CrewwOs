"use client";
/**
 * app/dashboard/[slug]/business/onboard/page.tsx
 * CrewwOS for Business — 5-step onboarding wizard
 */

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const INDUSTRIES = [
  "Auto Shop", "Barbershop / Salon", "Cleaning Service", "Construction",
  "Electrician", "HVAC", "Landscaping / Lawn Care", "Plumbing",
  "Pest Control", "Roofing", "Food Truck / Catering", "Retail",
  "Staffing Agency", "Trucking / Logistics", "Other",
];

function IndustryDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "#060612", border: "1px solid #ffffff22", borderRadius: 10, padding: "12px 14px", color: value ? "#fff" : "rgba(255,255,255,0.35)", fontSize: 14, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
        {value || "Select your industry…"}<span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#0d0d1a", border: "1px solid #ffffff22", borderRadius: 10, zIndex: 9999, maxHeight: 240, overflowY: "auto" }}>
          {INDUSTRIES.map(i => (
            <div key={i} onMouseDown={e => { e.preventDefault(); onChange(i); setOpen(false); }} style={{ padding: "10px 14px", fontSize: 13, color: "#fff", cursor: "pointer", background: value === i ? "rgba(0,212,255,0.08)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {i}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10MB."); return; }
    setUploading(true); setError("");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/business/upload-logo", { method: "POST", body: fd });
    const { url } = await res.json();
    onChange(url); setUploading(false);
  }
  return (
    <div>
      {value && <img src={value} style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", marginBottom: 8, border: "1px solid rgba(255,255,255,0.12)" }} />}
      <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }} style={{ border: "1px dashed rgba(0,212,255,0.4)", borderRadius: 10, padding: "20px", textAlign: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13, background: "rgba(0,212,255,0.04)" }}>
        {uploading ? "Uploading…" : value ? "Replace logo" : "Upload business logo"}
      </div>
      {error && <p style={{ color: "#ff9999", fontSize: 12, marginTop: 6 }}>{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

export default function BusinessOnboard() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string ?? "";

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [yelpUrl, setYelpUrl] = useState("");
  const [ein, setEin] = useState("");

  const STEPS = ["Business Info", "Logo & Brand", "Online Presence", "EIN / Tax ID", "All set!"];

  async function saveStep(nextStep: number, complete = false) {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/business/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName, industry, phone_number: phone, website,
          logo_url: logoUrl, google_business_url: googleUrl, yelp_url: yelpUrl, ein,
          onboarding_step: Math.min(nextStep, 5),
          onboarding_complete: complete,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Save failed"); }
      if (complete) router.push(`/dashboard/${slug}/business`);
      else setStep(nextStep);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Step bar */}
        <div style={{ color: "#00D4FF", fontSize: 12, letterSpacing: 3, marginBottom: 12, textAlign: "center" }}>
          CREWWOS · STEP {step} OF {STEPS.length}
        </div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 4, marginBottom: 24 }}>
          <div style={{ background: "linear-gradient(90deg, #00D4FF, #0066FF)", height: "100%", borderRadius: 4, width: `${progress}%`, transition: "width 0.3s" }} />
        </div>

        <div style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, overflow: "visible" }}>
          {error && <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 16, background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,0,0,0.15)", borderRadius: 8, padding: "10px 14px" }}>{error}</div>}

          {/* Step 1: Business Info */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🏢</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Tell us about your business</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24, textAlign: "center", lineHeight: 1.6 }}>Your agents will use this to introduce your business, route calls, and close jobs.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={L}>Business Name *</label>
                  <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Mann's HVAC Services" style={I} />
                </div>
                <div>
                  <label style={L}>Industry *</label>
                  <IndustryDropdown value={industry} onChange={setIndustry} />
                </div>
                <div>
                  <label style={L}>Business Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(405) 555-0100" style={I} />
                </div>
                <div>
                  <label style={L}>Website (optional)</label>
                  <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbusiness.com" style={I} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Logo */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🖼️</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Upload your logo</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24, textAlign: "center", lineHeight: 1.6 }}>Your agents will use this on emails, proposals, and invoices.</p>
              <LogoUpload value={logoUrl} onChange={setLogoUrl} />
            </div>
          )}

          {/* Step 3: Online Presence */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🌐</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Connect your online presence</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24, textAlign: "center", lineHeight: 1.6 }}>ReviewAgent monitors and responds to reviews. LocalAgent improves your search ranking.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={L}>Google Business Profile URL</label>
                  <input value={googleUrl} onChange={e => setGoogleUrl(e.target.value)} placeholder="https://business.google.com/..." style={I} />
                </div>
                <div>
                  <label style={L}>Yelp Profile URL (optional)</label>
                  <input value={yelpUrl} onChange={e => setYelpUrl(e.target.value)} placeholder="https://yelp.com/biz/..." style={I} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: EIN */}
          {step === 4 && (
            <div>
              <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>🔢</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>EIN / Federal Tax ID</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24, textAlign: "center", lineHeight: 1.6 }}>Your EIN is used on invoices and tax filings. InvoiceAgent will include it automatically.</p>
              <div>
                <label style={L}>EIN (optional — can add later)</label>
                <input value={ein} onChange={e => setEin(e.target.value)} placeholder="XX-XXXXXXX" style={I} />
              </div>
              <div style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 10, padding: "14px 16px", marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#00D4FF", marginBottom: 4 }}>🆓 Don't have an EIN yet?</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                  Apply free at IRS.gov — takes about 5 minutes.{" "}
                  <a href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" target="_blank" rel="noopener noreferrer" style={{ color: "#00D4FF", textDecoration: "underline" }}>Apply on IRS.gov ↗</a>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: All set */}
          {step === 5 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{businessName} is live!</h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                Your crew is ready. Connect your email, calendar, and Google Business to give your agents what they need to start working.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {step > 1 && step < 5 && (
              <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                ← Back
              </button>
            )}
            {step < 4 && (
              <button onClick={() => saveStep(step + 1)} disabled={saving || (step === 1 && (!businessName.trim() || !industry))} style={{ flex: 2, background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", borderRadius: 10, padding: 12, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Save & Continue →"}
              </button>
            )}
            {step === 4 && (
              <>
                <button onClick={() => saveStep(5)} disabled={saving} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  Skip
                </button>
                <button onClick={() => saveStep(5)} disabled={saving} style={{ flex: 2, background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", borderRadius: 10, padding: 12, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving…" : "Save & Continue →"}
                </button>
              </>
            )}
            {step === 5 && (
              <button onClick={() => saveStep(5, true)} disabled={saving} style={{ flex: 1, background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", borderRadius: 10, padding: 12, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {saving ? "Launching…" : "Go to dashboard →"}
              </button>
            )}
          </div>
          {step < 5 && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={() => saveStep(step + 1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer" }}>Skip this step</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const L: React.CSSProperties = { display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 };
const I: React.CSSProperties = { width: "100%", background: "#060612", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };
