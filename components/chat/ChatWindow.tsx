// components/chat/ChatWindow.tsx
"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import type { AgentDef } from "@/types";
import { PLAN_LABELS } from "@/lib/plans";
import { AGENTS } from "@/lib/agents";
import ToolResultCard from "./ToolResultCard";

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#00D4FF", Sales: "#FF6B35", Marketing: "#A855F7", Operations: "#10B981",
  "Real Estate": "#F59E0B", Restaurant: "#EF4444", "Music & Entertainment": "#8B5CF6", "E-Commerce": "#EC4899",
  Trades: "#F59E0B",
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGES_PER_MESSAGE = 5;

type Bubble =
  | { kind: "text"; role: "user" | "assistant"; text: string; redirectSlug?: string; images?: string[] } // images: data URLs, for display only
  | { kind: "tool"; toolName: string; input: any; result: string }
  | { kind: "system"; text: string };

// Agents are told to end a handoff with e.g. "[[REDIRECT:email]]" — this
// strips that tag out of the displayed text and returns the target slug,
// if any, so the UI can turn it into an actual clickable handoff instead of
// a suggestion that goes nowhere.
function parseRedirect(text: string): { clean: string; redirectSlug?: string } {
  const match = text.match(/\[\[REDIRECT:([a-z]+)\]\]\s*$/);
  if (!match) return { clean: text };
  const slug = match[1];
  const exists = AGENTS.some(a => a.slug === slug);
  return { clean: text.slice(0, match.index).trim(), redirectSlug: exists ? slug : undefined };
}

// Turns a raw stored Anthropic-format message array (as persisted by
// /api/agent-chat) into display bubbles — shared between hydrating on
// mount from history and parsing a live turn's new messages, so both
// paths render identically. User messages can now be either a plain
// string (no images) or an array of image/text blocks (images attached) —
// both are handled here.
function parseStoredMessages(messages: any[]): Bubble[] {
  const bubbles: Bubble[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user" && typeof m.content === "string") {
      bubbles.push({ kind: "text", role: "user", text: m.content });
    } else if (m.role === "user" && Array.isArray(m.content) && m.content.some((b: any) => b.type === "image" || b.type === "text")) {
      // A user turn with attached images: pull out the text block and
      // rebuild data URLs from the image blocks purely for display.
      const textBlock = m.content.find((b: any) => b.type === "text");
      const imageBlocks = m.content.filter((b: any) => b.type === "image");
      if (textBlock || imageBlocks.length) {
        bubbles.push({
          kind: "text",
          role: "user",
          text: textBlock?.text ?? "",
          images: imageBlocks.map((b: any) => `data:${b.source.media_type};base64,${b.source.data}`),
        });
      }
    } else if (m.role === "assistant" && Array.isArray(m.content)) {
      for (const block of m.content) {
        if (block.type === "text" && block.text) {
          const { clean, redirectSlug } = parseRedirect(block.text);
          if (clean) bubbles.push({ kind: "text", role: "assistant", text: clean, redirectSlug });
        } else if (block.type === "tool_use") {
          const resultMsg = messages[i + 1];
          let resultContent = "";
          if (resultMsg?.role === "user" && Array.isArray(resultMsg.content)) {
            const rb = resultMsg.content.find((c: any) => c.tool_use_id === block.id);
            if (rb) resultContent = rb.content;
          }
          bubbles.push({ kind: "tool", toolName: block.name, input: block.input, result: resultContent });
        }
      }
    }
    // Pure tool_result messages (role user, array content, no image/text
    // blocks) are consumed via lookahead above — nothing to render for
    // them directly.
  }
  return bubbles;
}

