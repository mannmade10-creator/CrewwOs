// app/api/integrations/tables/route.ts
// GET  /api/integrations/tables?workspaceSlug=...  -> { tables }
// POST { workspaceSlug, tables }                    -> replaces the list
//
// The Supabase integration's table allowlist — the only tables db_query /
// db_write will touch (see lib/tool-executors.ts). Plain policy data, not a
// secret, so it's safe to return to the browser.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { getAllowedTables, setAllowedTables, listIntegrations } from "@/lib/integrations";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug");
  if (!workspaceSlug) return NextResponse.json({ error: "workspaceSlug is required" }, { status: 400 });

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const tables = await getAllowedTables(workspace.id, "supabase");
  return NextResponse.json({ tables });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`integrations-tables:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    await logAuditEvent({ req, actorId: userId, action: "auth.rate_limited", target: "integrations.tables" });
    return NextResponse.json({ error: "Too many attempts — slow down a bit." }, { status: 429 });
  }

  const { workspaceSlug, tables } = await req.json();
  if (!Array.isArray(tables) || tables.filter((t: any) => typeof t === "string" && t.trim()).length === 0) {
    return NextResponse.json({ error: "List at least one table." }, { status: 400 });
  }

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const integrations = await listIntegrations(workspace.id);
  if (!integrations.some(i => i.provider === "supabase" && i.is_connected)) {
    return NextResponse.json({ error: "Supabase isn't connected for this workspace." }, { status: 400 });
  }

  try {
    await setAllowedTables(workspace.id, "supabase", tables);
    await logAuditEvent({
      req, workspaceId: workspace.id, actorId: userId, action: "integration.tables_update",
      target: "supabase", metadata: { allowed_tables: tables },
    });
    return NextResponse.json({ tables: await getAllowedTables(workspace.id, "supabase") });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update tables" }, { status: 500 });
  }
}
