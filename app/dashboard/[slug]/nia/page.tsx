// app/dashboard/[slug]/nia/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/supabase";
import NiaCreditsClient from "@/components/dashboard/NiaCreditsClient";
import { createClient } from "@supabase/supabase-js";

async function getNiaCredits(workspaceId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("nia_credits")
    .select("credits_remaining, credits_used, updated_at")
    .eq("workspace_id", workspaceId)
    .single();

  return data ?? { credits_remaining: 0, credits_used: 0, updated_at: null };
}

export default async function NiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;
  const workspace = await getWorkspace(slug, userId);
  if (!workspace) redirect("/dashboard");

  const credits = await getNiaCredits(workspace.id);

  return (
    <NiaCreditsClient
      workspaceSlug={slug}
      creditsRemaining={credits.credits_remaining}
      creditsUsed={credits.credits_used}
      lastUpdated={credits.updated_at}
      niaActive={workspace.nia_active ?? false}
    />
  );
}
