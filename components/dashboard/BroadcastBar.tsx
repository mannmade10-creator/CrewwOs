// components/dashboard/BroadcastBar.tsx
"use client";
import { useState } from "react";

export default function BroadcastBar({ workspaceSlug, onReplies }: {
  workspaceSlug: string;
  onReplies: (replies: { agent: string; name: string; reply: string }[], sentMessage: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!msg.trim() || loading) return;
    const sentMessage = msg.trim();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, message: sentMessage }),
      });
      const data = await res.json();
      onReplies(data.replies ?? [], sentMessage);
    } catch {
      onReplies([], sentMessage);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 14, borderBottom: "1px solid #ffffff11" }}>
      <div style={{ color: "#ffffff88", fontSize: 10, letterSpacing: 2, marginBottom: 10 }} className="mono">ALL-HANDS BROADCAST</div>
      <textarea
        value={msg} onChange={e => setMsg(e.target.value)}
        placeholder="Send a message to the whole team..."
        style={{ width: "100%", background: "#060612", border: "1px solid #ffffff22", borderRadius: 8, padding: 10, color: "#fff", fontSize: 11, resize: "none", height: 70, boxSizing: "border-box" }}
        className="mono"
      />
      <button onClick={send} disabled={loading} style={{
        marginTop: 8, width: "100%", background: "linear-gradient(135deg, #00D4FF, #A855F7)",
        border: "none", borderRadius: 8, padding: "8px", color: "#000", fontWeight: 700,
        cursor: "pointer", fontSize: 12, opacity: loading ? 0.6 : 1,
      }}>
        {loading ? "📡 Broadcasting..." : "📡 Broadcast to All Agents"}
      </button>
    </div>
  );
}
