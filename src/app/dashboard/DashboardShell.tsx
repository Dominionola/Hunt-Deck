"use client";

import React from "react";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { DashboardCommandPalette } from "@/components/dashboard/DashboardCommandPalette";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="min-h-screen flex bg-[#FAF7F0] text-[#16213A] antialiased selection:bg-[#2D5F8A]/20 selection:text-[#16213A]">
        {/* Persistent Responsive Sidebar */}
        <Sidebar />

        {/* Workspace Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Persistent Top Utility Bar */}
          <TopBar />

          {/* Subpage Route Content */}
          <main className="flex-1 min-w-0" id="dashboard-content">
            {children}
          </main>
        </div>

        {/* Universal ⌘K Command Palette */}
        <DashboardCommandPalette />
      </div>
    </DashboardProvider>
  );
}

