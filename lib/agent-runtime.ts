// lib/agent-runtime.ts
//
// The actual Claude tool_use loop for running one agent turn — extracted
// from app/api/agent-chat/route.ts so it can be called two ways:
//   1. From the chat route, for a real user message (Clerk-authenticated,
//      rate-limited, scoped to the signed-in user's conversation).
//   2. From app/api/cron/daily-ops/route.ts, for autonomous scheduled runs
//      with no user present — the "message" is a system-authored prompt,
//      and the conversation is scoped under the workspace owner's userId so
//      the owner can see exactly what an agent did overnight, in the same
//      chat thread they'd normally use.
//
// Neither caller duplicates the tool-loop logic — this is the one place
// it lives.

import { anthropic, MODEL } from "./claude";
import { AGENTS, getAgent, systemPromptFor } from "./agents";
import { toolsForAgent, TOOL_DEFINITIONS } from "./tools";
import { EXECUTORS } from "./tool-executors";
import { logTask } from "./supabase";
import { loadConversationMessages, saveConversationMessages, sanitizeAndTrim } from "./conversations";

const MAX_TOOL_ROUNDS = 5;
const MAX_HISTORY_MESSAGES = 60;

// A CEO-attached image — sent as base64 straight from the browser's file
// picker. media_type must be one of what Claude's vision API accepts
// (jpeg, png, gif, webp); the chat UI is responsible for only offering
// those file types and doing the base64 conversion before this ever gets
// called.
export interface ImageAttachment {
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string; // base64, no data: prefix
}

export interface RunAgentTurnParams {
  workspaceId: string;
  workspaceName: string;
  agentSlug: string;
  userId: string; // whose conversation thread this appends to — a real Clerk user, or the workspace owner for autonomous runs
  message: string;
  images?: ImageAttachment[];
  handoffNote?: string;
  // Autonomous runs (cron) prepend a note to the system prompt making clear
  // this turn wasn't typed by the CEO, so the agent doesn't address them as
  // if they're present/waiting on a reply.
  autonomous?: boolean;
  // Internal recursion guard for message_teammate — never set this
  // yourself when calling from a route; it's only ever incremented
  // internally when one agent messages another.
  depth?: number;
}

export interface RunAgentTurnResult {
  reply: string;
  newMessages: any[];
}

export async function runAgentTurn(params: RunAgentTurnParams): Promise<RunAgentTurnResult> {
  const { workspaceId, workspaceName, agentSlug, userId, message, images, handoffNote, autonomous, depth = 0 } = params;

  const agent = getAgent(agentSlug);
  if (!agent) throw new Error(`Unknown agent: ${agentSlug}`);

  const priorMessages = await loadConversationMessages(workspaceId, agentSlug, userId);
  const isFreshConversation = priorMessages.length === 0;

  let system = systemPromptFor(agent, workspaceName);
  if (handoffNote && isFreshConversation) {
    system += `\n\nA teammate just handed this conversation off to you with this context: "${handoffNote}". Acknowledge the handoff naturally and briefly before addressing what the CEO actually asks — don't just repeat the note back verbatim.`;
  }
  if (autonomous) {
    system += `\n\nThis particular turn is an autonomous, scheduled run — not a live message from the CEO. They won't see your reply until they next check in, so don't address them as if they're present or waiting on you. Just do the work, use your standing authorities as instructed, and write your reply as a clear summary of what you did and why, for them to read later.`;
  }

  const tools = [...toolsForAgent(agent.tools), TOOL_DEFINITIONS.team_activity, TOOL_DEFINITIONS.message_teammate];

  // If the CEO attached images, the user turn's content becomes a list of
  // blocks (each image, then the text) instead of a plain string — that's
  // the shape Claude's vision API expects. No images: keep it a plain
  // string, same as always, so nothing changes for the common case.
  const userContent =
    images && images.length > 0
      ? [
          ...images.map(img => ({
            type: "image",
            source: { type: "base64", media_type: img.media_type, data: img.data },
          })),
          { type: "text", text: message },
        ]
      : message;

  let messages: any[] = [...priorMessages, { role: "user", content: userContent }];
  const turnStartIndex = priorMessages.length;
  let finalText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system,
      messages,
      tools: tools.length ? tools : undefined,
    });

    const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use") as any[];
    const textBlocks = response.content.filter((b: any) => b.type === "text") as any[];
    finalText = textBlocks.map((b: any) => b.text).join("\n");

    messages.push({ role: "assistant", content: response.content });

    if (toolUseBlocks.length === 0) break;

    const toolResults = [];
    for (const block of toolUseBlocks) {
      // message_teammate needs to recursively run another agent's turn —
      // it can't be a normal stateless executor, so it's intercepted here
      // rather than going through EXECUTORS. Capped at depth 1: an agent
      // messaged BY message_teammate cannot itself message a third
      // teammate, which prevents a runaway chain from burning through API
      // calls (and credits) unbounded.
      if (block.name === "message_teammate") {
        let resultContent: string;
        if (depth >= 1) {
          resultContent = JSON.stringify({ error: "Cannot message a teammate from within an already-delegated conversation — this only goes one level deep." });
        } else {
          try {
            const targetSlug = block.input.agent_slug;
            const targetAgent = getAgent(targetSlug);
            if (!targetAgent) throw new Error(`No teammate found with slug "${targetSlug}".`);
            const nested = await runAgentTurn({
              workspaceId, workspaceName, agentSlug: targetSlug, userId,
              message: `[Message from ${agent.name}, ${agent.role}]: ${block.input.message}`,
              autonomous: true, depth: depth + 1,
            });
            resultContent = JSON.stringify({ from: targetAgent.name, reply: nested.reply });
            await logTask({ workspaceId, agentSlug: agent.slug, title: `${agent.name} messaged ${targetAgent.name}`, status: "done", result: nested.reply.slice(0, 500) });
          } catch (err: any) {
            resultContent = JSON.stringify({ error: err.message });
            await logTask({ workspaceId, agentSlug: agent.slug, title: `${agent.name} tried to message a teammate`, status: "failed", result: err.message });
          }
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultContent });
        continue;
      }

      const executor = EXECUTORS[block.name];
      let resultContent: string;
      try {
        if (!executor) throw new Error(`No executor registered for tool ${block.name}`);
        const result = await executor(workspaceId, block.input);
        resultContent = JSON.stringify(result);
        await logTask({
          workspaceId, agentSlug: agent.slug,
          title: `${agent.name} ran ${block.name}${autonomous ? " (autonomous)" : ""}`, status: "done", result: resultContent.slice(0, 500),
        });
      } catch (err: any) {
        resultContent = JSON.stringify({ error: err.message });
        await logTask({
          workspaceId, agentSlug: agent.slug,
          title: `${agent.name} ran ${block.name}${autonomous ? " (autonomous)" : ""}`, status: "failed", result: err.message,
        });
      }
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultContent });
    }
    messages.push({ role: "user", content: toolResults });
  }

  const trimmedMessages = sanitizeAndTrim(messages, MAX_HISTORY_MESSAGES);
  await saveConversationMessages(workspaceId, agentSlug, userId, trimmedMessages);

  const newMessages = messages.slice(turnStartIndex);
  return { reply: finalText || "Task in progress.", newMessages };
}
