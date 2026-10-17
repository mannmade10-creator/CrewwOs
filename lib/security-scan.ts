// lib/security-scan.ts
// Backs the security_scan tool (Riley, QA). Reads only CrewOS's own data —
// the integrations table, audit_log, and tasks — and makes no external calls.
// Returns raw findings plus a severity per finding; the agent explains them.

import { supabaseAdmin } from "./supabase";

const CREDENTIAL_MAX_AGE_DAYS = 90;
const LOOKBACK_DAYS = 7;
const MULTI_IP_THRESHOLD = 3;

type Severity = "info" | "warning" | "high";

interface Finding {
  check: string;
  severity: Severity;
  detail: string;
}

export async function runSecurityScan(workspaceId: string) {
  const supabase = supabaseAdmin();
  const findings: Finding[] = [];
  const notes: string[] = [];
  const now = Date.now();
  const since = new Date(now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 1. Credential age — connected integrations older than the rotation window.
  const { data: integrations, error: intError } = await supabase
    .from("integrations")
    .select("provider, connected_at")
    .eq("workspace_id", workspaceId)
    .eq("is_connected", true);
  if (intError) {
    notes.push(`Couldn't read integrations: ${intError.message}`);
  } else {
    for (const i of integrations ?? []) {
      if (!i.connected_at) continue;
      const ageDays = Math.floor((now - new Date(i.connected_at).getTime()) / (24 * 60 * 60 * 1000));
      if (ageDays > CREDENTIAL_MAX_AGE_DAYS) {
        findings.push({
          check: "credential_age",
          severity: "warning",
          detail: `${i.provider} credentials are ${ageDays} days old (rotation recommended after ${CREDENTIAL_MAX_AGE_DAYS}).`,
        });
      }
    }
  }

  // 2 + 3. Denied / rate-limited requests and multi-IP actors, from audit_log.
  const { data: events, error: auditError } = await supabase
    .from("audit_log")
    .select("actor_id, action, target, ip, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since);
  if (auditError) {
    notes.push(`Couldn't read audit_log (${auditError.message}) — denied-request and IP checks skipped.`);
  } else {
    const denied = (events ?? []).filter(e => e.action === "auth.access_denied" || e.action === "auth.rate_limited");
    const byActor: Record<string, number> = {};
    for (const e of denied) byActor[e.actor_id] = (byActor[e.actor_id] ?? 0) + 1;
    for (const [actor, count] of Object.entries(byActor)) {
      findings.push({
        check: "denied_requests",
        severity: count >= 20 ? "high" : "info",
        detail: `${count} denied or rate-limited request(s) from user ${actor} in the last ${LOOKBACK_DAYS} days.`,
      });
    }

    const ipsByActor: Record<string, Set<string>> = {};
    for (const e of events ?? []) {
      if (!e.ip) continue;
      (ipsByActor[e.actor_id] ??= new Set()).add(e.ip);
    }
    for (const [actor, ips] of Object.entries(ipsByActor)) {
      if (ips.size > MULTI_IP_THRESHOLD) {
        findings.push({
          check: "multiple_ips",
          severity: "warning",
          detail: `User ${actor} made requests from ${ips.size} different IP addresses in the last ${LOOKBACK_DAYS} days.`,
        });
      }
    }
  }

  // 4. Failing tool calls, grouped by task title.
  const { data: failedTasks, error: taskError } = await supabase
    .from("tasks")
    .select("title, result")
    .eq("workspace_id", workspaceId)
    .eq("status", "failed")
    .gte("created_at", since);
  if (taskError) {
    notes.push(`Couldn't read tasks: ${taskError.message}`);
  } else {
    const byTitle: Record<string, { count: number; lastError: string | null }> = {};
    for (const t of failedTasks ?? []) {
      const entry = (byTitle[t.title] ??= { count: 0, lastError: null });
      entry.count++;
      entry.lastError = t.result ? String(t.result).slice(0, 200) : null;
    }
    for (const [title, { count, lastError }] of Object.entries(byTitle)) {
      findings.push({
        check: "failing_tool_calls",
        severity: count >= 5 ? "warning" : "info",
        detail: `"${title}" failed ${count} time(s) in the last ${LOOKBACK_DAYS} days.${lastError ? ` Last error: ${lastError}` : ""}`,
      });
    }
  }

  return {
    scanned_at: new Date(now).toISOString(),
    lookback_days: LOOKBACK_DAYS,
    finding_count: findings.length,
    findings,
    notes,
  };
}
