// app/api/workspaces/create/route.ts
// POST { name } — creates a new workspace on the Starter plan, seeds all
// agents, and returns it so the client can redirect straight into it.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createWorkspace } from "@/lib/workspaces";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const workspace = await createWorkspace(userId, name);
    return NextResponse.json({ workspace });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to create workspace" }, { status: 400 });
  }
}
