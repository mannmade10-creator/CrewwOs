import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/supabase";
import ReportsView from "@/components/reports/ReportsView";

export default async function ReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;
  const workspace = await getWorkspace(slug, userId);
  if (!workspace) redirect("/dashboard");

  return <ReportsView workspaceSlug={slug} />;
}
