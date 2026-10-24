"use client";

import { useState } from "react";
import React from "react";

export interface MusicArtistProfile {
  // Identity
  stageName: string;
  legalName: string;
  artistType: "solo" | "duo" | "group" | "producer" | "dj" | "";
  genres: string[];
  bio: string;
  // PRO / Business
  proAffiliation: "ascap" | "bmi" | "sesac" | "soundexchange" | "none" | "";
  proNumber: string;
  ipiNumber: string;
  hasPublisher: boolean;
  publisherName: string;
  hasLabel: boolean;
  labelName: string;
  // Socials
  instagram: string;
  twitter: string;
  tiktok: string;
  youtube: string;
  facebook: string;
  website: string;
  // Streaming
  spotify: string;
  appleMusic: string;
  soundcloud: string;
  audiomack: string;
  tidal: string;
  // Press kit
  pressPhotoUrl: string;
  epkHeadline: string;
  achievements: string;
  contactEmail: string;
  bookingEmail: string;
}

const GENRES = [
  "Hip-Hop / Rap", "R&B / Soul", "Pop", "Rock", "Country", "Gospel / Christian",
  "Jazz", "Blues", "Electronic / EDM", "Latin", "Reggae / Dancehall", "Afrobeats",
  "Classical", "Folk / Americana", "Metal", "Indie", "Alternative", "Other",
];

const ARTIST_TYPES = [
  { id: "solo", label: "Solo Artist" },
  { id: "duo", label: "Duo" },
  { id: "group", label: "Group / Band" },
  { id: "producer", label: "Producer" },
  { id: "dj", label: "DJ" },
];

const PRO_OPTIONS = [
  { id: "ascap", label: "ASCAP", desc: "American Society of Composers, Authors and Publishers" },
  { id: "bmi", label: "BMI", desc: "Broadcast Music, Inc." },
  { id: "sesac", label: "SESAC", desc: "Society of European Stage Authors & Composers" },
  { id: "soundexchange", label: "SoundExchange", desc: "Digital performance royalties" },
  { id: "none", label: "Not registered yet", desc: "I haven't joined a PRO" },
];

type Step = "identity" | "pro" | "socials" | "streaming" | "presskit" | "done";

// ─── Static styles ─────────────────────────────────────────────────────────────
const sWrap: React.CSSProperties = { maxWidth: 560, margin: "0 auto", padding: "24px 16px" };
const sCard: React.CSSProperties = { background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 28, marginBottom: 12 };
const sHeading: React.CSSProperties = { color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 6 };
const sSub: React.CSSProperties = { color: "#ffffff66", fontSize: 13, marginBottom: 20, lineHeight: 1.6 };
const sLabel: React.CSSProperties = { color: "#00D4FF", fontSize: 11, letterSpacing: 3, marginBottom: 8, textAlign: "center" };
const sFieldLabel: React.CSSProperties = { color: "#ffffff88", fontSize: 12, marginBottom: 6, display: "block" };
const sInput: React.CSSProperties = {
  width: "100%", background: "#060612", border: "1px solid #ffffff22",
  borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13,
  marginBottom: 14, boxSizing: "border-box", outline: "none",
};
const sTextarea: React.CSSProperties = {
  width: "100%", background: "#060612", border: "1px solid #ffffff22",
  borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13,
  marginBottom: 14, boxSizing: "border-box", outline: "none",
  resize: "vertical", minHeight: 80,
};
const sBtn: React.CSSProperties = {
  width: "100%", background: "linear-gradient(135deg,#00D4FF,#A855F7)", border: "none",
  borderRadius: 10, padding: "11px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const sBtnOutline: React.CSSProperties = {
  width: "100%", background: "transparent", border: "1px solid #ffffff22",
  borderRadius: 10, padding: "11px", color: "#ffffff88", fontWeight: 600, fontSize: 14, cursor: "pointer",
};
const sRow: React.CSSProperties = { display: "flex", gap: 10 };
const sRow2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const sSocialRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 };
const sSocialIcon: React.CSSProperties = { color: "#ffffff44", fontSize: 13, width: 80, flexShrink: 0 };
const sSocialInput: React.CSSProperties = {
  flex: 1, background: "#060612", border: "1px solid #ffffff22",
  borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none",
};
const sEpkBox: React.CSSProperties = { background: "#060612", border: "1px solid #A855F733", borderRadius: 12, padding: 20, marginBottom: 16 };
const sEpkField: React.CSSProperties = { color: "#ffffff55", fontSize: 12, marginBottom: 4 };
const sEpkValue: React.CSSProperties = { color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 12 };

