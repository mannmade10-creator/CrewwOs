// lib/audit.ts
// Writes security-relevant events (denied requests, rate limits,
// integration connects/disconnects) to the `audit_log` table, which
// lib/security-scan.ts reads back. See supabase/audit_log.sql for the table.
//
// Never throws: a failed audit write is logged to the server console and
// swallowed, so an audit problem (e.g. the table not existing yet) can never
// break the request it was recording.

import type { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabase";

export interface AuditEventParams {
  req?: NextRequest;
  workspaceId?: string;
  actorId: string;
  action: string;
  target?: string;
  metadata?: Record<string, any>;
}

function clientIp(req?: NextRequest): string | null {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const supabase = supabaseAdmin();
    const { error } = await supabase.from("audit_log").insert({
      workspace_id: params.workspaceId ?? null,
      actor_id: params.actorId,
      action: params.action,
      target: params.target ?? null,
      metadata: params.metadata ?? null,
      ip: clientIp(params.req),
      user_agent: params.req?.headers.get("user-agent") ?? null,
    });
    if (error) console.error("logAuditEvent failed:", error.message);
  } catch (err: any) {
    console.error("logAuditEvent failed:", err?.message ?? err);
  }
}
