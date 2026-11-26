"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { dashboardMetricsSchema, type DashboardMetrics, type DashboardUser } from "@/lib/validations/dashboard";

export type MetricsState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: DashboardMetrics };
interface DashboardContextType {
  user: DashboardUser;
  metrics: MetricsState;
  refreshMetrics: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
}
const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children, user }: { children: React.ReactNode; user: DashboardUser }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metrics, setMetrics] = useState<MetricsState>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  const refreshMetrics = useCallback(() => { setMetrics({ status: "loading" }); setRevision((v) => v + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    void (async () => {
      try {
        const response = await fetch("/api/dashboard/metrics", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again to load your workspace." : "Your dashboard could not be loaded. Please retry.");
        const parsed = dashboardMetricsSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("Your dashboard could not be loaded. Please retry.");
        if (!controller.signal.aborted) setMetrics({ status: "ready", data: parsed.data });
      } catch (error) {
        if (!controller.signal.aborted) setMetrics({ status: "error", message: error instanceof Error ? error.message : "Your dashboard could not be loaded. Please retry." });
      } finally { clearTimeout(timeout); }
    })();
    const onTimeout = () => setMetrics({ status: "error", message: "Your dashboard took too long to load. Please retry." });
    controller.signal.addEventListener("abort", onTimeout);
    return () => { controller.signal.removeEventListener("abort", onTimeout); clearTimeout(timeout); controller.abort(); };
  }, [revision]);
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);
  const value = useMemo(() => ({ user, metrics, refreshMetrics, commandPaletteOpen, setCommandPaletteOpen,
    openCommandPalette, closeCommandPalette, mobileMenuOpen, setMobileMenuOpen, toggleMobileMenu }),
    [user, metrics, refreshMetrics, commandPaletteOpen, mobileMenuOpen, openCommandPalette, closeCommandPalette, toggleMobileMenu]);
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within a DashboardProvider");
  return context;
}
