// app/artists/page.tsx — CrewwOS for Artists
// Full major-label replacement: PRO registration, press kit, streaming setup,
// radio royalties, sync licensing, distribution, and release machine.
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "CrewwOS for Artists — Your Major Label, Without the Label",
  description:
    "19 AI agents that do everything a major label does for its artists — BMI/ASCAP registration, press kit, streaming setup, radio royalties, sync licensing, fan growth, and more. Plans from $97/mo.",
};

export default async function ArtistsPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main style={{ minHeight: "100vh", background: "#060612", color: "#fff", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 1000, height: 700, background: "radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, rgba(244,63,142,0.06) 40%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} aria-hidden />

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 64, background: "rgba(6,6,18,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00d8c0, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000" }}>C</span>
          CrewwOS
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textDecoration: "none" }}>← All verticals</Link>
          <Link href="/sign-in" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}>Log in</Link>
          <Link href="/sign-up" style={{ background: "linear-gradient(135deg, #a855f7, #f43f8e)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Get started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "100px 24px 80px", maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 99, padding: "6px 16px", fontSize: 13, color: "#a855f7", marginBottom: 32, letterSpacing: "0.3px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7", animation: "pulse 2s ease-in-out infinite", display: "inline-block" }} />
          The major label for independent artists — at indie prices
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 78px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px" }}>
          Everything Def Jam does<br />
          <span style={{ background: "linear-gradient(135deg, #a855f7 0%, #f43f8e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>for 1% of the cost.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>
          CrewwOS gives independent artists the full label stack — legal setup, PRO registration, press kits, streaming distribution, radio royalties, sync licensing, curator pitching, fan growth, and content creation — powered by 19 AI agents that never sleep.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
          <Link href="/sign-up" style={{ background: "linear-gradient(135deg, #a855f7, #f43f8e)", color: "#fff", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>Start your label today →</Link>
          <a href="#label-services" style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 15, padding: "14px 28px", borderRadius: 10, textDecoration: "none" }}>See what's included</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {[["$0","Label fee (ever)"],["100%","Royalties you keep"],["19","AI agents on your team"],["24/7","Always working"]].map(([n,l]) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "24px 16px", background: "rgba(6,6,18,0.8)" }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{n}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── LABEL SERVICES ── */}
      <section id="label-services" style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#a855f7", margin: "0 0 16px" }}>Label services</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>Everything a major label does. Done for you.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 600, lineHeight: 1.7, margin: "0 0 56px" }}>
          From the first legal step to the last promotional push — CrewwOS runs your entire career operation like an in-house team at Atlantic Records.
        </p>

        {LABEL_SERVICES.map((group) => (
          <div key={group.category} style={{ marginBottom: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <span style={{ fontSize: 22 }}>{group.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#a855f7", marginBottom: 2 }}>{group.category}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{group.title}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {group.items.map((item) => (
                <div key={item.name} style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.12)", borderRadius: 14, padding: "20px" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 12 }}>{item.desc}</div>
                  {item.details && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {item.details.map((d) => (
                        <div key={d} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", gap: 6 }}>
                          <span style={{ color: "#a855f7" }}>→</span>{d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── AGENT ROSTER ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto", background: "rgba(168,85,247,0.03)", borderTop: "1px solid rgba(168,85,247,0.08)", borderBottom: "1px solid rgba(168,85,247,0.08)" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#a855f7", margin: "0 0 16px" }}>Your AI label team</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>19 agents. Tuned for artists.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 580, lineHeight: 1.7, margin: "0 0 56px" }}>
          Each agent plays a specific role in your release machine. Together they run like a full-service label — 24/7, without the 360 deal.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {MUSIC_AGENTS.map((a) => (
            <div key={a.name} style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 12, padding: "16px 14px" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: "rgba(168,85,247,0.8)", marginBottom: 6 }}>{a.role}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#a855f7", margin: "0 0 16px" }}>Release machine</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>Your full release, on autopilot.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 580, lineHeight: 1.7, margin: "0 0 56px" }}>
          From weeks out to release day to the long tail — every phase of your rollout, handled by your crew while you focus on making music.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {TIMELINE.map((t, i) => (
            <div key={t.week} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 24, paddingBottom: i < TIMELINE.length - 1 ? 0 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(244,63,142,0.2))", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 10, padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 10, color: "#a855f7", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Phase</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.week}</div>
                </div>
                {i < TIMELINE.length - 1 && <div style={{ width: 1, flex: 1, background: "rgba(168,85,247,0.15)", margin: "8px 0" }} />}
              </div>
              <div style={{ paddingBottom: 32 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{t.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 10 }}>{t.desc}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {t.actions.map((a) => (
                    <span key={a} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.12)", borderRadius: 4, padding: "3px 8px" }}>{a}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#a855f7", margin: "0 0 16px", textAlign: "center" }}>Pricing</p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px", textAlign: "center" }}>Your career. Your terms.</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 520, lineHeight: 1.7, margin: "0 auto 56px", textAlign: "center" }}>
          A major label takes 20-30% of everything you earn forever. CrewwOS charges a flat monthly fee and keeps zero of your royalties.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {ARTIST_PLANS.map((p) => (
            <div key={p.name} style={{ background: p.featured ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${p.featured ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "28px 24px", position: "relative" }}>
              {p.featured && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #a855f7, #f43f8e)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99, whiteSpace: "nowrap" }}>Most popular</div>}
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: p.featured ? "#a855f7" : "rgba(255,255,255,0.5)", marginBottom: 12 }}>{p.name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px", marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>/month</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.5 }}>{p.desc}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>UP TO {p.agents} AGENTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {p.feats.map((f) => (
                  <div key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#a855f7", flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <Link href="/sign-up" style={{ display: "block", textAlign: "center", background: p.featured ? "linear-gradient(135deg, #a855f7, #f43f8e)" : "rgba(255,255,255,0.07)", color: p.featured ? "#fff" : "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 10, textDecoration: "none" }}>
                {p.price === "$97" ? "Start free trial →" : "Get started →"}
              </Link>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 24 }}>You keep 100% of your royalties. Always. No hidden fees. No contracts.</p>
      </section>

      {/* ── FAQ ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: 800, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#a855f7", margin: "0 0 16px", textAlign: "center" }}>Common questions</p>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 40px", textAlign: "center" }}>Everything you need to know.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FAQ.map((f) => (
            <div key={f.q} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{f.q}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1.5px", margin: "0 0 20px" }}>
          Your music deserves<br />
          <span style={{ background: "linear-gradient(135deg, #a855f7, #f43f8e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>major label attention.</span>
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: "0 0 40px" }}>
          Get registered, distributed, and promoted in under 10 minutes. No 360 deals. No signing away your masters.
        </p>
        <Link href="/sign-up" style={{ display: "inline-block", background: "linear-gradient(135deg, #a855f7, #f43f8e)", color: "#fff", fontWeight: 700, fontSize: 16, padding: "16px 36px", borderRadius: 12, textDecoration: "none" }}>
          Build your label today →
        </Link>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>14-day free trial · Keep 100% of your royalties · Cancel anytime</p>
      </section>

      {/* Footer */}
      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
        <span>© 2026 CrewwOS · M.A.D.E Technologies Inc.</span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Hub</Link>
          <Link href="/business" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Business</Link>
          <Link href="/sign-in" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Login</Link>
        </div>
      </footer>
    </main>
  );
}

/* ── Data ── */

const LABEL_SERVICES = [
  {
    category: "Legal & Business Setup",
    title: "Get your business right before your first dollar.",
    icon: "⚖️",
    items: [
      {
        name: "PRO Registration (BMI / ASCAP)",
        desc: "Your AI guides you step-by-step through registering as a songwriter and publisher with BMI or ASCAP so you collect every performance royalty you're owed.",
        details: [
          "Walks you through BMI vs ASCAP comparison",
          "Completes registration workflow with you",
          "Registers each song's publishing rights",
          "Sets up your publisher entity (if needed)",
        ],
      },
      {
        name: "Music Business LLC Setup",
        desc: "Guidance on setting up your own publishing company or artist LLC so you own your masters and keep your royalties separate from personal finances.",
        details: [
          "Explains sole-prop vs LLC for artists",
          "Guides you through state filing steps",
          "Sets up a DBA (doing business as) name",
          "Helps you open a dedicated business account",
        ],
      },
      {
        name: "Copyright Registration",
        desc: "Your CrewwOS agents walk you through registering your songs with the U.S. Copyright Office (or your country's equivalent) to protect your original work.",
        details: [
          "Prepares your copyright application",
          "Organizes song registrations by release",
          "Explains work-for-hire vs. ownership",
          "Creates a copyright log for your catalog",
        ],
      },
    ],
  },
  {
    category: "Streaming & Distribution",
    title: "Get your music everywhere legally — and get paid.",
    icon: "🎧",
    items: [
      {
        name: "Streaming Distribution Setup",
        desc: "Guides you through setting up accounts with DistroKid, TuneCore, or CD Baby so your music lands on Spotify, Apple Music, Tidal, Amazon, and 150+ platforms on your schedule.",
        details: [
          "Compares distributor options and fees",
          "Optimizes metadata (ISRC, UPC, genre tags)",
          "Schedules release dates for maximum impact",
          "Sets up your Spotify for Artists profile",
        ],
      },
      {
        name: "Radio Royalties (SoundExchange)",
        desc: "Most artists miss out on digital radio royalties from Pandora, SiriusXM, and internet radio. CrewwOS registers you with SoundExchange so that money doesn't disappear.",
        details: [
          "Registers you as artist AND copyright owner",
          "Guides SoundExchange account setup",
          "Explains the performer vs. label split",
          "Monitors and alerts you on royalty statements",
        ],
      },
      {
        name: "YouTube Content ID & Music Rights",
        desc: "Register your music with YouTube Content ID so every fan upload, reaction video, and gaming stream that uses your music generates revenue for you.",
        details: [
          "Sets up Content ID via your distributor",
          "Explains monetization vs. block policies",
          "Guides YouTube for Artists setup",
          "Tracks YouTube royalty income for you",
        ],
      },
    ],
  },
  {
    category: "Press & Identity",
    title: "Look like a signed artist from day one.",
    icon: "📰",
    items: [
      {
        name: "EPK (Electronic Press Kit) Builder",
        desc: "Your AI writes and assembles a professional Electronic Press Kit — the tool curators, press, booking agents, and sync supervisors use to evaluate whether to work with you.",
        details: [
          "Artist bio (short, long, and one-liner versions)",
          "Discography with streaming links",
          "Press quotes and achievements",
          "High-res photo spec guide",
          "Contact and booking info",
        ],
      },
      {
        name: "Artist Bio & Brand Voice",
        desc: "CrewwOS interviews you and writes a bio that sounds like you — not a press release. Used everywhere from Spotify to music blogs to booking forms.",
        details: [
          "Q&A intake to capture your story",
          "Three-length bio (50-word, 150-word, full)",
          "Updated automatically after each release",
          "Consistent voice across all platforms",
        ],
      },
      {
        name: "Press & Blog Outreach",
        desc: "Automated outreach to music blogs, tastemaker sites, and playlist curators with your EPK and story. Gets your name in front of people who can amplify your reach.",
        details: [
          "Targets genre-relevant outlets",
          "Personalized pitch for each contact",
          "Follow-up sequences that don't annoy",
          "Tracks responses and coverage",
        ],
      },
    ],
  },
  {
    category: "Sync & Licensing",
    title: "Get paid when your music is placed in film, TV, and ads.",
    icon: "🎬",
    items: [
      {
        name: "Sync Licensing Setup",
        desc: "Sync licensing is how songs end up in movies, TV shows, commercials, and video games — and it pays some of the biggest checks in the music industry. CrewwOS helps you set this up.",
        details: [
          "Explains sync vs. master licensing",
          "Guides you through Music Bed, Artlist, etc.",
          "Helps you register with sync agencies",
          "Prepares your catalog metadata for placement",
        ],
      },
      {
        name: "Neighboring Rights",
        desc: "If your music plays on international radio or streaming, you may be owed neighboring rights royalties through PPL (UK), SOCAN (Canada), or other CMOs. CrewwOS finds and files them.",
        details: [
          "Identifies which countries owe you royalties",
          "Guides registration with each CMO",
          "Tracks international income streams",
          "Consolidates royalty statements",
        ],
      },
      {
        name: "Licensing Agreement Templates",
        desc: "Standard-issue music licensing agreements for sync, samples, features, and co-writes — so you can say yes to opportunities without a lawyer for every deal.",
        details: [
          "Sync licensing agreement template",
          "Feature/collaboration agreement",
          "Sample clearance documentation",
          "Co-writer split sheet generator",
        ],
      },
    ],
  },
  {
    category: "Release & Promotion",
    title: "Your release machine — from idea to charts.",
    icon: "🚀",
    items: [
      {
        name: "Spotify Playlist Pitching",
        desc: "Your PitchAgent submits your upcoming releases to Spotify's editorial team and to thousands of independent curators who run genre playlists with real listeners.",
        details: [
          "Spotify for Artists editorial submission",
          "Independent curator database outreach",
          "Pitch sequencing 4 weeks before release",
          "Tracks playlist adds and listener reach",
        ],
      },
      {
        name: "Social Content Machine",
        desc: "Your content agents write captions, generate short-form videos, create release graphics, and schedule posts across TikTok, Instagram, Twitter/X, and YouTube Shorts.",
        details: [
          "Release countdown content series",
          "Behind-the-scenes content calendar",
          "Lyric video and visualizer planning",
          "Post timing optimized per platform",
        ],
      },
      {
        name: "Fan Engagement & Community",
        desc: "Your FanAgent responds to fan comments, DMs, and emails; runs fan contests; and builds the kind of community engagement that algorithms reward and labels pay teams to do.",
        details: [
          "Automated DM replies for new followers",
          "Fan contest and giveaway management",
          "Email list growth and newsletters",
          "Discord or community setup guidance",
        ],
      },
    ],
  },
];

const MUSIC_AGENTS = [
  { icon: "👑", name: "Nia",            role: "Chief of Staff",       desc: "Coordinates your entire label team" },
  { icon: "🎤", name: "PitchAgent",     role: "A&R / Promotions",     desc: "Pitches to Spotify editorial and 1,000+ curators" },
  { icon: "📰", name: "PressAgent",     role: "Publicist",            desc: "Builds EPK and reaches out to blogs and press" },
  { icon: "📲", name: "SocialAgent",    role: "Social Media Manager", desc: "Creates and schedules content across all platforms" },
  { icon: "🎬", name: "VideoAgent",     role: "Creative Director",    desc: "Generates short-form video ads and lyric visuals" },
  { icon: "✍️", name: "CopyAgent",      role: "Copywriter",           desc: "Writes bios, captions, pitches, and newsletters" },
  { icon: "❤️", name: "FanAgent",       role: "Fan Relations",        desc: "Engages fans, responds to DMs, grows community" },
  { icon: "📊", name: "StreamAgent",    role: "Analytics",            desc: "Tracks streams, playlist adds, and growth" },
  { icon: "🔍", name: "TrendAgent",     role: "A&R Intelligence",     desc: "Monitors sounds and trends before they peak" },
  { icon: "💰", name: "RoyaltyAgent",   role: "Business Manager",     desc: "Tracks all royalty income across platforms" },
  { icon: "📧", name: "InboxAgent",     role: "Label Operations",     desc: "Manages email and collaboration inquiries" },
  { icon: "🔁", name: "FollowUpAgent",  role: "Follow-Up",            desc: "Keeps curator and press pitches alive" },
  { icon: "🤖", name: "ChatAgent",      role: "Fan Chat",             desc: "Handles fan and brand inquiry DMs" },
  { icon: "📅", name: "ScheduleAgent",  role: "Tour / Calendar",      desc: "Books promo, sessions, and interviews" },
  { icon: "🎵", name: "PlaylistAgent",  role: "DSP Strategy",         desc: "Manages all playlist targeting and follow-up" },
  { icon: "📄", name: "EPKAgent",       role: "Press Kit",            desc: "Keeps your EPK current and professionally formatted" },
  { icon: "⚖️", name: "LegalAgent",     role: "Business Affairs",     desc: "Guides PRO, copyright, and sync setup" },
  { icon: "💾", name: "SaveAgent",      role: "Archive",              desc: "Catalogs your masters, splits, and ownership docs" },
  { icon: "📈", name: "AdAgent",        role: "Paid Media",           desc: "Runs Meta and TikTok ads for your releases" },
];

const TIMELINE = [
  { week: "8 Weeks Out",   title: "Foundation & Setup",  desc: "Before anything goes public, your legal and business foundation is in place.", actions: ["BMI/ASCAP registration", "PRO account setup", "Copyright registration", "Distributor account", "EPK build", "Streaming profiles"] },
  { week: "6 Weeks Out",   title: "Pre-Release Campaign", desc: "Tease the project, build anticipation, and start warming up the algorithm.", actions: ["First content drop", "Teaser clips", "Email list announcement", "Curator research begins", "Press list compiled"] },
  { week: "4 Weeks Out",   title: "Curator & Press Push", desc: "Pitches go to Spotify editorial, independent curators, and relevant music blogs.", actions: ["Spotify editorial pitch", "Curator outreach (1,000+)", "Blog and press pitches", "Distributor pre-save live"] },
  { week: "2 Weeks Out",   title: "Content Surge",        desc: "Daily content across all platforms, countdown posts, and fan activation.", actions: ["Daily TikTok posts", "Instagram countdown", "Email sequence", "SoundExchange registered", "YouTube Content ID setup"] },
  { week: "Release Day",   title: "Launch",               desc: "Your music goes live and your full crew executes the day-one strategy simultaneously.", actions: ["Release live everywhere", "Announcement posts", "Story takeovers", "Fan DM activation", "Paid ads launch"] },
  { week: "Post-Release",  title: "Long-Tail Growth",     desc: "The campaign doesn't stop at release. Your agents keep pushing, pitching, and analyzing for 90 days.", actions: ["Ongoing playlist pitching", "Press follow-up", "Fan engagement daily", "Royalty monitoring", "Sync licensing outreach", "Analytics reporting"] },
];

const ARTIST_PLANS = [
  {
    name: "Indie", price: "$97", agents: 3, featured: false,
    desc: "For artists just getting started who need the essentials running.",
    feats: ["Nia + PitchAgent + SocialAgent", "PRO registration guidance", "Basic EPK template", "Curator pitching", "Weekly release tips"],
  },
  {
    name: "Rising", price: "$497", agents: 8, featured: true,
    desc: "The core label team for artists actively releasing music.",
    feats: ["Everything in Indie", "PressAgent + VideoAgent", "FanAgent + StreamAgent", "Full EPK builder", "SoundExchange setup", "YouTube Content ID", "Press & blog outreach", "30-day release campaign"],
  },
  {
    name: "Major", price: "$997", agents: 19, featured: false,
    desc: "All 19 agents, full label stack, sync licensing and paid ads.",
    feats: ["Everything in Rising", "All 19 agents active", "Sync licensing setup", "Paid ad campaigns (Meta/TikTok)", "Neighboring rights registration", "Copyright registration support", "Priority Nia coordination"],
  },
  {
    name: "Label", price: "$2,497", agents: 19, featured: false,
    desc: "Multi-artist management — run a full roster with one account.",
    feats: ["Everything in Major", "Up to 5 artist profiles", "Label-level analytics dashboard", "Custom workflow build", "Dedicated account manager", "White-label artist portals", "Monthly strategy call"],
  },
];

const FAQ = [
  { q: "What's the difference between BMI and ASCAP, and which one should I pick?", a: "Both are performing rights organizations (PROs) that collect royalties when your music plays on radio, TV, streaming, and live venues. BMI and ASCAP are the two biggest U.S. PROs — both are excellent and have similar royalty rates. Your CrewwOS LegalAgent will walk you through the differences and help you complete the registration for whichever you choose." },
  { q: "I've never registered my music. Where do I start?", a: "Start with your PRO registration (BMI or ASCAP) and your Copyright registration — those two steps protect your work and unlock royalty collection before you do anything else. Your Indie plan includes guided walkthroughs for both. Then your agent sets up your streaming distribution so your music is live everywhere within 24-48 hours." },
  { q: "What is SoundExchange and why does it matter?", a: "SoundExchange collects digital performance royalties from platforms like Pandora, SiriusXM, and internet radio stations. Most indie artists never register, so those royalties sit unclaimed. Your CrewwOS agent registers you as both the performer and the sound recording copyright owner, so you collect both shares." },
  { q: "Can CrewwOS actually pitch my music to Spotify playlists?", a: "Yes — your PitchAgent submits your upcoming releases through Spotify for Artists (for editorial playlists) starting 4 weeks before your release date, the minimum Spotify requires. For independent curator playlists (which often have highly engaged niche audiences), your agent reaches out to thousands of curators relevant to your genre." },
  { q: "What is sync licensing and how do I get my music in TV shows or movies?", a: "Sync licensing is the legal permission for someone to use your music in a video project — a film, TV show, ad, game, or YouTube video. Your Major plan includes guidance on registering your catalog with sync licensing platforms and agencies, and ensuring your metadata is clean so supervisors can find and clear your music quickly." },
  { q: "Does CrewwOS take any percentage of my royalties?", a: "Never. CrewwOS charges a flat monthly subscription. Every dollar your music earns — streaming, radio, sync, performance, YouTube — goes directly to you. We don't take a cut of your income. Ever." },
];
