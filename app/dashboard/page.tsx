// app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listWorkspacesForUser } from "@/lib/workspaces";

export default async function DashboardIndexPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workspaces = await listWorkspacesForUser(userId);
  if (workspaces.length === 0) redirect("/onboarding");

  redirect(`/dashboard/${workspaces[0].slug}`);
}
