import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/supabase";
import ReportsView from "@/components/reports/ReportsView";

export default async function ReportsPage({ params }: { params: { slug: string } }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workspace = await getWorkspace(params.slug, userId);
  if (!workspace) redirect("/dashboard");

  return <ReportsView workspaceSlug={params.slug} />;
}
