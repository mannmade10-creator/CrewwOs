"use client";
/**
 * app/dashboard/[slug]/artist/page.tsx
 * CrewwOS Artist Dashboard — full label command center + Analytics
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

/* ── mock stats ─────────────────────────────────────────────────────────────── */
const MOCK_STATS = [
  { label: "Total Streams",     value: "—",   icon: "🎧", note: "Connect Spotify for Artists" },
  { label: "Fan Leads",         value: "1",   icon: "❤️", note: "from QR & shows" },
  { label: "Playlist Adds",     value: "—",   icon: "📋", note: "Start pitching" },
  { label: "Submissions Sent",  value: "0",   icon: "📨", note: "via Groover / SubmitHub" },
  { label: "Royalties Tracked", value: "$0",  icon: "💰", note: "Register PRO to start" },
];

const STREAMING_PLATFORMS = [
  { name: "Spotify for Artists", icon: "🟢", desc: "Claim your profile, pitch to editorial playlists", url: "https://artists.spotify.com", action: "Claim profile", key: "spotify" },
  { name: "Apple Music for Artists", icon: "🍎", desc: "Analytics, milestones, and profile management", url: "https://artists.apple.com", action: "Claim profile", key: "apple" },
  { name: "DistroKid", icon: "💾", desc: "Upload and distribute your music to 150+ platforms", url: "https://distrokid.com", action: "Set up distribution", key: "distrokid" },
  { name: "BMI", icon: "⚖️", desc: "Performance royalties — register as songwriter & publisher", url: "https://www.bmi.com/join", action: "Register now", key: "bmi" },
  { name: "ASCAP", icon: "🎼", desc: "Alternative PRO — register if you chose ASCAP over BMI", url: "https://www.ascap.com/music-creators/join", action: "Register now", key: "ascap" },
  { name: "SoundExchange", icon: "📡", desc: "Digital radio royalties from Pandora, SiriusXM & internet radio", url: "https://www.soundexchange.com/artist-copyright-owner/register/", action: "Register now", key: "soundexchange" },
  { name: "YouTube for Artists", icon: "▶️", desc: "Content ID, channel verification, and monetization", url: "https://artists.youtube.com", action: "Set up channel", key: "youtube" },
  { name: "Tidal for Artists", icon: "🌊", desc: "HiFi streaming profile and analytics", url: "https://tidal.com/artist-home", action: "Claim profile", key: "tidal" },
  { name: "Amazon Music for Artists", icon: "📦", desc: "Alexa integration, analytics, and profile", url: "https://artists.amazonmusic.com", action: "Claim profile", key: "amazon" },
];

const AGENT_FEED = [
  { agent: "Nia",          icon: "👑", action: "Fan lead captured from QR scan",         time: "Just now" },
  { agent: "EPKAgent",     icon: "📄", action: "EPK template ready — complete bio to activate", time: "Waiting" },
  { agent: "LegalAgent",   icon: "⚖️", action: "PRO registration checklist ready",        time: "Waiting" },
  { agent: "PitchAgent",   icon: "🎤", action: "Curator database loaded — add a track to start pitching", time: "Waiting" },
  { agent: "SocialAgent",  icon: "📲", action: "Content calendar ready — connect Instagram to activate", time: "Waiting" },
  { agent: "StreamAgent",  icon: "📊", action: "Connect Spotify for Artists to see live data", time: "Waiting" },
];

/* ── analytics data ─────────────────────────────────────────────────────────── */
const STREAMING_ANALYTICS = [
  { label: "Total Streams",       value: "—",  icon: "🎧", note: "Connect Chartmetric",        color: "#8B5CF6" },
  { label: "Monthly Listeners",   value: "—",  icon: "👥", note: "Spotify for Artists",        color: "#22c55e" },
  { label: "Playlist Adds",       value: "—",  icon: "📋", note: "Editorial & user playlists", color: "#06B6D4" },
  { label: "Saves",               value: "—",  icon: "💾", note: "Spotify / Apple Music",      color: "#f59e0b" },
  { label: "Shazams",             value: "—",  icon: "🔍", note: "Apple Music for Artists",    color: "#ec4899" },
  { label: "YouTube Views",       value: "—",  icon: "▶️", note: "Connect YouTube Analytics",  color: "#ef4444" },
];

