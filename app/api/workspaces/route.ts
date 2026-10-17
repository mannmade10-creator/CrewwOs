// app/api/workspaces/route.ts
// GET — lists all workspaces owned by the current Clerk user.

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listWorkspacesForUser } from "@/lib/workspaces";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaces = await listWorkspacesForUser(userId);
  return NextResponse.json({ workspaces });
}
