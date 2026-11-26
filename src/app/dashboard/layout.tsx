import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { DashboardShell } from "./DashboardShell";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { redirect } from "next/navigation";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dashboard",
});

export const metadata: Metadata = {
  title: "Mission Control | Hunt Deck",
  description: "Institutional career command cockpit, vector job discovery, and application pipeline CRM.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  // Onboarding Gate: If authenticated user has not completed onboarding, redirect to /onboarding
  if (user) {
    const hasCompletedOnboarding = Boolean(
      (user.profile && user.profile.targetTitles && user.profile.targetTitles.length > 0)
    );

    if (!hasCompletedOnboarding) {
      redirect("/onboarding");
    }
  }

  return (
    <div className={jakarta.className}>
      <DashboardShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</DashboardShell>
    </div>
  );
}

