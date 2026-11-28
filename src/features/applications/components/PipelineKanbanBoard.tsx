"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlass, Plus, WarningCircle } from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { PipelineApplication, PipelineStage, STAGES } from "../types";
import { KanbanColumn } from "./KanbanColumn";
import { ApplicationDetailDrawer } from "./ApplicationDetailDrawer";
import { AddOpportunityModal } from "./AddOpportunityModal";

interface PipelineKanbanBoardProps {
  initialApplications?: PipelineApplication[];
}

async function fetchPipelineApplications({ signal }: { signal: AbortSignal }): Promise<PipelineApplication[]> {
  const res = await fetch("/api/applications", { signal });
  if (!res.ok) {
    throw new Error("Failed to load application pipeline.");
  }
  const data = (await res.json()) as { applications?: PipelineApplication[] };
  return Array.isArray(data.applications) ? data.applications : [];
}

export function PipelineKanbanBoard({ initialApplications }: PipelineKanbanBoardProps) {
  const queryClient = useQueryClient();
  const { refreshMetrics } = useDashboard();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "remote" | "high-match" | "followup">("all");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalInitialStage, setAddModalInitialStage] = useState<PipelineStage>("saved");

  const {
    data: applications = [],
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchPipelineApplications,
    initialData: initialApplications,
    staleTime: 60_000,
  });

  const selectedApp = useMemo(
    () => (selectedAppId ? applications.find((a) => a.id === selectedAppId) ?? null : null),
    [applications, selectedAppId]
  );

  const setApplicationsCache = useCallback(
    (updater: (prev: PipelineApplication[]) => PipelineApplication[]) => {
      queryClient.setQueryData<PipelineApplication[]>(["applications"], (prev) => updater(prev ?? []));
    },
    [queryClient]
  );

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        searchQuery === "" ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === "remote") return app.workArrangement === "remote";
      if (filterType === "high-match") return app.fitScore >= 90;
      if (filterType === "followup") {
        return (
          app.followUpDueDate?.toLowerCase().includes("today") ||
          app.followUpDueDate?.toLowerCase().includes("tomorrow") ||
          app.followUpDueDate?.toLowerCase().includes("due in")
        );
      }

      return true;
    });
  }, [applications, searchQuery, filterType]);

  const handleMoveStage = (id: string, newStage: PipelineStage) => {
    const targetApp = applications.find((a) => a.id === id);
    if (!targetApp) return;

    const previousStage = targetApp.stage;
    const targetStageConfig = STAGES.find((s) => s.id === newStage);

    setApplicationsCache((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            stage: newStage,
            appliedDate: newStage === "applied" && !app.appliedDate ? "Just now" : app.appliedDate,
            followUpDueDate:
              newStage === "applied" && !app.followUpDueDate
                ? "Due in 7 days"
                : app.followUpDueDate,
          };
        }
        return app;
      })
    );

    fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    })
      .then(() => {
        refreshMetrics();
      })
      .catch((err) => {
        console.error("Failed to sync stage change to server:", err);
      });

    toast.success(`Moved to ${targetStageConfig?.label}`, {
      description: `${targetApp.company} (${targetApp.role}) updated.`,
      actions: [
        {
          label: "Undo",
          onClick: () => {
            setApplicationsCache((prev) =>
              prev.map((app) => (app.id === id ? { ...app, stage: previousStage } : app))
            );
            fetch(`/api/applications/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stage: previousStage }),
            })
              .then(() => {
                refreshMetrics();
              })
              .catch(() => {});
            toast.info("Action Undone", {
              description: `Returned ${targetApp.company} to ${
                STAGES.find((s) => s.id === previousStage)?.label
              }.`,
            });
          },
        },
      ],
    });
  };

  const handleAddOpportunity = (newApp: PipelineApplication) => {
    setApplicationsCache((prev) => [newApp, ...prev]);

    fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newApp),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { application?: PipelineApplication };
          if (data.application?.id) {
            setApplicationsCache((prev) =>
              prev.map((a) => (a.id === newApp.id ? data.application! : a))
            );
          }
          refreshMetrics();
        }
      })
      .catch((err) => {
        console.error("Failed to persist new application to database:", err);
      });
  };

  const handleAddNote = (id: string, noteText: string) => {
    setApplicationsCache((prev) =>
      prev.map((app) => (app.id === id ? { ...app, notes: [noteText, ...app.notes] } : app))
    );

    fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    }).catch((err) => {
      console.error("Failed to sync note to database:", err);
    });
  };

  const handleDelete = (id: string) => {
    const deleted = applications.find((a) => a.id === id);
    setApplicationsCache((prev) => prev.filter((a) => a.id !== id));
    if (selectedAppId === id) setSelectedAppId(null);

    fetch(`/api/applications/${id}`, {
      method: "DELETE",
    })
      .then(() => {
        refreshMetrics();
      })
      .catch((err) => {
        console.error("Failed to delete application from server:", err);
      });

    if (deleted) {
      toast.info("Opportunity Removed", {
        description: `${deleted.company} removed from pipeline.`,
        actions: [
          {
            label: "Restore",
            onClick: () => {
              setApplicationsCache((prev) => [deleted, ...prev]);
              fetch("/api/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(deleted),
              })
                .then(() => {
                  refreshMetrics();
                })
                .catch(() => {});
            },
          },
        ],
      });
    }
  };

  const handleQuickAdd = (stageId: PipelineStage) => {
    setAddModalInitialStage(stageId);
    setAddModalOpen(true);
  };

  if (isPending && applications.length === 0) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading application pipeline">
        <div className="h-16 rounded-3xl bg-[#FAF7F0] border border-[#E5E1D8] animate-pulse" />
        <div className="flex gap-4 overflow-x-auto pb-6">
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              className="w-[300px] shrink-0 rounded-3xl bg-[#FAF7F0] border border-[#E5E1D8] p-4 space-y-3 min-h-[480px] animate-pulse"
            >
              <div className="h-5 w-32 bg-[#E5E1D8] rounded-md" />
              <div className="h-28 w-full bg-white/80 rounded-2xl border border-[#E5E1D8]" />
              <div className="h-28 w-full bg-white/80 rounded-2xl border border-[#E5E1D8]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError && applications.length === 0) {
    return (
      <div
        role="alert"
        className="p-6 bg-white border border-red-200 rounded-3xl text-center space-y-3"
      >
        <div className="w-10 h-10 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
          <WarningCircle size={20} weight="bold" />
        </div>
        <h2 className="text-sm font-bold text-[#16213A]">Unable to Load Pipeline</h2>
        <p className="text-xs text-[#5B6478]">
          {error instanceof Error ? error.message : "Could not load your applications."}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] text-xs font-bold text-[#16213A] hover:bg-[#EDF3F7] cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E1D8] shadow-2xs">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6478]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by company, role, or keywords…"
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] text-[#16213A] placeholder-[#5B6478] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A] transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-2xl border border-[#E5E1D8]">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === "all"
                  ? "bg-[#16213A] text-white shadow-2xs"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              All ({applications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("remote")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === "remote"
                  ? "bg-[#16213A] text-white shadow-2xs"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              Remote Only
            </button>
            <button
              type="button"
              onClick={() => setFilterType("high-match")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === "high-match"
                  ? "bg-[#16213A] text-white shadow-2xs"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              90%+ Match
            </button>
            <button
              type="button"
              onClick={() => setFilterType("followup")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === "followup"
                  ? "bg-[#16213A] text-white shadow-2xs"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              Follow-ups Due
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleQuickAdd("saved")}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#16213A] text-white text-xs font-bold hover:bg-[#0D1527] transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Plus size={15} weight="bold" />
            <span>Add Opportunity</span>
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[600px] scrollbar-thin">
        {STAGES.map((stage) => {
          const stageApps = filteredApplications.filter((app) => app.stage === stage.id);
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              applications={stageApps}
              onSelect={(app) => setSelectedAppId(app.id)}
              onMoveStage={handleMoveStage}
              onQuickAdd={handleQuickAdd}
            />
          );
        })}
      </div>

      <ApplicationDetailDrawer
        application={selectedApp}
        isOpen={selectedApp !== null}
        onClose={() => setSelectedAppId(null)}
        onMoveStage={handleMoveStage}
        onAddNote={handleAddNote}
        onDelete={handleDelete}
      />

      <AddOpportunityModal
        isOpen={addModalOpen}
        initialStage={addModalInitialStage}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddOpportunity}
      />
    </div>
  );
}
