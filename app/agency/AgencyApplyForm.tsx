"use client";
// app/agency/AgencyApplyForm.tsx
// Client component — handles the agency application form with fetch + success state.

import { useState, useRef } from "react";

const color = "#00D4FF";
const colorAlt = "#A855F7";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "#060612",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#fff",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(255,255,255,0.55)",
  marginBottom: 6,
  fontWeight: 600,
};

export default function AgencyApplyForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);

    const payload = {
      name:        fd.get("name") as string,
      email:       fd.get("email") as string,
      company:     fd.get("company") as string,
      phone:       fd.get("phone") as string,
      plan:        fd.get("plan") as string,       // matches API route
      clientCount: fd.get("clientCount") as string,
      message:     fd.get("message") as string,
    };

    try {
      const res = await fetch("/api/agency/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      formRef.current?.reset();
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message ?? "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div style={{
        background: "#0a0a1a",
        border: `1px solid ${color}33`,
        borderRadius: 24,
        padding: "60px 40px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Application received!</h3>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 24px" }}>
          We review every application personally and will follow up within 48 hours. Check your inbox for a confirmation email.
        </p>
        <button
          onClick={() => setStatus("idle")}
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" }}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a1a", border: `1px solid ${color}22`, borderRadius: 24, padding: 40 }}>
      <form ref={formRef} onSubmit={handleSubmit}>
        {/* Name + Email */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={LABEL_STYLE}>Your name *</label>
            <input name="name" type="text" placeholder="Kenneth Covington" required style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Email *</label>
            <input name="email" type="email" placeholder="you@youragency.com" required style={INPUT_STYLE} />
          </div>
        </div>

        {/* Company + Phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={LABEL_STYLE}>Agency / company name *</label>
            <input name="company" type="text" placeholder="Made Technologies Inc." required style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Phone number</label>
            <input name="phone" type="tel" placeholder="(405) 555-0100" style={INPUT_STYLE} />
          </div>
        </div>

        {/* Plan */}
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Which plan are you interested in? *</label>
          <select name="plan" required style={{ ...INPUT_STYLE, appearance: "none" as any }}>
            <option value="">Select a plan</option>
            <option value="Agency Starter">Agency Starter — $497/mo (up to 5 clients)</option>
            <option value="Agency Pro">Agency Pro — $1,197/mo (up to 25 clients)</option>
            <option value="Agency Enterprise">Agency Enterprise — Custom pricing</option>
          </select>
        </div>

        {/* Client count */}
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>How many clients in your first 90 days?</label>
          <input name="clientCount" type="text" placeholder="e.g. 3–5 clients" style={INPUT_STYLE} />
        </div>

        {/* Message */}
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL_STYLE}>Tell us about your agency</label>
          <textarea
            name="message"
            rows={3}
            placeholder="What kind of clients do you serve? What's your current setup?"
            style={{ ...INPUT_STYLE, resize: "vertical" as any, lineHeight: 1.5 }}
          />
        </div>

        {/* Error */}
        {status === "error" && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fca5a5", marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            width: "100%",
            background: status === "loading"
              ? "rgba(255,255,255,0.1)"
              : `linear-gradient(135deg, ${color}, ${colorAlt})`,
            color: status === "loading" ? "rgba(255,255,255,0.4)" : "#000",
            fontWeight: 800,
            fontSize: 15,
            padding: "14px",
            borderRadius: 12,
            border: "none",
            cursor: status === "loading" ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
          }}
        >
          {status === "loading" ? "Submitting…" : "Submit Application →"}
        </button>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
          We review every application within 48 hours.
        </div>
      </form>

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        input:focus, textarea:focus, select:focus { border-color: ${color}55 !important; }
        select option { background: #0d0d20; }
      `}</style>
    </div>
  );
}
