// types/index.ts
import type { AgentDef, Dept } from "@/lib/agents";

export type { AgentDef, Dept };

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface TaskLogEntry {
  agent: string;
  text: string;
  time: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "growth" | "enterprise" | "agency";
}
