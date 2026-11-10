"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  List,
  MagnifyingGlass,
  Sparkle,
  User,
  SignOut,
  Sliders,
  CaretDown,
} from "@phosphor-icons/react";
import { useDashboard } from "./DashboardContext";
import { toast } from "@/components/base/toast/toast";

export function TopBar() {
  const { openCommandPalette, toggleMobileMenu } = useDashboard();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleSignOut = () => {
    setProfileDropdownOpen(false);
    toast.info("Session Closed", {
      description: "Signed out of Hunt Deck workspace.",
    });
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white border-b border-[#E5E1D8] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Mobile Menu Toggle & Search Pill */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0] transition-colors"
          aria-label="Open sidebar menu"
        >
          <List size={20} />
        </button>

        {/* Universal Command Palette Trigger */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="w-full sm:max-w-md flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8]/80 text-[#5B6478] hover:text-[#16213A] hover:border-[#2D5F8A]/40 transition-all text-xs group"
          aria-label="Search opportunities or press Command K"
        >
          <div className="flex items-center gap-2.5 truncate">
            <MagnifyingGlass
              size={16}
              className="text-[#5B6478] group-hover:text-[#16213A] transition-colors shrink-0"
            />
            <span className="truncate">Search opportunities or press ⌘K…</span>
          </div>

          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white border border-[#E5E1D8] text-[#5B6478] shrink-0 font-medium shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Alert Badge & User Pill */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* First-Mover Alert Pill */}
        <Link
          href="/dashboard/jobs"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 hover:bg-[#2D5F8A]/10 transition-colors"
          title="3 high-match roles scraped in the last 15 minutes"
        >
          <Sparkle size={13} weight="fill" className="text-[#2D5F8A]" />
          <span>3 Fresh Matches</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-[#2D5F8A]">
            &lt;15m
          </span>
        </Link>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-[#FAF7F0] border border-transparent hover:border-[#E5E1D8] transition-all text-left"
            aria-expanded={profileDropdownOpen}
            aria-haspopup="true"
            aria-label="User profile menu"
          >
            <div className="w-8 h-8 rounded-lg bg-[#16213A] text-white flex items-center justify-center font-bold text-xs font-mono">
              MV
            </div>

            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold text-[#16213A] leading-tight">
                Marcus Vance
              </span>
              <span className="text-[10px] font-semibold text-[#2D5F8A]">
                Pro Plan · Active
              </span>
            </div>

            <CaretDown
              size={12}
              className={`hidden md:block text-[#5B6478] transition-transform ${
                profileDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E5E1D8] shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-[#E5E1D8]/60 mb-1">
                  <div className="text-xs font-bold text-[#16213A]">Marcus Vance</div>
                  <div className="text-[11px] text-[#5B6478] truncate">
                    marcus@candidate.dev
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#2D5F8A] border border-[#E5E1D8]">
                    Pro Workspace Tier
                  </span>
                </div>

                <Link
                  href="/dashboard/resume"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0] transition-colors"
                >
                  <User size={15} />
                  <span>Master Profile</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    openCommandPalette();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0] transition-colors text-left"
                >
                  <Sliders size={15} />
                  <span>Quick Actions (⌘K)</span>
                </button>

                <div className="border-t border-[#E5E1D8]/60 my-1" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <SignOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

