"use client";

import React from "react";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { DashboardCommandPalette } from "@/components/dashboard/DashboardCommandPalette";
import type { DashboardUser } from "@/lib/validations/dashboard";

export function DashboardShell({ children, user }: { children: React.ReactNode; user: DashboardUser }) {
  return (
    <DashboardProvider user={user}>
      <div className="min-h-screen flex bg-background-secondary-default text-text-primary antialiased">
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

