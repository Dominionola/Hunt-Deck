"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiDashboardLine, RiSearchLine, RiKanbanView, RiFileTextLine, RiSparklingLine, RiMicLine, RiLineChartLine, RiUserLine, RiCloseLine, RiSettings3Line } from "@remixicon/react";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Drawer } from "@/components/base/drawer/drawer";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
import { cx } from "@/utils/cx";
import { useDashboard } from "./DashboardContext";

const items = [
  { label: "Mission Control", icon: RiDashboardLine, href: "/dashboard" },
  { label: "Job Discovery", icon: RiSearchLine, href: "/dashboard/jobs" },
  { label: "Pipeline CRM", icon: RiKanbanView, href: "/dashboard/applications" },
  { label: "ATS Tailor", icon: RiFileTextLine, href: "/dashboard/tailor" },
  { label: "LinkedIn Optimizer", icon: RiSparklingLine, href: "/dashboard/linkedin" },
  { label: "Interview Prep", icon: RiMicLine, href: "/dashboard/interview-prep" },
  { label: "Career Intelligence", icon: RiLineChartLine, href: "/dashboard/analytics" },
  { label: "Master Profile", icon: RiUserLine, href: "/dashboard/resume" },
];
function NavigationContent({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { setMobileMenuOpen, metrics, user } = useDashboard();
  const navigationItems = user.role === "ADMIN" ? [...items, { label: "Job sources", icon: RiSettings3Line, href: "/dashboard/admin/sources" }] : items;
  const fade = useScrollFade();
  return <div className="flex h-full min-h-0 flex-col gap-5 p-5">
    <div className="flex shrink-0 items-center justify-between gap-3">
      <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring" aria-label="Hunt Deck Home"><span className="flex size-9 items-center justify-center rounded-xl bg-accent-900 text-headline-medium text-accent-50" aria-hidden="true">H</span><span><strong className="block text-body-medium text-text-primary">Hunt Deck</strong><span className="text-caption-1-regular text-text-secondary">Career workspace</span></span></Link>
      {mobile && <Button iconOnly variant="ghost" leadingIcon={RiCloseLine} className="min-h-11 min-w-11" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
    </div>
    <div className="relative min-h-0 flex-1"><nav aria-label="Main navigation" className="h-full space-y-1 overflow-y-auto" onScroll={fade.onScroll}>{navigationItems.map((item) => {
      const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
      const Icon = item.icon;
      return <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} aria-current={active ? "page" : undefined} className={cx("flex min-h-11 items-center gap-3 rounded-xl px-3 text-body-2-medium outline-none motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-border-focus-ring", active ? "bg-background-secondary-default text-text-primary" : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary")}><Icon className="size-5 shrink-0" aria-hidden="true" />{item.label}</Link>;
    })}</nav><ScrollFade progress={fade.progress} /></div>
    <div className="shrink-0 space-y-3 border-t border-separator-border pt-4"><div className="space-y-2 rounded-3xl border border-border-button-default bg-background-secondary-default p-4"><p className="text-body-medium text-text-primary">This week</p><p className="text-body-2-regular text-text-secondary">{metrics.status === "ready" ? `${metrics.data.velocity.applicationsThisWeek} recorded submissions` : metrics.status === "loading" ? "Loading activity…" : "Activity unavailable"}</p><p className="text-caption-1-regular text-text-tertiary">Monday to Sunday · UTC</p></div><ButtonLink href="/dashboard/resume" variant="ghost" className="min-h-11 w-full justify-start">Workspace settings</ButtonLink></div>
  </div>;
}
export function Sidebar() {
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenuOpen } = useDashboard();
  useEffect(() => { setMobileMenuOpen(false); }, [pathname, setMobileMenuOpen]);
  return <><aside className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 border-e border-separator-border bg-background-primary-default lg:block" aria-label="Workspace navigation"><NavigationContent /></aside><Drawer isOpen={mobileMenuOpen} onOpenChange={setMobileMenuOpen} placement="start" size="sm" aria-label="Mobile navigation" className="h-full min-h-0"><NavigationContent mobile /></Drawer></>;
}
