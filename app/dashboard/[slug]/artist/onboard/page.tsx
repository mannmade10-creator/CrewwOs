"use client";
/**
 * app/dashboard/[slug]/artist/onboard/page.tsx
 * CrewwOS Artist Onboarding Wizard — 6-step setup flow
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* ── types ─────────────────────────────────────────────────────────────────── */
interface FormData {
  stage_name: string; legal_name: string; genre: string; bio: string; photo_url: string;
  distrokid_artist_id: string; spotify_artist_url: string; apple_artist_url: string;
  bmi_registered: boolean; ascap_registered: boolean; soundexchange_registered: boolean;
  instagram_handle: string; tiktok_handle: string; twitter_handle: string; youtube_channel: string;
  track_title: string; track_type: string; track_release_date: string; track_spotify_url: string;
  phone_number: string; qr_link: string;
}

const DEFAULTS: FormData = {
  stage_name: "", legal_name: "", genre: "", bio: "", photo_url: "",
  distrokid_artist_id: "", spotify_artist_url: "", apple_artist_url: "",
  bmi_registered: false, ascap_registered: false, soundexchange_registered: false,
  instagram_handle: "", tiktok_handle: "", twitter_handle: "", youtube_channel: "",
  track_title: "", track_type: "single", track_release_date: "", track_spotify_url: "",
  phone_number: "", qr_link: "",
};

const GENRES = [
  "Hip-Hop / Rap", "R&B / Soul", "Pop", "Gospel / Christian",
  "Afrobeats", "Reggae / Dancehall", "Electronic / EDM",
  "Rock", "Country", "Jazz", "Classical", "Latin", "Other",
];

const STEPS = [
  { num: 1, title: "Artist Identity",   icon: "🎤", desc: "Your name, genre, and bio" },
  { num: 2, title: "Distribution",       icon: "💾", desc: "Connect your distributor & DSPs" },
  { num: 3, title: "PRO Registration",   icon: "⚖️", desc: "Royalties — BMI, ASCAP, SoundExchange" },
  { num: 4, title: "Social Media",       icon: "📲", desc: "Link your social platforms" },
  { num: 5, title: "First Track",        icon: "🎵", desc: "Add your first release" },
  { num: 6, title: "Fan Capture",        icon: "❤️", desc: "Set up your fan-capture phone & QR" },
];

