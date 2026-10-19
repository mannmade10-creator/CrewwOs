import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const ADMIN_USER_ID = "user_3KssQdrEnCwzR428Q5nmtYKYqHF";

export function isAdminId(userId: string | null) {
  return userId === ADMIN_USER_ID;
}

export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId || !isAdminId(userId)) redirect("/dashboard");
  return userId;
}