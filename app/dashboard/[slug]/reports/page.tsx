// app/dashboard/[slug]/reports/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getWorkspace } from "@/lib/supabase";
import ReportsView from "@/components/reports/ReportsView";

export default async function ReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;
  let workspace;
  try {
    workspace = await getWorkspace(slug, userId);
  } catch {
    workspace = null;
  }
  if (!workspace) notFound();

  return <ReportsView workspaceSlug={workspace.slug} />;
}
