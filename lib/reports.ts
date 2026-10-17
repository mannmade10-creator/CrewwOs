// lib/reports.ts
import { supabaseAdmin } from "./supabase";
import { getIntegrationCredentials } from "./integrations";

// ---------------- Task summary (always available — lives in CrewOS's own DB) ----------------

export interface TaskSummary {
  byDept: { dept: string; tasks: number }[];
  byDay: { day: string; tasks: number }[];
  totalTasks: number;
  failedTasks: number;
}

export async function getTaskSummary(workspaceId: string): Promise<TaskSummary> {
  const supabase = supabaseAdmin();

  // Join tasks -> agents to get dept, since tasks only stores agent_id.
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("status, created_at, agents(dept)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const byDeptMap: Record<string, number> = {};
  const byDayMap: Record<string, number> = {};
  let failedTasks = 0;

  for (const t of tasks ?? []) {
    const dept = (t as any).agents?.dept ?? "Unknown";
    byDeptMap[dept] = (byDeptMap[dept] ?? 0) + 1;

    const day = new Date(t.created_at).toISOString().slice(0, 10);
    byDayMap[day] = (byDayMap[day] ?? 0) + 1;

    if (t.status === "failed") failedTasks++;
  }

  return {
    byDept: Object.entries(byDeptMap).map(([dept, tasks]) => ({ dept, tasks })),
    byDay: Object.entries(byDayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([day, tasks]) => ({ day, tasks })),
    totalTasks: tasks?.length ?? 0,
    failedTasks,
  };
}

// ---------------- Configurable business metrics (query the CLIENT's own DB) ----------------

export interface ReportConfig {
  metric: string;
  table_name: string;
  amount_column: string | null;
  date_column: string;
}

export async function getReportConfig(workspaceId: string, metric: string): Promise<ReportConfig | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("report_configs")
    .select("metric, table_name, amount_column, date_column")
    .eq("workspace_id", workspaceId)
    .eq("metric", metric)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setReportConfig(workspaceId: string, config: ReportConfig): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("report_configs")
    .upsert({ workspace_id: workspaceId, ...config }, { onConflict: "workspace_id,metric" });
  if (error) throw error;
}

// Pulls a time series for a configured metric from the client's own Supabase
// project (via their connected `supabase` integration credentials — the
// same ones db_query/db_write use). Requires the metric to be configured
// first via setReportConfig / the Reports page's inline config form.
export async function getMetricSeries(workspaceId: string, metric: string): Promise<{ point: string; value: number }[]> {
  const config = await getReportConfig(workspaceId, metric);
  if (!config) {
    throw new Error(`"${metric}" isn't configured yet. Set the table/column mapping on the Reports page first.`);
  }

  const creds = await getIntegrationCredentials(workspaceId, "supabase");
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(creds.url, creds.service_role_key);

  const selectCols = config.amount_column
    ? `${config.date_column}, ${config.amount_column}`
    : `${config.date_column}`;

  const { data, error } = await client
    .from(config.table_name)
    .select(selectCols)
    .order(config.date_column, { ascending: true })
    .limit(1000);
  if (error) throw error;

  // Bucket by day, summing amount_column if present, else counting rows.
  const buckets: Record<string, number> = {};
  for (const row of data ?? []) {
    const day = new Date((row as any)[config.date_column]).toISOString().slice(0, 10);
    const value = config.amount_column ? Number((row as any)[config.amount_column] ?? 0) : 1;
    buckets[day] = (buckets[day] ?? 0) + value;
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([point, value]) => ({ point, value }));
}
