// app/dashboard/[slug]/integrations/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getWorkspace } from "@/lib/supabase";
import IntegrationsView from "@/components/integrations/IntegrationsView";

export default async function IntegrationsPage({ params }: { params: Promise<{ slug: string }> }) {
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

  return <IntegrationsView workspaceSlug={workspace.slug} plan={workspace.plan} />;
}
