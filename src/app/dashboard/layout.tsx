import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { DashboardShell } from "./DashboardShell";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dashboard",
});

export const metadata: Metadata = {
  title: "Mission Control | Hunt Deck",
  description: "Institutional career command cockpit, vector job discovery, and application pipeline CRM.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={jakarta.className}>
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}