// ─── Style helper functions ────────────────────────────────────────────────────
function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: `1.5px solid ${active ? "#A855F7" : "#ffffff22"}`,
    background: active ? "#A855F711" : "transparent",
    color: active ? "#A855F7" : "#ffffff66",
  };
}

function proOptionStyle(active: boolean): React.CSSProperties {
  return {
    padding: "12px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 8,
    border: `1.5px solid ${active ? "#00D4FF" : "#ffffff18"}`,
    background: active ? "#00D4FF11" : "#060612",
  };
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STEPS: Step[] = ["identity", "pro", "socials", "streaming", "presskit", "done"];
const STEP_LABELS: Record<Step, string> = {
  identity:  "STEP 1 OF 5 · ARTIST IDENTITY",
  pro:       "STEP 2 OF 5 · PRO & PUBLISHING",
  socials:   "STEP 3 OF 5 · SOCIAL MEDIA",
  streaming: "STEP 4 OF 5 · STREAMING LINKS",
  presskit:  "STEP 5 OF 5 · PRESS KIT",
  done:      "COMPLETE · YOUR ARTIST PROFILE",
};

interface Props {
  workspaceId: string;
  onComplete: (profile: MusicArtistProfile) => void;
}

export default function MusicOnboarding({ workspaceId, onComplete }: Props) {
  const [step, setStep] = useState<Step>("identity");
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MusicArtistProfile>({
    stageName: "", legalName: "", artistType: "", genres: [], bio: "",
    proAffiliation: "", proNumber: "", ipiNumber: "", hasPublisher: false,
    publisherName: "", hasLabel: false, labelName: "",
    instagram: "", twitter: "", tiktok: "", youtube: "", facebook: "", website: "",
    spotify: "", appleMusic: "", soundcloud: "", audiomack: "", tidal: "",
    pressPhotoUrl: "", epkHeadline: "", achievements: "", contactEmail: "", bookingEmail: "",
  });

  const set = (key: keyof MusicArtistProfile, val: any) =>
    setProfile(p => ({ ...p, [key]: val }));

  const toggleGenre = (g: string) =>
    set("genres", profile.genres.includes(g)
      ? profile.genres.filter(x => x !== g)
      : [...profile.genres, g]);

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const back = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}/music-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      }).catch(() => {});
    } finally {
      setSaving(false);
      onComplete(profile);
    }
  };

  return (
    <div style={sWrap}>
      <div style={sLabel}>{STEP_LABELS[step]}</div>

      {/* ── STEP 1: Identity ─────────────────────────────────────────── */}
      {step === "identity" && (
        <div style={sCard}>
          <div style={sHeading}>🎤 Your Artist Identity</div>
          <div style={sSub}>This is how you'll appear to labels, booking agents, and fans.</div>

          <label style={sFieldLabel}>Stage Name *</label>
          <input style={sInput} placeholder="e.g. Lil Mann, DJ Nyce, The Collective" value={profile.stageName}
            onChange={e => set("stageName", e.target.value)} />

          <label style={sFieldLabel}>Legal Name</label>
          <input style={sInput} placeholder="For contracts and PRO registration" value={profile.legalName}
            onChange={e => set("legalName", e.target.value)} />

          <label style={sFieldLabel}>Artist Type *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {ARTIST_TYPES.map(t => (
              <button key={t.id} style={chipStyle(profile.artistType === t.id)}
                onClick={() => set("artistType", t.id)}>{t.label}</button>
            ))}
          </div>

          <label style={sFieldLabel}>Genres (select all that apply) *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {GENRES.map(g => (
              <button key={g} style={chipStyle(profile.genres.includes(g))}
                onClick={() => toggleGenre(g)}>{g}</button>
            ))}
          </div>

          <label style={sFieldLabel}>Artist Bio</label>
          <textarea style={sTextarea} placeholder="Write 2–3 sentences about your sound, story, and mission. Labels and press will read this."
            value={profile.bio} onChange={e => set("bio", e.target.value)} />

          <button style={{ ...sBtn, opacity: profile.stageName && profile.artistType && profile.genres.length ? 1 : 0.4 }}
            disabled={!profile.stageName || !profile.artistType || !profile.genres.length}
            onClick={next}>Continue →</button>
        </div>
      )}

      {/* ── STEP 2: PRO & Publishing ─────────────────────────────────── */}
      {step === "pro" && (
        <div style={sCard}>
          <div style={sHeading}>📋 PRO & Publishing Info</div>
          <div style={sSub}>Performance Rights Organizations collect royalties when your music is played on radio, TV, or streamed. This is required by major labels.</div>

          <label style={sFieldLabel}>PRO Affiliation *</label>
          {PRO_OPTIONS.map(p => (
            <div key={p.id} style={proOptionStyle(profile.proAffiliation === p.id)}
              onClick={() => set("proAffiliation", p.id)}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{p.label}</div>
              <div style={{ color: "#ffffff55", fontSize: 11, marginTop: 2 }}>{p.desc}</div>
            </div>
          ))}

          {profile.proAffiliation && profile.proAffiliation !== "none" && (
            <div style={sRow2}>
              <div>
                <label style={sFieldLabel}>PRO Member #</label>
                <input style={{ ...sInput, marginBottom: 0 }} placeholder="Your member number"
                  value={profile.proNumber} onChange={e => set("proNumber", e.target.value)} />
              </div>
              <div>
                <label style={sFieldLabel}>IPI / CAE Number</label>
                <input style={{ ...sInput, marginBottom: 0 }} placeholder="11-digit IPI"
                  value={profile.ipiNumber} onChange={e => set("ipiNumber", e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <label style={sFieldLabel}>Do you have a music publisher?</label>
            <div style={{ ...sRow, marginBottom: 12 }}>
              <button style={chipStyle(profile.hasPublisher)} onClick={() => set("hasPublisher", true)}>Yes</button>
              <button style={chipStyle(!profile.hasPublisher)} onClick={() => set("hasPublisher", false)}>No / Self-published</button>
            </div>
            {profile.hasPublisher && (
              <input style={sInput} placeholder="Publisher name" value={profile.publisherName}
                onChange={e => set("publisherName", e.target.value)} />
            )}
          </div>

          <div>
            <label style={sFieldLabel}>Are you signed to a label?</label>
            <div style={{ ...sRow, marginBottom: 12 }}>
              <button style={chipStyle(profile.hasLabel)} onClick={() => set("hasLabel", true)}>Yes</button>
              <button style={chipStyle(!profile.hasLabel)} onClick={() => set("hasLabel", false)}>No / Independent</button>
            </div>
            {profile.hasLabel && (
              <input style={sInput} placeholder="Label name" value={profile.labelName}
                onChange={e => set("labelName", e.target.value)} />
            )}
          </div>

          <div style={sRow}>
            <button style={sBtnOutline} onClick={back}>← Back</button>
            <button style={{ ...sBtn, opacity: profile.proAffiliation ? 1 : 0.4 }}
              disabled={!profile.proAffiliation} onClick={next}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Social Media ─────────────────────────────────────── */}
      {step === "socials" && (
        <div style={sCard}>
          <div style={sHeading}>📱 Social Media Handles</div>
          <div style={sSub}>Labels and booking agents check all of these. Add every platform you're active on.</div>

          {[
            { key: "instagram", icon: "📸 Instagram", placeholder: "@yourusername" },
            { key: "tiktok",    icon: "🎵 TikTok",    placeholder: "@yourusername" },
            { key: "twitter",   icon: "𝕏 X / Twitter", placeholder: "@yourusername" },
            { key: "youtube",   icon: "▶️ YouTube",    placeholder: "youtube.com/c/channel" },
            { key: "facebook",  icon: "👤 Facebook",   placeholder: "facebook.com/yourpage" },
            { key: "website",   icon: "🌐 Website",    placeholder: "https://yoursite.com" },
          ].map(({ key, icon, placeholder }) => (
            <div key={key} style={sSocialRow}>
              <span style={sSocialIcon}>{icon}</span>
              <input style={sSocialInput} placeholder={placeholder}
                value={(profile as any)[key]}
                onChange={e => set(key as keyof MusicArtistProfile, e.target.value)} />
            </div>
          ))}

          <div style={{ ...sRow, marginTop: 8 }}>
            <button style={sBtnOutline} onClick={back}>← Back</button>
            <button style={sBtn} onClick={next}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Streaming ────────────────────────────────────────── */}
      {step === "streaming" && (
        <div style={sCard}>
          <div style={sHeading}>🎧 Streaming Links</div>
          <div style={sSub}>Paste your artist profile links — not individual songs. These go directly into your press kit.</div>

          {[
            { key: "spotify",    icon: "💚 Spotify",      placeholder: "open.spotify.com/artist/..." },
            { key: "appleMusic", icon: "🍎 Apple Music",  placeholder: "music.apple.com/artist/..." },
            { key: "tidal",      icon: "🌊 TIDAL",        placeholder: "tidal.com/browse/artist/..." },
            { key: "soundcloud", icon: "☁️ SoundCloud",   placeholder: "soundcloud.com/yourusername" },
            { key: "audiomack",  icon: "🔊 Audiomack",    placeholder: "audiomack.com/yourusername" },
          ].map(({ key, icon, placeholder }) => (
            <div key={key} style={sSocialRow}>
              <span style={{ ...sSocialIcon, width: 100 }}>{icon}</span>
              <input style={sSocialInput} placeholder={placeholder}
                value={(profile as any)[key]}
                onChange={e => set(key as keyof MusicArtistProfile, e.target.value)} />
            </div>
          ))}

          <div style={{ ...sRow, marginTop: 8 }}>
            <button style={sBtnOutline} onClick={back}>← Back</button>
            <button style={sBtn} onClick={next}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Press Kit ────────────────────────────────────────── */}
      {step === "presskit" && (
        <div style={sCard}>
          <div style={sHeading}>📰 Press Kit (EPK)</div>
          <div style={sSub}>An Electronic Press Kit is what you send to labels, venues, and media. Fill this out and CrewOS generates it automatically.</div>

          <label style={sFieldLabel}>EPK Headline</label>
          <input style={sInput} placeholder={`e.g. "Oklahoma's Next Breakout Artist" or "Genre-Bending Producer from OKC"`}
            value={profile.epkHeadline} onChange={e => set("epkHeadline", e.target.value)} />

          <label style={sFieldLabel}>Notable Achievements</label>
          <textarea style={sTextarea}
            placeholder={"e.g.\n• 500K Spotify streams on debut single\n• Opened for [Artist] at [Venue]\n• Featured on [Blog/Playlist]\n• [Award] winner 2024"}
            value={profile.achievements} onChange={e => set("achievements", e.target.value)} />

          <div style={sRow2}>
            <div>
              <label style={sFieldLabel}>Contact Email</label>
              <input style={{ ...sInput, marginBottom: 0 }} placeholder="General inquiries"
                value={profile.contactEmail} onChange={e => set("contactEmail", e.target.value)} />
            </div>
            <div>
              <label style={sFieldLabel}>Booking Email</label>
              <input style={{ ...sInput, marginBottom: 0 }} placeholder="For bookings only"
                value={profile.bookingEmail} onChange={e => set("bookingEmail", e.target.value)} />
            </div>
          </div>

          <div style={{ ...sRow, marginTop: 16 }}>
            <button style={sBtnOutline} onClick={back}>← Back</button>
            <button style={{ ...sBtn, opacity: saving ? 0.6 : 1 }} disabled={saving}
              onClick={handleFinish}>
              {saving ? "Saving…" : "Generate My EPK →"}
            </button>
          </div>
        </div>
      )}

      {/* ── DONE ─────────────────────────────────────────────────────── */}
      {step === "done" && (
        <div style={{ ...sCard, border: "1px solid #A855F733", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎤</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {profile.stageName} is set up
          </div>
          <div style={{ color: "#ffffff66", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            Your artist profile and EPK are ready. Head to your dashboard to generate your press kit PDF and connect your distribution agent.
          </div>
          <div style={sEpkBox}>
            {profile.proAffiliation && profile.proAffiliation !== "none" && (
              <><div style={sEpkField}>PRO</div>
              <div style={sEpkValue}>{profile.proAffiliation.toUpperCase()} {profile.proNumber && `· #${profile.proNumber}`}</div></>
            )}
            {profile.genres.length > 0 && (
              <><div style={sEpkField}>Genres</div>
              <div style={sEpkValue}>{profile.genres.join(", ")}</div></>
            )}
            {profile.spotify && (
              <><div style={sEpkField}>Spotify</div>
              <div style={sEpkValue}>{profile.spotify}</div></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}