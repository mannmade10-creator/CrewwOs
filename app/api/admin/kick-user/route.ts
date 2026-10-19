import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminId } from "@/lib/admin";

export async function POST(req: Request) {
  const { userId: adminId } = await auth();
  if (!isAdminId(adminId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const client = await clerkClient();
  const sessions = await client.sessions.getSessionList({ userId, status: "active" });
  await Promise.all(sessions.data.map((s) => client.sessions.revokeSession(s.id)));

  return NextResponse.json({ revoked: sessions.data.length });
}