// app/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 13, letterSpacing: 3, color: "#00D4FF", fontFamily: "'JetBrains Mono', monospace" }}>CREWOS</div>
      <h1 style={{ fontSize: 36, margin: 0 }}>Hire the team. Skip the overhead.</h1>
      <p style={{ color: "#ffffff88", maxWidth: 480 }}>
        19 AI agents run engineering, sales, marketing, and operations for your business — 24/7.
      </p>
      <Link href="/sign-in" style={{
        marginTop: 12, background: "linear-gradient(135deg, #00D4FF, #A855F7)",
        color: "#000", fontWeight: 700, padding: "10px 24px", borderRadius: 8, textDecoration: "none",
      }}>
        Sign in
      </Link>
    </main>
  );
}
