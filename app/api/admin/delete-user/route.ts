// app/api/admin/delete-user/route.ts
// POST { userId } — permanently deletes a Clerk user account.
// Hard delete: the user's sessions, profile, and all associated data are removed from Clerk.
// Only callable by the platform admin.

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminId } from "@/lib/admin";

export async function POST(req: Request) {
  const { userId: adminId } = await auth();
  if (!isAdminId(adminId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Safety: never allow deleting the admin account itself
  if (isAdminId(userId)) {
    return NextResponse.json({ error: "Cannot delete the admin account" }, { status: 400 });
  }

  const client = await clerkClient();
  await client.users.deleteUser(userId);

  return NextResponse.json({ deleted: true });
}