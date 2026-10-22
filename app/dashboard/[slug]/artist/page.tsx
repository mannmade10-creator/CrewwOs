"use client";
/**
 * app/dashboard/[slug]/artist/page.tsx
 * CrewwOS Artist Dashboard — full label command center
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

/* ── types ─────────────────────────────────────────────────────────────────── */
interface ArtistProfile {
  id: string;
  stage_name: string;
  genre: string;
  photo_url?: string;
  onboarding_complete: boolean;
  onboarding_step: number;
  bmi_registered: boolean;
  ascap_registered: boolean;
  soundexchange_registered: boolean;
  distrokid_artist_id?: string;
  plan: string;
}

interface FanLead {
  id: string;
  name?: string;
  phone: string;
  source: string;
  city?: string;
  created_at: string;
  nia_sent: boolean;
}

interface Track {
  id: string;
  title: string;
  type: string;
  release_date?: string;
  spotify_url?: string;
  apple_url?: string;
  distributed: boolean;
}

/* ── mock stats (replace with real Supabase queries later) ─────────────────── */
const MOCK_STATS = [
  { label: "Total Streams",     value: "—",   icon: "🎧", note: "Connect Spotify for Artists" },
  { label: "Fan Leads",         value: "1",   icon: "❤️", note: "from QR & shows" },
  { label: "Playlist Adds",     value: "—",   icon: "📋", note: "Start pitching" },
  { label: "Submissions Sent",  value: "0",   icon: "📨", note: "via Groover / SubmitHub" },
  { label: "Royalties Tracked", value: "$0",  icon: "💰", note: "Register PRO to start" },
];

const STREAMING_PLATFORMS = [
  {
    name: "Spotify for Artists",
    icon: "🟢",
    desc: "Claim your profile, pitch to editorial playlists",
    url: "https://artists.spotify.com",
    action: "Claim profile",
    key: "spotify",
  },
  {
    name: "Apple Music for Artists",
    icon: "🍎",
    desc: "Analytics, milestones, and profile management",
    url: "https://artists.apple.com",
    action: "Claim profile",
    key: "apple",
  },
  {
    name: "DistroKid",
    icon: "💾",
    desc: "Upload and distribute your music to 150+ platforms",
    url: "https://distrokid.com",
    action: "Set up distribution",
    key: "distrokid",
  },
  {
    name: "BMI",
    icon: "⚖️",
    desc: "Performance royalties — register as songwriter & publisher",
    url: "https://www.bmi.com/join",
    action: "Register now",
    key: "bmi",
  },
  {
    name: "ASCAP",
    icon: "🎼",
    desc: "Alternative PRO — register if you chose ASCAP over BMI",
    url: "https://www.ascap.com/music-creators/join",
    action: "Register now",
    key: "ascap",
  },
  {
    name: "SoundExchange",
    icon: "📡",
    desc: "Digital radio royalties from Pandora, SiriusXM & internet radio",
    url: "https://www.soundexchange.com/artist-copyright-owner/register/",
    action: "Register now",
    key: "soundexchange",
  },
  {
    name: "YouTube for Artists",
    icon: "▶️",
    desc: "Content ID, channel verification, and monetization",
    url: "https://artists.youtube.com",
    action: "Set up channel",
    key: "youtube",
  },
  {
    name: "Tidal for Artists",
    icon: "🌊",
    desc: "HiFi streaming profile and analytics",
    url: "https://tidal.com/artist-home",
    action: "Claim profile",
    key: "tidal",
  },
  {
    name: "Amazon Music for Artists",
    icon: "📦",
    desc: "Alexa integration, analytics, and profile",
    url: "https://artists.amazonmusic.com",
    action: "Claim profile",
    key: "amazon",
  },
];