/* ── Genre dropdown ─────────────────────────────────────────────────────────── */
function GenreDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
          padding: "10px 14px", color: value ? "#fff" : "rgba(255,255,255,0.35)",
          fontSize: 14, textAlign: "left", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        {value || "Select a genre…"}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          marginTop: 4, zIndex: 9999,
          background: "#1e1e35", border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.85)",
          maxHeight: 260, overflowY: "auto",
        }}>
          {GENRES.map((g) => (
            <div
              key={g}
              onMouseDown={(e) => { e.preventDefault(); onChange(g); setOpen(false); }}
              style={{
                padding: "11px 14px", fontSize: 14, cursor: "pointer",
                color: g === value ? "#a855f7" : "rgba(255,255,255,0.85)",
                background: g === value ? "rgba(168,85,247,0.12)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = g === value ? "rgba(168,85,247,0.12)" : "transparent")}
            >
              {g}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Photo upload component ─────────────────────────────────────────────────── */
function PhotoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10MB."); return; }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/artist/upload-photo", { method: "POST", body: formData });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Upload failed"); }
      const { url } = await res.json();
      onChange(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {/* Preview */}
      {value && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Press photo" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.12)" }} />
          <div>
            <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>✓ Photo uploaded</div>
            <button type="button" onClick={() => onChange("")} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}>Remove</button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#a855f7"; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        style={{
          border: "2px dashed rgba(255,255,255,0.12)", borderRadius: 10,
          padding: "20px 16px", textAlign: "center", cursor: uploading ? "default" : "pointer",
          background: "rgba(255,255,255,0.02)", transition: "border-color 0.2s",
        }}
      >
        {uploading ? (
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
            <div style={{ width: 20, height: 20, border: "2px solid rgba(168,85,247,0.3)", borderTop: "2px solid #a855f7", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
            Uploading…
          </div>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{value ? "Replace photo" : "Upload press photo"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Click to browse or drag & drop · JPG, PNG, WEBP · Max 10MB</div>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {error && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>⚠️ {error}</div>}
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────────────────── */
export default function ArtistOnboard() {
  const params = useParams();
  const router = useRouter();
  const slug   = params?.slug as string ?? "";
  const base   = `/dashboard/${slug}/artist`;

  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState<FormData>(DEFAULTS);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/artist/onboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          const p = d.profile;
          setForm((f) => ({
            ...f,
            stage_name: p.stage_name ?? "", legal_name: p.legal_name ?? "",
            genre: p.genre ?? "", bio: p.bio ?? "", photo_url: p.photo_url ?? "",
            distrokid_artist_id: p.distrokid_artist_id ?? "",
            spotify_artist_url: p.spotify_artist_url ?? "",
            apple_artist_url: p.apple_artist_url ?? "",
            bmi_registered: p.bmi_registered ?? false,
            ascap_registered: p.ascap_registered ?? false,
            soundexchange_registered: p.soundexchange_registered ?? false,
            instagram_handle: p.instagram_handle ?? "", tiktok_handle: p.tiktok_handle ?? "",
            twitter_handle: p.twitter_handle ?? "", youtube_channel: p.youtube_channel ?? "",
            phone_number: p.phone_number ?? "", qr_link: p.qr_link ?? "",
          }));
          if (p.onboarding_step > 1 && !p.onboarding_complete) setStep(p.onboarding_step);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof FormData, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function saveStep(nextStep: number, complete = false) {
    setSaving(true); setError("");
    try {
      // clamp so we never send step=7; when completing, keep step=6
      const stepToSave = complete ? 6 : Math.min(nextStep, 6);
      const body: Record<string, unknown> = { ...form, onboarding_step: stepToSave, onboarding_complete: complete };
      if (step === 5 && form.track_title) {
        body.track = { title: form.track_title, type: form.track_type, release_date: form.track_release_date || null, spotify_url: form.track_spotify_url || null, distributed: !!form.distrokid_artist_id };
      }
      const res = await fetch("/api/artist/onboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `HTTP ${res.status}`); }
      complete ? router.push(base) : setStep(nextStep);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div style={s.centered}>
      <div style={s.spinner} />
      <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 16, fontSize: 14 }}>Loading your profile...</p>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={{ padding: "20px 32px 0" }}>
        <a href={base} style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, textDecoration: "none" }}>← Back to Artist Dashboard</a>
      </div>

      <div style={s.header}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Artist Onboarding</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, margin: "6px 0 0" }}>Set up your CrewwOS label in 6 steps</p>
      </div>

      <div style={s.stepBar}>
        {STEPS.map((st) => (
          <div key={st.num} style={{ ...s.stepDot, ...(st.num === step ? s.stepDotActive : {}), ...(st.num < step ? s.stepDotDone : {}) }} onClick={() => st.num < step && setStep(st.num)}>
            <div style={s.dotCircle}>{st.num < step ? "✓" : st.num === step ? <span style={{ color: "#a855f7" }}>{st.num}</span> : st.num}</div>
            <div style={{ fontSize: 11, marginTop: 6, color: st.num === step ? "#a855f7" : st.num < step ? "#22c55e" : "rgba(255,255,255,0.3)", fontWeight: 600 }}>{st.title}</div>
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={{ ...s.card, overflow: "visible" }}>
        <div style={s.cardHead}>
          <span style={{ fontSize: 28 }}>{STEPS[step - 1].icon}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Step {step}: {STEPS[step - 1].title}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{STEPS[step - 1].desc}</div>
          </div>
        </div>

        {step === 1 && (
          <div style={s.fields}>
            <Field label="Stage Name *" hint="Your artist name as it appears on streaming platforms">
              <input style={s.input} value={form.stage_name} onChange={(e) => set("stage_name", e.target.value)} placeholder="e.g. Lil Nas X" />
            </Field>
            <Field label="Legal Name" hint="Used for royalty registrations (kept private)">
              <input style={s.input} value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} placeholder="First Last" />
            </Field>
            <Field label="Genre *">
              <GenreDropdown value={form.genre} onChange={(v) => set("genre", v)} />
            </Field>
            <Field label="Artist Bio" hint="2–3 sentences. Used in your EPK and press releases.">
              <textarea style={{ ...s.input, height: 100, resize: "vertical" }} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Tell your story..." />
            </Field>
            <Field label="Press Photo" hint="High-res photo used in your EPK, press releases, and promo content.">
              <PhotoUpload value={form.photo_url} onChange={(url) => set("photo_url", url)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div style={s.fields}>
            <div style={s.infoBox}>💾 <strong>DistroKid</strong> distributes your music to 150+ platforms. If you don&apos;t have an account yet, <a href="https://distrokid.com" target="_blank" rel="noreferrer" style={{ color: "#a855f7" }}>sign up at distrokid.com</a>.</div>
            <Field label="DistroKid Artist ID" hint="Found in your DistroKid dashboard → Account settings"><input style={s.input} value={form.distrokid_artist_id} onChange={(e) => set("distrokid_artist_id", e.target.value)} placeholder="e.g. 1234567" /></Field>
            <Field label="Spotify Artist URL" hint="e.g. https://open.spotify.com/artist/..."><input style={s.input} value={form.spotify_artist_url} onChange={(e) => set("spotify_artist_url", e.target.value)} placeholder="https://open.spotify.com/artist/..." /></Field>
            <Field label="Apple Music Artist URL" hint="e.g. https://music.apple.com/artist/..."><input style={s.input} value={form.apple_artist_url} onChange={(e) => set("apple_artist_url", e.target.value)} placeholder="https://music.apple.com/..." /></Field>
            <div style={s.infoBox}>💡 <strong>Tip:</strong> You can skip these now and add them later after your first release is distributed.</div>
          </div>
        )}

        {step === 3 && (
          <div style={s.fields}>
            <div style={s.infoBox}>⚖️ <strong>PRO registration</strong> is how you collect performance royalties every time your music plays on radio, TV, streaming, or in public.</div>
            {[
              { key: "bmi_registered" as const, label: "BMI — Broadcast Music Inc.", desc: "Free to join. Best for indie artists. Pays quarterly.", url: "https://www.bmi.com/join" },
              { key: "ascap_registered" as const, label: "ASCAP — American Society of Composers", desc: "One-time $50 fee. Strong advocacy and support.", url: "https://www.ascap.com/music-creators/join" },
              { key: "soundexchange_registered" as const, label: "SoundExchange", desc: "Collects digital radio royalties (Pandora, SiriusXM). Free.", url: "https://www.soundexchange.com/artist-copyright-owner/register/" },
            ].map((pro) => (
              <div key={pro.key} style={s.proRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{pro.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{pro.desc}</div>
                  {!form[pro.key] && <a href={pro.url} target="_blank" rel="noreferrer" style={{ color: "#a855f7", fontSize: 12, fontWeight: 600 }}>Register on their site →</a>}
                </div>
                <label style={s.toggle}>
                  <input type="checkbox" checked={!!form[pro.key]} onChange={(e) => set(pro.key, e.target.checked)} style={{ display: "none" }} />
                  <div style={{ ...s.toggleTrack, ...(form[pro.key] ? s.toggleOn : {}) }}><div style={{ ...s.toggleThumb, ...(form[pro.key] ? s.toggleThumbOn : {}) }} /></div>
                  <span style={{ fontSize: 12, color: form[pro.key] ? "#22c55e" : "rgba(255,255,255,0.3)", fontWeight: 600, marginLeft: 8 }}>{form[pro.key] ? "Registered ✓" : "Not yet"}</span>
                </label>
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div style={s.fields}>
            <div style={s.infoBox}>📲 Connecting your social handles lets CrewwOS agents auto-generate content, track engagement, and post on your behalf (with your approval).</div>
            {[
              { key: "instagram_handle" as const, label: "Instagram Handle", placeholder: "@yourname", icon: "📸" },
              { key: "tiktok_handle" as const, label: "TikTok Handle", placeholder: "@yourname", icon: "🎵" },
              { key: "twitter_handle" as const, label: "X / Twitter Handle", placeholder: "@yourname", icon: "🐦" },
              { key: "youtube_channel" as const, label: "YouTube Channel URL", placeholder: "https://youtube.com/@...", icon: "▶️" },
            ].map((social) => (
              <Field key={social.key} label={`${social.icon} ${social.label}`}>
                <input style={s.input} value={form[social.key]} onChange={(e) => set(social.key, e.target.value)} placeholder={social.placeholder} />
              </Field>
            ))}
          </div>
        )}

        {step === 5 && (
          <div style={s.fields}>
            <div style={s.infoBox}>🎵 Add your first release so CrewwOS agents can start pitching, generating promo content, and tracking streams.</div>
            <Field label="Track Title *"><input style={s.input} value={form.track_title} onChange={(e) => set("track_title", e.target.value)} placeholder="e.g. Gravity" /></Field>
            <Field label="Release Type">
              <select style={s.input} value={form.track_type} onChange={(e) => set("track_type", e.target.value)}>
                <option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option><option value="mixtape">Mixtape</option>
              </select>
            </Field>
            <Field label="Release Date" hint="Leave blank if not released yet"><input style={s.input} type="date" value={form.track_release_date} onChange={(e) => set("track_release_date", e.target.value)} /></Field>
            <Field label="Spotify Track URL" hint="Paste the link once it's live"><input style={s.input} value={form.track_spotify_url} onChange={(e) => set("track_spotify_url", e.target.value)} placeholder="https://open.spotify.com/track/..." /></Field>
          </div>
        )}

        {step === 6 && (
          <div style={s.fields}>
            <div style={s.infoBox}>❤️ <strong>Nia</strong> captures fans automatically. Share your QR link at shows, on flyers, or in your bio — fans text in and Nia sends them a welcome message instantly.</div>
            <Field label="Artist Phone Number" hint="The number fans text to opt in — can be your real number or a Twilio number">
              <input style={s.input} value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} placeholder="+1 (405) 555-0100" />
            </Field>
            <Field label="Fan QR Link" hint="We'll generate this automatically once your profile is live">
              <input style={{ ...s.input, opacity: form.qr_link ? 1 : 0.5 }} value={form.qr_link} onChange={(e) => set("qr_link", e.target.value)} placeholder="https://crewwos.com/fan/your-name" readOnly={!form.qr_link} />
            </Field>
            <div style={{ ...s.infoBox, borderColor: "rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.06)" }}>🚀 After you finish setup, your Nia agent goes live and your QR code is generated. Share it everywhere.</div>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#ef4444", marginTop: 16 }}>⚠️ {error}</div>
        )}

        <div style={s.navRow}>
          {step > 1 && <button onClick={() => setStep(step - 1)} style={s.backBtn} disabled={saving}>← Back</button>}
          <div style={{ flex: 1 }} />
          {step < 6 && <button onClick={() => saveStep(step + 1)} style={s.skipBtn} disabled={saving}>Skip for now</button>}
          <button
            onClick={() => step === 6 ? saveStep(6, true) : saveStep(step + 1)}
            style={{ ...s.nextBtn, opacity: saving ? 0.6 : 1 }}
            disabled={saving || (step === 1 && !form.stage_name)}
          >
            {saving ? "Saving…" : step === 6 ? "🚀 Launch my label!" : "Save & Continue →"}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Step {step} of {STEPS.length}</div>
    </div>
  );
}

/* ── Field wrapper ───────────────────────────────────────────────────────────── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "rgba(255,255,255,0.8)" }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 8px" }}>{hint}</p>}
      {children}
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:          { background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", paddingBottom: 80 },
  centered:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", padding: "80px 32px" },
  spinner:       { width: 36, height: 36, border: "3px solid rgba(168,85,247,0.2)", borderTop: "3px solid #a855f7", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  header:        { padding: "20px 32px 24px" },
  stepBar:       { display: "flex", justifyContent: "center", gap: 0, padding: "0 32px 32px", overflowX: "auto" },
  stepDot:       { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80, cursor: "default", position: "relative" },
  stepDotActive: { cursor: "default" },
  stepDotDone:   { cursor: "pointer" },
  dotCircle:     { width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)" },
  card:          { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px", margin: "0 32px" },
  cardHead:      { display: "flex", alignItems: "flex-start", gap: 16, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 },
  fields:        { display: "flex", flexDirection: "column" },
  input:         { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, boxSizing: "border-box" as const, outline: "none" },
  infoBox:       { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 20 },
  proRow:        { display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  toggle:        { display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0 },
  toggleTrack:   { width: 40, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", position: "relative" as const, transition: "background 0.2s" },
  toggleOn:      { background: "rgba(34,197,94,0.3)", borderColor: "#22c55e" },
  toggleThumb:   { width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.4)", position: "absolute" as const, top: 2, left: 2, transition: "left 0.2s" },
  toggleThumbOn: { left: 20, background: "#22c55e" },
  navRow:        { display: "flex", alignItems: "center", gap: 12, marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" },
  backBtn:       { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 13, padding: "10px 20px", borderRadius: 8, cursor: "pointer" },
  skipBtn:       { background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 13, padding: "10px 12px", cursor: "pointer" },
  nextBtn:       { background: "linear-gradient(135deg, #a855f7, #f43f8e)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 28px", borderRadius: 8, border: "none", cursor: "pointer" },
};
