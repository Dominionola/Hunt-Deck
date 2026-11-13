"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import { PipelineApplication, PipelineStage, STAGES } from "../types";
import { INITIAL_APPLICATIONS } from "../mockData";
import { KanbanColumn } from "./KanbanColumn";
import { ApplicationDetailDrawer } from "./ApplicationDetailDrawer";
import { AddOpportunityModal } from "./AddOpportunityModal";

export function PipelineKanbanBoard() {
  const [applications, setApplications] = useState<PipelineApplication[]>(INITIAL_APPLICATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "remote" | "high-match" | "followup">("all");
  const [selectedApp, setSelectedApp] = useState<PipelineApplication | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalInitialStage, setAddModalInitialStage] = useState<PipelineStage>("saved");
  const [isLoading, setIsLoading] = useState(true);

  // Sync with live database on mount
  useEffect(() => {
    async function loadApplications() {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const data = await res.json();
          if (data.applications && data.applications.length > 0) {
            setApplications(data.applications);
          }
        }
      } catch {
        // Fall back to INITIAL_APPLICATIONS if error
      } finally {
        setIsLoading(false);
      }
    }
    loadApplications();
  }, []);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Search matching
      const matchesSearch =
        searchQuery === "" ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter chips
      if (filterType === "remote") {
        return app.workArrangement === "remote";
      }
      if (filterType === "high-match") {
        return app.fitScore >= 90;
      }
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

  // Optimistic Move Stage with Database Sync
  const handleMoveStage = (id: string, newStage: PipelineStage) => {
    const targetApp = applications.find((a) => a.id === id);
    if (!targetApp) return;

    const previousStage = targetApp.stage;
    const targetStageConfig = STAGES.find((s) => s.id === newStage);

    setApplications((prev) =>
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

    // Update selected app if open in drawer
    setSelectedApp((prev) => (prev?.id === id ? { ...prev, stage: newStage } : prev));

    // Persist to database asynchronously
    fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    }).catch((err) => {
      console.error("Failed to sync stage change to server:", err);
    });

    toast.success(`Moved to ${targetStageConfig?.label}`, {
      description: `${targetApp.company} (${targetApp.role}) updated.`,
      actions: [
        {
          label: "Undo",
          onClick: () => {
            setApplications((prev) =>
              prev.map((app) => (app.id === id ? { ...app, stage: previousStage } : app))
            );
            fetch(`/api/applications/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stage: previousStage }),
            }).catch(() => {});
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

  // Add new opportunity with Database Sync
  const handleAddOpportunity = (newApp: PipelineApplication) => {
    setApplications((prev) => [newApp, ...prev]);

    // Persist to database
    fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newApp),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.application?.id) {
            setApplications((prev) =>
              prev.map((a) => (a.id === newApp.id ? data.application : a))
            );
          }
        }
      })
      .catch((err) => {
        console.error("Failed to persist new application to database:", err);
      });
  };

  // Add note to application with Database Sync
  const handleAddNote = (id: string, noteText: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, notes: [noteText, ...app.notes] } : app))
    );
    setSelectedApp((prev) => (prev?.id === id ? { ...prev, notes: [noteText, ...prev.notes] } : prev));

    fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    }).catch((err) => {
      console.error("Failed to sync note to database:", err);
    });
  };

  // Delete opportunity with Database Sync
  const handleDelete = (id: string) => {
    const deleted = applications.find((a) => a.id === id);
    setApplications((prev) => prev.filter((a) => a.id !== id));

    fetch(`/api/applications/${id}`, {
      method: "DELETE",
    }).catch((err) => {
      console.error("Failed to delete application from server:", err);
    });

    if (deleted) {
      toast.info("Opportunity Removed", {
        description: `${deleted.company} removed from pipeline.`,
        actions: [
          {
            label: "Restore",
            onClick: () => {
              setApplications((prev) => [deleted, ...prev]);
              fetch("/api/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(deleted),
              }).catch(() => {});
            },
          },
        ],
      });
    }
  };

  // Open Add modal with specified initial stage
  const handleQuickAdd = (stageId: PipelineStage) => {
    setAddModalInitialStage(stageId);
    setAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & KPI Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E1D8] shadow-2xs">
        {/* Search input */}
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

        {/* Filter Chips & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-2xl border border-[#E5E1D8]">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16213A] text-white text-xs font-bold hover:bg-[#0D1527] transition-all shadow-2xs hover:shadow-xs active:scale-98"
          >
            <Plus size={15} weight="bold" />
            <span>Add Opportunity</span>
          </button>
        </div>
      </div>

      {/* 5 Kanban Stage Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[600px] scrollbar-thin">
        {STAGES.map((stage) => {
          const stageApps = filteredApplications.filter((app) => app.stage === stage.id);
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              applications={stageApps}
              onSelect={setSelectedApp}
              onMoveStage={handleMoveStage}
              onQuickAdd={handleQuickAdd}
            />
          );
        })}
      </div>

      {/* Slide-over Inspection Drawer */}
      <ApplicationDetailDrawer
        application={selectedApp}
        isOpen={selectedApp !== null}
        onClose={() => setSelectedApp(null)}
        onMoveStage={handleMoveStage}
        onAddNote={handleAddNote}
        onDelete={handleDelete}
      />

      {/* Add Opportunity Modal */}
      <AddOpportunityModal
        isOpen={addModalOpen}
        initialStage={addModalInitialStage}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddOpportunity}
      />
    </div>
  );
}