const AGENT_FEED = [
  { agent: "Nia",          icon: "👑", action: "Fan lead captured from QR scan",         time: "Just now" },
  { agent: "EPKAgent",     icon: "📄", action: "EPK template ready — complete bio to activate", time: "Waiting" },
  { agent: "LegalAgent",   icon: "⚖️", action: "PRO registration checklist ready",        time: "Waiting" },
  { agent: "PitchAgent",   icon: "🎤", action: "Curator database loaded — add a track to start pitching", time: "Waiting" },
  { agent: "SocialAgent",  icon: "📲", action: "Content calendar ready — connect Instagram to activate", time: "Waiting" },
  { agent: "StreamAgent",  icon: "📊", action: "Connect Spotify for Artists to see live data", time: "Waiting" },
];

/* ── component ──────────────────────────────────────────────────────────────── */
export default function ArtistDashboard() {
  const params = useParams();
  const slug = params?.slug as string ?? "";
  const base = `/dashboard/${slug}/artist`;

  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [fans, setFans] = useState<FanLead[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "distribution" | "fans" | "agents">("overview");

  useEffect(() => {
    fetch("/api/artist/onboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          setFans(d.profile.artist_fan_leads ?? []);
          setTracks(d.profile.artist_tracks ?? []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner} />
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 16, fontSize: 14 }}>Loading your label...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.centered}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Set up your artist profile</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 24, fontSize: 14 }}>Complete your onboarding to activate your label.</p>
        <a href={`${base}/onboard`} style={styles.primaryBtn}>Start onboarding →</a>
      </div>
    );
  }

  const completedRegistrations = [
    profile.bmi_registered,
    profile.ascap_registered,
    profile.soundexchange_registered,
    !!profile.distrokid_artist_id,
  ].filter(Boolean).length;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={styles.avatar}>
            {profile.photo_url
              ? <img src={profile.photo_url} alt={profile.stage_name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
              : <span style={{ fontSize: 28 }}>🎤</span>
            }
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{profile.stage_name}</h1>
              <span style={styles.planBadge}>{profile.plan.toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "4px 0 0" }}>{profile.genre} · CrewwOS Label</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {!profile.onboarding_complete && (
            <a href={`${base}/onboard`} style={styles.warningBtn}>
              ⚡ Complete setup (step {profile.onboarding_step}/6)
            </a>
          )}
          <a href={`${base}/release`} style={styles.primaryBtn}>+ New release</a>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(["overview", "distribution", "fans", "agents"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}>
            {t === "overview" ? "📊 Overview" : t === "distribution" ? "🎧 Distribution" : t === "fans" ? "❤️ Fan Leads" : "🤖 Agents"}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div>
          {/* Stats */}
          <div style={styles.statsGrid}>
            {MOCK_STATS.map((s) => (
              <div key={s.label} style={styles.statCard}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>{s.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: "4px 0 6px" }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "rgba(168,85,247,0.7)" }}>{s.note}</div>
              </div>
            ))}
          </div>

          {/* Two-col layout */}
          <div style={styles.twoCol}>
            {/* Registrations */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>⚖️ PRO & Registration Status</span>
                <span style={{ fontSize: 12, color: completedRegistrations === 4 ? "#22c55e" : "#a855f7" }}>
                  {completedRegistrations}/4 complete
                </span>
              </div>
              {[
                { label: "BMI",           done: profile.bmi_registered,           url: "https://www.bmi.com/join" },
                { label: "ASCAP",         done: profile.ascap_registered,         url: "https://www.ascap.com/music-creators/join" },
                { label: "SoundExchange", done: profile.soundexchange_registered, url: "https://www.soundexchange.com/artist-copyright-owner/register/" },
                { label: "DistroKid",     done: !!profile.distrokid_artist_id,    url: "https://distrokid.com" },
              ].map((r) => (
                <div key={r.label} style={styles.regRow}>
                  <span style={{ fontSize: 13 }}>{r.done ? "✅" : "⭕"} {r.label}</span>
                  {!r.done && (
                    <a href={r.url} target="_blank" rel="noreferrer" style={styles.regLink}>Register →</a>
                  )}
                </div>
              ))}
            </div>

            {/* Tracks */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>🎵 Your Tracks</span>
                <a href={`${base}/tracks/new`} style={styles.regLink}>+ Add track</a>
              </div>
              {tracks.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No tracks yet.</p>
                  <a href={`${base}/tracks/new`} style={styles.primaryBtn}>Add your first track →</a>
                </div>
              ) : tracks.map((t) => (
                <div key={t.id} style={styles.trackRow}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{t.type} · {t.release_date ?? "No release date"}</div>
                  </div>
                  <span style={{ fontSize: 11, color: t.distributed ? "#22c55e" : "rgba(255,255,255,0.3)", background: t.distributed ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 4 }}>
                    {t.distributed ? "Distributed" : "Not distributed"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent feed */}
          <div style={{ ...styles.card, marginTop: 16 }}>
            <div style={styles.cardHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>🤖 Agent Activity</span>
            </div>
            {AGENT_FEED.map((a) => (
              <div key={a.agent} style={styles.agentRow}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>{a.agent}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginLeft: 8 }}>{a.action}</span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DISTRIBUTION ── */}
      {activeTab === "distribution" && (
        <div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
            Register and connect your artist profiles on every major platform. Check off each one as you complete it.
          </p>
          <div style={styles.platformGrid}>
            {STREAMING_PLATFORMS.map((p) => {
              const done =
                (p.key === "bmi" && profile.bmi_registered) ||
                (p.key === "ascap" && profile.ascap_registered) ||
                (p.key === "soundexchange" && profile.soundexchange_registered) ||
                (p.key === "distrokid" && !!profile.distrokid_artist_id);
              return (
                <div key={p.key} style={{ ...styles.platformCard, ...(done ? styles.platformDone : {}) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: 28 }}>{p.icon}</span>
                    {done && <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Done</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 14, flex: 1 }}>{p.desc}</div>
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ ...styles.regLink, fontSize: 12, fontWeight: 700 }}>
                    {done ? "Manage →" : `${p.action} →`}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FAN LEADS ── */}
      {activeTab === "fans" && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>❤️ Fan Leads</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{fans.length} total</span>
          </div>
          {fans.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No fan leads yet.</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Share your QR link at shows to start capturing fans.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Name", "Phone", "Source", "City", "SMS", "Date"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fans.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={styles.td}>{f.name ?? "—"}</td>
                    <td style={styles.td}>{f.phone}</td>
                    <td style={styles.td}><span style={styles.badge}>{f.source}</span></td>
                    <td style={styles.td}>{f.city ?? "—"}</td>
                    <td style={styles.td}><span style={{ color: f.nia_sent ? "#22c55e" : "rgba(255,255,255,0.3)" }}>{f.nia_sent ? "✓ Sent" : "Pending"}</span></td>
                    <td style={styles.td}>{new Date(f.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── AGENTS ── */}
      {activeTab === "agents" && (
        <div style={styles.agentGrid}>
          {[
            { icon: "👑", name: "Nia",           role: "Chief of Staff",       status: "active",  desc: "Coordinating your label operations" },
            { icon: "🎤", name: "PitchAgent",    role: "A&R / Promotions",     status: "waiting", desc: "Add a track to start pitching curators" },
            { icon: "📰", name: "PressAgent",    role: "Publicist",            status: "waiting", desc: "Complete your bio to activate" },
            { icon: "📲", name: "SocialAgent",   role: "Social Media",         status: "waiting", desc: "Connect Instagram to activate" },
            { icon: "🎬", name: "VideoAgent",    role: "Creative Director",    status: "waiting", desc: "Upload a track to generate promo content" },
            { icon: "✍️", name: "CopyAgent",     role: "Copywriter",           status: "waiting", desc: "Complete onboarding to activate" },
            { icon: "❤️", name: "FanAgent",      role: "Fan Relations",        status: "active",  desc: "Capturing fan leads from your QR" },
            { icon: "📊", name: "StreamAgent",   role: "Analytics",            status: "waiting", desc: "Connect Spotify for Artists" },
            { icon: "🔍", name: "TrendAgent",    role: "A&R Intelligence",     status: "waiting", desc: "Monitoring genre trends" },
            { icon: "💰", name: "RoyaltyAgent",  role: "Business Manager",     status: "waiting", desc: "Register PRO to start tracking" },
            { icon: "📧", name: "InboxAgent",    role: "Label Operations",     status: "waiting", desc: "Connect your email to activate" },
            { icon: "🔁", name: "FollowUpAgent", role: "Follow-Up",            status: "waiting", desc: "Activate after first pitch goes out" },
            { icon: "🤖", name: "ChatAgent",     role: "Fan Chat",             status: "waiting", desc: "Connect DMs to activate" },
            { icon: "📅", name: "ScheduleAgent", role: "Tour / Calendar",      status: "waiting", desc: "Connect calendar to activate" },
            { icon: "🎵", name: "PlaylistAgent", role: "DSP Strategy",         status: "waiting", desc: "Add a track to start targeting" },
            { icon: "📄", name: "EPKAgent",      role: "Press Kit",            status: "waiting", desc: "Complete bio to generate EPK" },
            { icon: "⚖️", name: "LegalAgent",    role: "Business Affairs",     status: "active",  desc: "PRO registration checklist ready" },
            { icon: "💾", name: "SaveAgent",     role: "Archive",              status: "waiting", desc: "Add tracks to start cataloging" },
            { icon: "📈", name: "AdAgent",       role: "Paid Media",           status: "waiting", desc: "Available on Major plan" },
          ].map((a) => (
            <div key={a.name} style={{ ...styles.agentCard, ...(a.status === "active" ? styles.agentCardActive : {}) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{a.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: a.status === "active" ? "#22c55e" : "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1 }}>
                  {a.status === "active" ? "● Active" : "○ Waiting"}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: "#a855f7", marginBottom: 8 }}>{a.role}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  page:        { background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", padding: "0 0 80px" },
  centered:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", padding: "80px 32px" },
  spinner:     { width: 36, height: 36, border: "3px solid rgba(168,85,247,0.2)", borderTop: "3px solid #a855f7", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  header:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 16 },
  avatar:      { width: 56, height: 56, borderRadius: 12, background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  planBadge:   { fontSize: 10, fontWeight: 700, color: "#a855f7", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 4, padding: "2px 8px", letterSpacing: 1 },
  primaryBtn:  { background: "linear-gradient(135deg, #a855f7, #f43f8e)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, textDecoration: "none", border: "none", cursor: "pointer" },
  warningBtn:  { background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", color: "#eab308", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, textDecoration: "none" },
  tabs:        { display: "flex", gap: 4, padding: "16px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tab:         { background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, padding: "10px 16px", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -1 },
  tabActive:   { color: "#a855f7", borderBottom: "2px solid #a855f7" },
  statsGrid:   { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, padding: "24px 32px 0" },
  statCard:    { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 16px" },
  twoCol:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 32px 0" },
  card:        { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px", margin: "0 32px" },
  cardHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" },
  regRow:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 },
  regLink:     { color: "#a855f7", fontSize: 13, textDecoration: "none", fontWeight: 600 },
  trackRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  agentRow:    { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  emptyState:  { textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.35)", fontSize: 14, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" },
  platformGrid:{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: "0 32px" },
  platformCard:{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column" },
  platformDone:{ borderColor: "rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.03)" },
  agentGrid:   { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "24px 32px" },
  agentCard:   { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px" },
  agentCardActive: { borderColor: "rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.04)" },
  td:          { padding: "10px 12px", color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  badge:       { fontSize: 11, background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 4, padding: "2px 8px" },
};
