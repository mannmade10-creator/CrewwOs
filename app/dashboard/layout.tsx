// app/dashboard/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Workspace resolution + the shared shell now live in app/dashboard/[slug]/layout.tsx,
// since a CEO can own more than one workspace. This outer layout only guards auth.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <>{children}</>;
}
