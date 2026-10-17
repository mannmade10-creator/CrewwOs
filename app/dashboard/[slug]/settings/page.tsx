// app/dashboard/[slug]/settings/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getWorkspace } from "@/lib/supabase";
import SettingsClient from "@/components/settings/SettingsClient";

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
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

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
      <div style={{ color: "#ffffff55", fontSize: 11, letterSpacing: 2, marginBottom: 4 }} className="mono">
        WORKSPACE - {workspace.name.toUpperCase()}
      </div>
      <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Settings</div>
      <SettingsClient
        workspaceSlug={workspace.slug}
        workspaceName={workspace.name}
        currentPlan={workspace.plan}
        stripeStatus={workspace.stripe_status}
        hasStripeCustomer={!!workspace.stripe_customer_id}
        ownerId={userId}
      />
    </div>
  );
}
