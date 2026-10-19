import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminId } from "@/lib/admin";

export async function GET() {
  const { userId } = await auth();
  if (!isAdminId(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 100 });

  return NextResponse.json(users.map((u) => ({
    id: u.id,
    email: u.emailAddresses[0]?.emailAddress ?? "",
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    createdAt: u.createdAt,
  })));
}