const RADIO_ANALYTICS = [
  { label: "Radio Spins (Total)", value: "—", icon: "📻", note: "Connect Chartmetric / BDS",  color: "#8B5CF6" },
  { label: "Stations Playing",    value: "—", icon: "🗺️", note: "Active airplay locations",   color: "#22c55e" },
  { label: "Spin Peak Day",       value: "—", icon: "📈", note: "Highest single-day spins",   color: "#06B6D4" },
  { label: "Markets Reached",     value: "—", icon: "🌍", note: "DMA markets with airplay",   color: "#f59e0b" },
];

const DISTRO_PLATFORMS = [
  { name: "DistroKid",     icon: "🟣", desc: "Upload new releases, manage ISRC codes, royalty splits",          connected: false, url: "https://distrokid.com" },
  { name: "TuneCore",      icon: "🔵", desc: "Royalty statements, revenue by territory, store-by-store breakdown", connected: false, url: "https://tunecore.com" },
  { name: "CD Baby",       icon: "🟠", desc: "Physical + digital distribution, YouTube Content ID revenue, sync licensing", connected: false, url: "https://cdbaby.com" },
  { name: "UnitedMasters", icon: "⚫", desc: "Independence-first distribution, brand deal opportunities, fan data access", connected: false, url: "https://unitedmasters.com" },
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
  const [activeTab, setActiveTab] = useState<"overview" | "distribution" | "fans" | "analytics" | "agents">("overview");
  const [analyticsTab, setAnalyticsTab] = useState<"streaming" | "radio" | "sync" | "social" | "distribution">("streaming");

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
        {(["overview", "distribution", "fans", "analytics", "agents"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}>
            {t === "overview" ? "📊 Overview" : t === "distribution" ? "🎧 Distribution" : t === "fans" ? "❤️ Fan Leads" : t === "analytics" ? "📈 Analytics" : "🤖 Agents"}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div>
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

          <div style={styles.twoCol}>
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
              ) : (
                tracks.slice(0, 5).map((t) => (
                  <div key={t.id} style={styles.regRow}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>🎵 {t.title}</span>
                    <span style={{ fontSize: 11, color: t.distributed ? "#22c55e" : "rgba(255,255,255,0.3)" }}>{t.distributed ? "Distributed" : "Pending"}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ ...styles.card, margin: "0 32px 16px" }}>
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
        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>🎧 Streaming Platform Setup</span>
            </div>
            {STREAMING_PLATFORMS.map((p) => (
              <div key={p.key} style={styles.agentRow}>
                <span style={{ fontSize: 24 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{p.desc}</div>
                </div>
                <a href={p.url} target="_blank" rel="noreferrer" style={styles.regLink}>{p.action} →</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAN LEADS ── */}
      {activeTab === "fans" && (
        <div style={{ ...styles.card, margin: "24px 32px" }}>
          <div style={styles.cardHeader}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>❤️ Fan Leads</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{fans.length} total</span>
          </div>
          {fans.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No fan leads yet. Share your QR code at shows to start capturing.</p>
            </div>
          ) : (
            fans.map((f) => (
              <div key={f.id} style={styles.agentRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name ?? "Anonymous Fan"}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{f.phone} · {f.source}{f.city ? ` · ${f.city}` : ""}</div>
                </div>
                <span style={{ fontSize: 11, background: f.nia_sent ? "rgba(34,197,94,0.1)" : "rgba(168,85,247,0.1)", color: f.nia_sent ? "#22c55e" : "#a855f7", borderRadius: 4, padding: "2px 8px", border: `1px solid ${f.nia_sent ? "rgba(34,197,94,0.2)" : "rgba(168,85,247,0.2)"}` }}>
                  {f.nia_sent ? "✅ Messaged" : "⏳ Pending"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {activeTab === "analytics" && (
        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Integration banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: "16px 20px" }}>
            <span style={{ fontSize: 20 }}>🔗</span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14 }}>Connect your streaming platforms to unlock real-time analytics</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                Chartmetric aggregates Spotify, Apple Music, YouTube, TikTok, and radio data. DistroKid, TuneCore, CD Baby, and UnitedMasters connect for royalty tracking.
              </p>
            </div>
            <a href={`/dashboard/${slug}/integrations`} style={{ background: "#8B5CF6", color: "#fff", fontWeight: 700, fontSize: 12, padding: "8px 16px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" as const }}>Connect Now →</a>
          </div>

          {/* Analytics sub-tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" as const }}>
            {(["streaming","radio","sync","social","distribution"] as const).map(t => (
              <button key={t} onClick={() => setAnalyticsTab(t)} style={{ background: "none", border: "none", color: analyticsTab === t ? "#8B5CF6" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, padding: "10px 14px", cursor: "pointer", borderBottom: analyticsTab === t ? "2px solid #8B5CF6" : "2px solid transparent", marginBottom: -1, whiteSpace: "nowrap" as const }}>
                {t === "streaming" ? "🎧 Streaming" : t === "radio" ? "📻 Radio" : t === "sync" ? "🎬 Sync" : t === "social" ? "📲 Social" : "📦 Distribution"}
              </button>
            ))}
          </div>

          {/* Streaming */}
          {analyticsTab === "streaming" && (
            <>
              <div style={styles.statsGrid}>{STREAMING_ANALYTICS.map(s => <AnalyticsStat key={s.label} {...s} />)}</div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><span style={{ fontSize: 14, fontWeight: 700 }}>📋 Platform Breakdown</span></div>
                {[
                  { platform: "Spotify", icon: "🟢" }, { platform: "Apple Music", icon: "🍎" },
                  { platform: "YouTube Music", icon: "▶️" }, { platform: "Amazon Music", icon: "🟠" }, { platform: "Tidal", icon: "🔵" },
                ].map(p => (
                  <div key={p.platform} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 18 }}>{p.icon}</span>
                    <span style={{ flex: 1.5, fontSize: 13, fontWeight: 600 }}>{p.platform}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.2)", minWidth: 80, textAlign: "right" as const }}>— streams</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.2)", minWidth: 80, textAlign: "right" as const }}>— listeners</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.2)", minWidth: 80, textAlign: "right" as const }}>— playlists</span>
                  </div>
                ))}
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><span style={{ fontSize: 14, fontWeight: 700 }}>📋 Playlist Tracker</span></div>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>Connect Chartmetric to automatically detect when your music is added to Spotify, Apple, or Amazon playlists — including editorial and algorithmic playlists.</p>
              </div>
            </>
          )}

          {/* Radio */}
          {analyticsTab === "radio" && (
            <>
              <div style={styles.statsGrid}>{RADIO_ANALYTICS.map(s => <AnalyticsStat key={s.label} {...s} />)}</div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><span style={{ fontSize: 14, fontWeight: 700 }}>📡 Get Your First Radio Spins</span></div>
                <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
                    1. Use the <strong>Music PR agent (Remy)</strong> to generate radio pitch emails for your genre<br />
                    2. Target Music Directors and Program Directors at stations in your market<br />
                    3. Independent promoters specialize in getting spins for indie artists<br />
                    4. Submit to college radio via <strong>CMJ</strong> or direct outreach — lower barrier than commercial radio
                  </div>
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><span style={{ fontSize: 14, fontWeight: 700 }}>📊 Spin History (Last 90 Days)</span></div>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>Connect BDS ($500+/mo, label-grade) or Chartmetric (~$150/mo, estimated) to populate daily spin data.</p>
              </div>
            </>
          )}

          {/* Sync */}
          {analyticsTab === "sync" && (
            <>
              <div style={styles.statsGrid}>
                {[
                  { label: "Active Sync Deals",   value: "—",  icon: "🎬", note: "Film / TV / Ad placements", color: "#8B5CF6" },
                  { label: "Total Sync Revenue",  value: "$—", icon: "💰", note: "All sync licensing income",  color: "#22c55e" },
                  { label: "Pending Submissions", value: "—",  icon: "📨", note: "Submitted, awaiting review", color: "#06B6D4" },
                  { label: "Libraries Listed",    value: "—",  icon: "📚", note: "Musicbed, Artlist, Pond5",   color: "#f59e0b" },
                ].map(s => <AnalyticsStat key={s.label} {...s} />)}
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><span style={{ fontSize: 14, fontWeight: 700 }}>💼 Sync Libraries</span></div>
                {[
                  { name: "Musicbed", icon: "🎬", revenue: "50–70% split", audience: "Professional filmmakers", url: "https://musicbed.com/artists" },
                  { name: "Artlist",  icon: "🎵", revenue: "Flat fee + royalties", audience: "2M+ video creators", url: "https://artlist.io/music-for-film" },
                  { name: "Pond5",    icon: "🌊", revenue: "35–50% split", audience: "Stock media buyers", url: "https://pond5.com/sell-music" },
                  { name: "Songtradr",icon: "🎶", revenue: "Various sync fees", audience: "Film, TV, ads, games", url: "https://songtradr.com" },
                ].map(l => (
                  <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 20 }}>{l.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{l.name}</div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{l.revenue} · {l.audience}</span>
                    </div>
                    <a href={l.url} target="_blank" rel="noreferrer" style={styles.regLink}>Apply →</a>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Social */}
          {analyticsTab === "social" && (
            <>
              <div style={styles.statsGrid}>
                {[
                  { label: "TikTok Followers",    value: "—", icon: "🎵", note: "Connect TikTok",     color: "#f97316" },
                  { label: "TikTok Views (30d)",  value: "—", icon: "▶️", note: "Last 30 days",        color: "#f97316" },
                  { label: "Instagram Followers", value: "—", icon: "📸", note: "Connect Instagram",   color: "#ec4899" },
                  { label: "YouTube Subscribers", value: "—", icon: "🔴", note: "Connect YouTube",     color: "#ef4444" },
                ].map(s => <AnalyticsStat key={s.label} {...s} />)}
              </div>
              <div style={styles.twoCol}>
                {[
                  { platform: "TikTok", icon: "🎵", color: "#f97316", metrics: ["Followers","Following","Total Likes","Views (30d)","Videos Posted","Avg Views/Video"] },
                  { platform: "Instagram", icon: "📸", color: "#ec4899", metrics: ["Followers","Following","Total Posts","Reel Views (30d)","Profile Visits (30d)","Reach (30d)"] },
                ].map(p => (
                  <div key={p.platform} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{p.icon} {p.platform}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: p.color, background: `${p.color}18`, border: `1px solid ${p.color}30`, borderRadius: 4, padding: "2px 8px" }}>Connect</span>
                    </div>
                    {p.metrics.map(m => (
                      <div key={m} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{m}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>—</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Distribution */}
          {analyticsTab === "distribution" && (
            <>
              <div style={styles.statsGrid}>
                {[
                  { label: "Total Royalties",      value: "$—", icon: "💰", note: "Connect your distributor",    color: "#22c55e" },
                  { label: "Releases Distributed", value: "—",  icon: "📀", note: "Tracks across all platforms", color: "#8B5CF6" },
                  { label: "Active ISRC Codes",     value: "—",  icon: "🔑", note: "International track IDs",    color: "#06B6D4" },
                  { label: "Territories Active",    value: "—",  icon: "🌍", note: "Countries where available",  color: "#f59e0b" },
                ].map(s => <AnalyticsStat key={s.label} {...s} />)}
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><span style={{ fontSize: 14, fontWeight: 700 }}>📦 Distribution Platforms</span></div>
                {DISTRO_PLATFORMS.map(p => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{p.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{p.desc}</div>
                    </div>
                    <a href={p.url} target="_blank" rel="noreferrer" style={styles.regLink}>Connect →</a>
                  </div>
                ))}
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><span style={{ fontSize: 14, fontWeight: 700 }}>📊 Royalty Breakdown</span></div>
                {[
                  { source: "Streaming (Mechanical)", icon: "🎧", amount: "$—", note: "Per-stream royalties from Spotify, Apple, YouTube" },
                  { source: "Performance (PRO)",       icon: "📻", amount: "$—", note: "Radio, TV, live via ASCAP/BMI/SESAC" },
                  { source: "Sync Licensing",          icon: "🎬", amount: "$—", note: "Film, TV, advertising, games" },
                  { source: "YouTube Content ID",      icon: "▶️", amount: "$—", note: "Ad revenue when your music is used in videos" },
                  { source: "SoundExchange",           icon: "💿", amount: "$—", note: "Digital radio (Pandora, SiriusXM) royalties" },
                ].map(r => (
                  <div key={r.source} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 18 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.source}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{r.note}</div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>{r.amount}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── AGENTS ── */}
      {activeTab === "agents" && (
        <div style={styles.agentGrid}>
          {[
            { icon: "👑", name: "Nia",           role: "Chief of Staff",      status: "active",  desc: "Running your label operations" },
            { icon: "📄", name: "EPKAgent",       role: "Press Kit",           status: "waiting", desc: "Builds and sends your EPK" },
            { icon: "⚖️", name: "LegalAgent",     role: "PRO & Publishing",    status: "active",  desc: "Registration checklist ready" },
            { icon: "🎤", name: "PitchAgent",     role: "Playlist Pitching",   status: "waiting", desc: "Curators database loaded" },
            { icon: "📲", name: "SocialAgent",    role: "Social Media",        status: "waiting", desc: "Connect Instagram to activate" },
            { icon: "📊", name: "StreamAgent",    role: "Streaming Analytics", status: "waiting", desc: "Connect Spotify for Artists" },
            { icon: "🎧", name: "DistrAgent",     role: "Distribution",        status: "waiting", desc: "Connect DistroKid / TuneCore" },
            { icon: "📻", name: "RadioAgent",     role: "Radio Promo",         status: "waiting", desc: "Pitches stations in your format" },
            { icon: "🎬", name: "SyncAgent",      role: "Sync Licensing",      status: "waiting", desc: "Lists catalog on sync libraries" },
            { icon: "🎶", name: "ARAgent",        role: "A&R Outreach",        status: "waiting", desc: "Reaches out to label A&R reps" },
            { icon: "🎵", name: "TikTokAgent",    role: "TikTok Strategy",     status: "waiting", desc: "Daily TikTok content strategy" },
            { icon: "📧", name: "InboxAgent",     role: "Comms",               status: "waiting", desc: "Fan DMs & booking inquiries" },
            { icon: "💰", name: "RoyaltyAgent",   role: "Royalties",           status: "waiting", desc: "Tracks all royalty payments" },
            { icon: "🔔", name: "AlertAgent",     role: "Monitoring",          status: "waiting", desc: "Playlist adds & press mentions" },
            { icon: "🎤", name: "PressBotAgent",  role: "Press & PR",          status: "waiting", desc: "Pitches blogs & music outlets" },
            { icon: "📅", name: "TourAgent",      role: "Tour & Booking",      status: "waiting", desc: "Venue research & booking help" },
            { icon: "🛒", name: "MerchAgent",     role: "Merchandise",         status: "waiting", desc: "Merch store & drop calendar" },
            { icon: "📈", name: "AdAgent",        role: "Paid Media",          status: "waiting", desc: "Spotify, Meta, YouTube ads" },
            { icon: "🎬", name: "VideoAgent",     role: "Content",             status: "waiting", desc: "Music videos & promo reels" },
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

/* ── Analytics stat card sub-component ─────────────────────────────────────── */
function AnalyticsStat({ label, value, icon, note, color }: { label: string; value: string; icon: string; note: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}22`, borderRadius: 14, padding: "20px 16px" }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: value === "—" || value === "$—" ? "rgba(255,255,255,0.2)" : "#fff" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: "4px 0 6px" }}>{label}</div>
      <div style={{ fontSize: 11, color: `${color}cc` }}>{note}</div>
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  page:          { background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", padding: "0 0 80px" },
  centered:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", padding: "80px 32px" },
  spinner:       { width: 36, height: 36, border: "3px solid rgba(168,85,247,0.2)", borderTop: "3px solid #a855f7", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  header:        { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 16 },
  avatar:        { width: 56, height: 56, borderRadius: 12, background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  planBadge:     { fontSize: 10, fontWeight: 700, color: "#a855f7", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 4, padding: "2px 8px", letterSpacing: 1 },
  primaryBtn:    { background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, textDecoration: "none", border: "none", cursor: "pointer", display: "inline-block" },
  warningBtn:    { background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", color: "#eab308", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, textDecoration: "none" },
  tabs:          { display: "flex", gap: 4, padding: "16px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" },
  tab:           { background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, padding: "10px 16px", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -1, whiteSpace: "nowrap" },
  tabActive:     { color: "#a855f7", borderBottom: "2px solid #a855f7" },
  statsGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, padding: "24px 32px 0" },
  twoCol:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 32px" },
  card:          { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px" },
  cardHeader:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" },
  agentRow:      { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  regRow:        { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  regLink:       { fontSize: 12, fontWeight: 600, color: "#a855f7", textDecoration: "none", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 6, padding: "4px 10px", whiteSpace: "nowrap" },
  emptyState:    { textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.35)", fontSize: 14 },
  agentGrid:     { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "24px 32px" },
  agentCard:     { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px" },
  agentCardActive: { borderColor: "rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.04)" },
};
