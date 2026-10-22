// app/dashboard/[slug]/business-setup/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BusinessLaunchFlow from "@/components/business/BusinessLaunchFlow";

export default async function BusinessSetupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;

  return (
    <div className="min-h-screen bg-[#060612] py-12">
      <BusinessLaunchFlow workspaceId={slug} />
    </div>
  );
}