// File -> base64 (no data: prefix, since the API wants raw base64 and adds
// its own media_type field separately).
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatWindow({ agent, workspaceSlug, workspaceName, onClose, onLog, onSpeak, onRedirect, locked, plan, handoffNote }: {
  agent: AgentDef; workspaceSlug: string; workspaceName: string; onClose: () => void;
  onLog: (agentName: string, text: string) => void; onSpeak?: (text: string) => void;
  onRedirect?: (slug: string, note?: string) => void; locked?: boolean; plan?: string; handoffNote?: string;
}) {
  const color = DEPT_COLORS[agent.dept];
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [isFresh, setIsFresh] = useState(true); // true once we know there's no persisted history yet
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ file: File; previewUrl: string; mediaType: string }[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingHandoffNote = useRef(handoffNote); // sent with the first real message only, then cleared
  const { getToken } = useAuth(); // used to force a fresh session token right before sending a message

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [bubbles]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getToken({ skipCache: true }); // guard against a stale token if this mounts right as a session refresh is due
        const res = await fetch(`/api/agent-chat/history?workspaceSlug=${encodeURIComponent(workspaceSlug)}&agentSlug=${encodeURIComponent(agent.slug)}`);
        const data = await res.json();
        if (cancelled) return;
        const stored: any[] = data.messages ?? [];
        if (stored.length > 0) {
          setBubbles(parseStoredMessages(stored));
          setIsFresh(false);
        } else {
          const greeting: Bubble[] = [{ kind: "text", role: "assistant", text: `${agent.name} here — ${agent.role} on the ${workspaceName} crew. What do you need?` }];
          if (pendingHandoffNote.current) {
            greeting.push({ kind: "system", text: `🔁 Handed off — ${pendingHandoffNote.current}` });
          }
          setBubbles(greeting);
          setIsFresh(true);
        }
      } catch {
        setBubbles([{ kind: "text", role: "assistant", text: `${agent.name} here — ${agent.role} on the ${workspaceName} crew. What do you need?` }]);
      }
      setHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
    // Intentionally only on mount for this agent — ChatWindow is remounted
    // fresh (via key={agent.slug} in the parent) whenever the agent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow picking the same file again later
    setImageError(null);

    const invalid = files.find(f => !ALLOWED_IMAGE_TYPES.includes(f.type));
    if (invalid) {
      setImageError(`"${invalid.name}" isn't a supported image type — use JPEG, PNG, GIF, or WEBP.`);
      return;
    }
    if (pendingImages.length + files.length > MAX_IMAGES_PER_MESSAGE) {
      setImageError(`Max ${MAX_IMAGES_PER_MESSAGE} images per message.`);
      return;
    }

    const added = files.map(file => ({ file, previewUrl: URL.createObjectURL(file), mediaType: file.type }));
    setPendingImages(prev => [...prev, ...added]);
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const send = async (override?: string) => {
    const userMsg = (override ?? input).trim();
    if ((!userMsg && pendingImages.length === 0) || loading || locked) return;

    const imagesToSend = pendingImages;
    setInput("");
    setPendingImages([]);
    setImageError(null);
    setBubbles(b => [...b, { kind: "text", role: "user", text: userMsg, images: imagesToSend.map(i => i.previewUrl) }]);
    setLoading(true);

    // Force-refresh the session token before sending — POST requests don't
    // get Clerk's automatic silent refresh the way GET/navigation does, so a
    // token that's gone stale while the user was typing would otherwise 404
    // (Clerk session tokens are short-lived, ~60s, by design).
    await getToken({ skipCache: true });

    const notePayload = pendingHandoffNote.current;
    pendingHandoffNote.current = undefined; // only ever sent once

    try {
      const imagePayload = imagesToSend.length > 0
        ? await Promise.all(imagesToSend.map(async img => ({ media_type: img.mediaType, data: await fileToBase64(img.file) })))
        : undefined;

      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, agentSlug: agent.slug, message: userMsg, images: imagePayload, handoffNote: notePayload }),
      });
      const data = await res.json();

      if (!res.ok) {
        setBubbles(b => [...b, { kind: "text", role: "assistant", text: `Error: ${data.error ?? "something went wrong"}` }]);
        setLoading(false);
        return;
      }

      // newMessages includes this turn's own user message again (server
      // echoes it as the first entry) — skip that one, we already rendered
      // it optimistically above.
      const newBubbles = parseStoredMessages((data.newMessages ?? []).slice(1));
      for (const b of newBubbles) {
        setBubbles(prev => [...prev, b]);
        if (b.kind === "tool") onLog(agent.name, `ran ${b.toolName}`);
      }

      const lastText = [...newBubbles].reverse().find(b => b.kind === "text" && b.role === "assistant") as Extract<Bubble, { kind: "text" }> | undefined;
      const replyText = lastText?.text ?? data.reply;
      onLog(agent.name, replyText.slice(0, 80));
      onSpeak?.(replyText);
      setIsFresh(false);
    } catch (err) {
  console.error("[ChatWindow] send error:", err);
      setBubbles(b => [...b, { kind: "text", role: "assistant", text: "Connection issue — try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", right: 20, top: 80, width: 400, height: "calc(100vh - 100px)",
      background: "#0d0d1a", border: `1px solid ${locked ? "#ffffff33" : color}`, borderRadius: 12,
      display: "flex", flexDirection: "column", zIndex: 1000, boxShadow: locked ? "none" : `0 0 30px ${color}44`,
    }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${locked ? "#ffffff22" : color + "44"}`, display: "flex", alignItems: "center", gap: 10, background: locked ? "#ffffff08" : `${color}11` }}>
        <span style={{ fontSize: 24, filter: locked ? "grayscale(0.8)" : "none" }}>{agent.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: locked ? "#ffffff88" : color, fontWeight: 700, fontSize: 14 }}>{agent.name}</div>
          <div style={{ color: "#ffffff66", fontSize: 11 }}>{agent.role} · {workspaceName}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
      </div>

      {locked ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
            {agent.name} isn't on the {plan ? (PLAN_LABELS[plan]?.name ?? plan) : "current"} plan
          </div>
          <div style={{ color: "#ffffff66", fontSize: 12, maxWidth: 260, lineHeight: 1.6 }}>
            Upgrade your workspace in Settings to unlock {agent.name} and the rest of the {agent.dept.toLowerCase()} team.
          </div>
          <a href={`/dashboard/${workspaceSlug}/settings`} style={{
            marginTop: 8, background: "linear-gradient(135deg, #00D4FF, #A855F7)", color: "#000",
            fontWeight: 700, padding: "8px 20px", borderRadius: 8, fontSize: 12, textDecoration: "none",
          }}>
            View plans
          </a>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {!historyLoaded && (
              <div style={{ color: "#ffffff44", fontSize: 12, textAlign: "center", padding: 20 }}>Loading conversation...</div>
            )}
            {bubbles.map((b, i) => {
              if (b.kind === "tool") return <ToolResultCard key={i} toolName={b.toolName} input={b.input} result={b.result} color={color} />;
              if (b.kind === "system") {
                return (
                  <div key={i} style={{ textAlign: "center", color: "#ffffff55", fontSize: 10.5, padding: "4px 10px", fontStyle: "italic" }}>
                    {b.text}
                  </div>
                );
              }
              const target = b.redirectSlug ? AGENTS.find(a => a.slug === b.redirectSlug) : undefined;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: b.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
                  <div style={{
                    maxWidth: "85%", padding: "8px 12px",
                    borderRadius: b.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    background: b.role === "user" ? "#1a1a3a" : `${color}18`,
                    border: b.role === "user" ? "1px solid #ffffff22" : `1px solid ${color}44`,
                    color: b.role === "user" ? "#fff" : "#e0e0e0", fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap",
                  }}>
                    {b.role === "assistant" && (
                      <div style={{ color, fontSize: 10, marginBottom: 4, fontWeight: 700 }} className="mono">{agent.name} · {agent.role}</div>
                    )}
                    {b.images && b.images.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: b.text ? 8 : 0 }}>
                        {b.images.map((src, imgIdx) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={imgIdx} src={src} alt="attached" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #ffffff33" }} />
                        ))}
                      </div>
                    )}
                    {b.text}
                  </div>
                  {target && (
                    <button onClick={() => onRedirect?.(target.slug, b.text)} style={{
                      display: "flex", alignItems: "center", gap: 6, background: "transparent",
                      border: `1px solid ${DEPT_COLORS[target.dept]}55`, color: DEPT_COLORS[target.dept],
                      borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>
                      <span>{target.emoji}</span> Talk to {target.name} instead →
                    </button>
                  )}
                </div>
              );
            })}
            {loading && (
              <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 4px", background: `${color}18`, border: `1px solid ${color}44`, color, fontSize: 12, width: "fit-content" }}>
                <span style={{ animation: "blink 1s infinite" }}>● ● ●</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {isFresh && historyLoaded && bubbles.filter(b => b.kind !== "system").length <= 1 && !loading && (
            <div style={{ padding: "0 14px 10px", display: "flex", gap: 8 }}>
              <button onClick={() => send("Hey! Just wanted to say hi 👋")} style={{
                flex: 1, background: "transparent", border: `1px solid ${color}44`, color,
                borderRadius: 8, padding: "7px", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>
                👋 Say hi
              </button>
              <button onClick={() => document.getElementById(`chat-input-${agent.slug}`)?.focus()} style={{
                flex: 1, background: "transparent", border: "1px solid #ffffff22", color: "#ffffff88",
                borderRadius: 8, padding: "7px", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>
                📋 Give a task
              </button>
            </div>
          )}

          {imageError && (
            <div style={{ margin: "0 12px 8px", color: "#ff6666", fontSize: 11, padding: "6px 10px", background: "#ff444411", border: "1px solid #ff444455", borderRadius: 8 }}>
              {imageError}
            </div>
          )}

          {pendingImages.length > 0 && (
            <div style={{ display: "flex", gap: 8, padding: "0 12px 8px", flexWrap: "wrap" }}>
              {pendingImages.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.previewUrl} alt="pending attachment" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: `1px solid ${color}66` }} />
                  <button onClick={() => removePendingImage(i)} style={{
                    position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%",
                    background: "#ff4444", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: 1,
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: 12, borderTop: `1px solid ${color}44`, display: "flex", gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              multiple
              onChange={handleFilePick}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach image(s)"
              style={{
                background: "transparent", border: `1px solid ${color}44`, borderRadius: 8, padding: "0 10px",
                color, cursor: "pointer", fontSize: 16,
              }}
            >
              📷
            </button>
            <input
              id={`chat-input-${agent.slug}`}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder={`Message ${agent.name}...`}
              style={{ flex: 1, background: "#1a1a2e", border: `1px solid ${color}44`, borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }}
            />
            <button onClick={() => send()} disabled={loading} style={{ background: color, border: "none", borderRadius: 8, padding: "8px 14px", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: loading ? 0.5 : 1 }}>→</button>
          </div>
        </>
      )}
    </div>
  );
}
