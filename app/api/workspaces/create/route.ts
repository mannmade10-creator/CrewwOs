// app/api/workspaces/create/route.ts
// POST { name, vertical? } — creates a new workspace, seeds all agents, and
// returns it so the client can redirect straight into it.
// The platform owner (admin) always gets the "superadmin" plan (unlimited, free).
// Everyone else starts on "starter".

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createWorkspace } from "@/lib/workspaces";
import { isAdminId } from "@/lib/admin";

const VALID_VERTICALS = ["music", "realestate", "ecommerce", "trades", "cannabis", "restaurant", "general"];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, vertical } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const safeVertical = typeof vertical === "string" && VALID_VERTICALS.includes(vertical)
    ? vertical
    : "general";

  // Platform owner always gets superadmin plan (unlimited, no billing required)
  const plan = isAdminId(userId) ? "superadmin" : "starter";

  try {
    const workspace = await createWorkspace(userId, name, safeVertical, plan);
    return NextResponse.json({ workspace });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to create workspace" }, { status: 400 });
  }
}
