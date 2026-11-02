// lib/agent-memory.ts
//
// Persistent key-value memory for agents across sessions.
// Agents call rememberFact() to store a named fact and recallFacts() to load
// all their memories at the start of a turn (injected into the system prompt).
//
// Usage in agent-runtime.ts system prompt:
//   const memories = await recallFacts(workspaceId, agentSlug);
//   const memoryBlock = formatMemoryBlock(memories);
//   // prepend memoryBlock to system prompt

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AgentMemory {
  key: string;
  value: string;
  source: "agent" | "user" | "system";
  updated_at: string;
}

// ── Read ───────────────────────────────────────────────────────────────────────

export async function recallFacts(
  workspaceId: string,
  agentSlug: string
): Promise<AgentMemory[]> {
  const { data, error } = await supabase
    .from("agent_memory")
    .select("key, value, source, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("agent_slug", agentSlug)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[agent-memory] recallFacts error:", error.message);
    return [];
  }
  return (data ?? []) as AgentMemory[];
}

export function formatMemoryBlock(memories: AgentMemory[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map((m) => `- ${m.key}: ${m.value}`).join("\n");
  return `[AGENT MEMORY — facts you've remembered about this workspace]\n${lines}\n[END MEMORY]\n\n`;
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function rememberFact(
  workspaceId: string,
  agentSlug: string,
  key: string,
  value: string,
  source: "agent" | "user" | "system" = "agent"
): Promise<void> {
  const { error } = await supabase.from("agent_memory").upsert(
    {
      workspace_id: workspaceId,
      agent_slug: agentSlug,
      key: key.trim().toLowerCase().replace(/\s+/g, "_"),
      value,
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,agent_slug,key" }
  );

  if (error) {
    console.error("[agent-memory] rememberFact error:", error.message);
  }
}

export async function forgetFact(
  workspaceId: string,
  agentSlug: string,
  key: string
): Promise<void> {
  await supabase
    .from("agent_memory")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("agent_slug", agentSlug)
    .eq("key", key.trim().toLowerCase().replace(/\s+/g, "_"));
}

// ── Checkpoints ────────────────────────────────────────────────────────────────

export interface CheckpointData {
  messages: any[];
  pending_steps?: any[];
  tool_outputs?: Record<string, any>;
  metadata?: Record<string, any>;
}

export async function saveCheckpoint(
  workspaceId: string,
  agentSlug: string,
  stateData: CheckpointData,
  options?: { taskId?: string; label?: string }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("agent_session_checkpoints")
    .insert({
      workspace_id: workspaceId,
      agent_slug: agentSlug,
      task_id: options?.taskId ?? null,
      checkpoint_label: options?.label ?? null,
      state_data: stateData,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[agent-memory] saveCheckpoint error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function loadLatestCheckpoint(
  workspaceId: string,
  agentSlug: string,
  taskId?: string
): Promise<{ id: string; stateData: CheckpointData; label: string | null } | null> {
  let query = supabase
    .from("agent_session_checkpoints")
    .select("id, state_data, checkpoint_label")
    .eq("workspace_id", workspaceId)
    .eq("agent_slug", agentSlug)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (taskId) query = query.eq("task_id", taskId);

  const { data, error } = await query.single();

  if (error || !data) return null;

  // Mark as resumed
  await supabase
    .from("agent_session_checkpoints")
    .update({ status: "resumed", resumed_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    id: data.id,
    stateData: data.state_data as CheckpointData,
    label: data.checkpoint_label,
  };
}
