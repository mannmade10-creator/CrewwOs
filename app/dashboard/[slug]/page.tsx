// app/dashboard/[slug]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getWorkspace } from "@/lib/supabase";
import VirtualOffice from "@/components/office/VirtualOffice";

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
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

  return <VirtualOffice workspaceSlug={workspace.slug} workspaceName={workspace.name} plan={workspace.plan} />;
}
