"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Gear,
  IdentificationCard,
  Kanban,
  MagnifyingGlass,
  Microphone,
  SquaresFour,
  X,
  Radio,
  Sparkle,
  ChartLineUp,
} from "@phosphor-icons/react";
import { useDashboard } from "./DashboardContext";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; weight?: "regular" | "bold" | "fill" }>;
  href?: string;
  badge?: string;
  soon?: boolean;
}

const NAVIGATION_ITEMS: NavItem[] = [
  { label: "Mission Control", icon: SquaresFour, href: "/dashboard" },
  { label: "Job Discovery", icon: MagnifyingGlass, href: "/dashboard/jobs", badge: "24" },
  { label: "Pipeline CRM", icon: Kanban, href: "/dashboard/applications", badge: "12" },
  { label: "ATS Tailor", icon: FileText, href: "/dashboard/tailor" },
  { label: "LinkedIn Optimizer", icon: Sparkle, href: "/dashboard/linkedin" },
  { label: "Interview Prep", icon: Microphone, href: "/dashboard/interview-prep" },
  { label: "Career Intelligence", icon: ChartLineUp, href: "/dashboard/analytics" },
  { label: "Master Profile", icon: IdentificationCard, href: "/dashboard/resume" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenuOpen } = useDashboard();

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between pb-6 pt-1 px-2">
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] rounded-xl"
            aria-label="Hunt Deck Home"
          >
            <div className="w-9 h-9 rounded-xl bg-[#16213A] text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:bg-[#0D1527] transition-colors">
              H
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[#16213A] leading-tight">
                Hunt Deck
              </span>
              <span className="text-[9px] font-semibold tracking-wider text-[#5B6478] uppercase mt-0.5">
                CAREER WORKSPACE
              </span>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0] transition-colors"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section Label */}
        <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold tracking-wider text-[#5B6478]/80 uppercase">
          WORKSPACE
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 mt-1" aria-label="Main Navigation">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            if (item.soon) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-[#5B6478]/60 cursor-not-allowed select-none"
                  title="Coming in Phase 3 & 4"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#FAF7F0] text-[#5B6478]/60 border border-[#E5E1D8]/60">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href || "#"}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? "bg-[#FAF7F0] text-[#16213A] font-semibold border-l-2 border-[#16213A] shadow-xs"
                    : "text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    weight={active ? "bold" : "regular"}
                    className={active ? "text-[#16213A]" : "text-[#5B6478]"}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      active
                        ? "bg-[#16213A] text-white"
                        : "bg-[#EDF3F7] text-[#2D5F8A]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utility & Status */}
      <div className="space-y-4 pt-4 border-t border-[#E5E1D8]">
        {/* Weekly Goal Progress */}
        <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#16213A]">Weekly Goal</span>
            <span className="font-mono font-bold text-[#2D5F8A]">4 / 7</span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[#E5E1D8] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#2D5F8A] transition-all duration-500"
              style={{ width: "57%" }}
            />
          </div>

          <p className="text-[11px] text-[#5B6478] leading-tight">
            3 more applications to hit your weekly velocity threshold.
          </p>
        </div>

        {/* Live Engine Indicator */}
        <div className="flex items-center justify-between px-2 text-[11px] text-[#5B6478]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium">Radar Engine Active</span>
          </div>
          <Radio size={14} className="text-[#2D5F8A]" />
        </div>

        {/* Settings Link */}
        <Link
          href="/dashboard/resume"
          className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-[#5B6478] hover:text-[#16213A] rounded-lg transition-colors"
        >
          <Gear size={16} />
          <span>Workspace Settings</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-[#E5E1D8] p-5 h-screen sticky top-0 z-20"
        aria-label="Institutional Workspace Navigation"
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Slide-over */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-[#16213A]/40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#E5E1D8] p-5 transform transition-transform duration-200 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        aria-label="Mobile Navigation Menu"
      >
        {navContent}
      </div>
    </>
  );
}

