"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardMetricsSchema, type DashboardMetrics, type DashboardUser } from "@/lib/validations/dashboard";

export type MetricsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardMetrics };

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

async function fetchDashboardMetrics({ signal }: { signal: AbortSignal }): Promise<DashboardMetrics> {
  const response = await fetch("/api/dashboard/metrics", { signal });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Your session expired. Sign in again to load your workspace."
        : "Your dashboard could not be loaded. Please retry."
    );
  }
  const parsed = dashboardMetricsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Your dashboard could not be loaded. Please retry.");
  }
  return parsed.data;
}

export function DashboardProvider({ children, user }: { children: React.ReactNode; user: DashboardUser }) {
  const queryClient = useQueryClient();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const metricsQuery = useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: fetchDashboardMetrics,
    staleTime: 60_000,
  });

  const refreshMetrics = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "metrics"] });
  }, [queryClient]);

  const metrics: MetricsState = useMemo(() => {
    if (metricsQuery.isPending) return { status: "loading" };
    if (metricsQuery.isError) {
      return {
        status: "error",
        message:
          metricsQuery.error instanceof Error
            ? metricsQuery.error.message
            : "Your dashboard could not be loaded. Please retry.",
      };
    }
    return { status: "ready", data: metricsQuery.data };
  }, [metricsQuery.isPending, metricsQuery.isError, metricsQuery.error, metricsQuery.data]);

  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      user,
      metrics,
      refreshMetrics,
      commandPaletteOpen,
      setCommandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      mobileMenuOpen,
      setMobileMenuOpen,
      toggleMobileMenu,
    }),
    [user, metrics, refreshMetrics, commandPaletteOpen, mobileMenuOpen, openCommandPalette, closeCommandPalette, toggleMobileMenu]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within a DashboardProvider");
  return context;
}
