// lib/conversations.ts
//
// Wires up the `conversations` table that's existed in the schema since
// the beginning but was never actually connected to anything — every chat
// has been fully ephemeral until now, reset to blank on every remount.
//
// Model: one ongoing conversation per (workspace, agent, user) — not
// discrete "sessions." Reopening an agent continues where you left off,
// the same way a real Slack DM thread would, rather than starting fresh
// each time.

import { supabaseAdmin, resolveAgentRowId } from "./supabase";

// A stored message array can end up malformed two ways: cut mid tool_use/
// tool_result pair by trimming (front), or ending on an assistant message
// that requested a tool but never got a result appended (back — e.g. the
// server crashed between pushing the tool_use and finishing the loop).
// Anthropic's API rejects either shape outright. This sanitizes both ends
// so a once-corrupted stored conversation self-heals on the next load,
// rather than permanently 500ing every request from here on.
export function sanitizeAndTrim(messages: any[], maxLen: number): any[] {
  let start = messages.length > maxLen ? messages.length - maxLen : 0;
  while (start < messages.length) {
    const m = messages[start];
    // A real user turn is either a plain string or an array of image/text
    // blocks (attached images) — only a tool_result array is an orphan.
    const isToolResult = Array.isArray(m.content) && m.content.some((b: any) => b.type === "tool_result");
    if (m.role === "user" && !isToolResult) break;
    start++;
  }
  let result = messages.slice(start);

  const last = result[result.length - 1];
  if (last?.role === "assistant" && Array.isArray(last.content) && last.content.some((b: any) => b.type === "tool_use")) {
    result = result.slice(0, -1); // drop an incomplete trailing turn
  }

  return result;
}

export async function loadConversationMessages(workspaceId: string, agentSlug: string, userId: string): Promise<any[]> {
  const agentRowId = await resolveAgentRowId(workspaceId, agentSlug);
  if (!agentRowId) return [];

  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("conversations")
    .select("messages")
    .eq("workspace_id", workspaceId)
    .eq("agent_id", agentRowId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const raw = (data?.messages as any[]) ?? [];
  // Sanitize on load too — if a conversation got corrupted before this fix
  // existed (or by any future bug), this heals it going forward instead of
  // permanently 500ing every request against it. Large maxLen here since
  // this is just cleanup, not the real length cap (that's applied on save).
  return sanitizeAndTrim(raw, 1000);
}

export async function saveConversationMessages(workspaceId: string, agentSlug: string, userId: string, messages: any[]): Promise<void> {
  const agentRowId = await resolveAgentRowId(workspaceId, agentSlug);
  if (!agentRowId) return;

  const supabase = supabaseAdmin();

  // Find the existing row (if any) to update in place, rather than
  // accumulating a new row per turn.
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("agent_id", agentRowId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("conversations")
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) console.error("saveConversationMessages (update) failed:", error.message);
  } else {
    const { error } = await supabase
      .from("conversations")
      .insert({ workspace_id: workspaceId, agent_id: agentRowId, user_id: userId, messages });
    if (error) console.error("saveConversationMessages (insert) failed:", error.message);
  }
}
