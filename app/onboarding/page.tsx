// app/onboarding/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <OnboardingWizard />;
}
