// app/dashboard/[slug]/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getWorkspace } from "@/lib/workspaces";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;

  let workspace;
  try {
    // getWorkspace filters by owner_id, so this also doubles as the
    // authorization check — a workspace owned by someone else 404s here
    // rather than leaking whether the slug exists.
    workspace = await getWorkspace(slug, userId);
  } catch {
    workspace = null;
  }

  if (!workspace) notFound();

  return (
    <DashboardShell workspaceName={workspace.name} workspaceSlug={workspace.slug} plan={workspace.plan}>
      {children}
    </DashboardShell>
  );
}
