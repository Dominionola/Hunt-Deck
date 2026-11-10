"use client";

import React, { useState } from "react";
import { Plus, FolderOpen } from "@phosphor-icons/react";
import { PipelineApplication, PipelineStage, StageConfig } from "../types";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  stage: StageConfig;
  applications: PipelineApplication[];
  onSelect: (app: PipelineApplication) => void;
  onMoveStage: (id: string, newStage: PipelineStage) => void;
  onQuickAdd: (stageId: PipelineStage) => void;
}

export function KanbanColumn({
  stage,
  applications,
  onSelect,
  onMoveStage,
  onQuickAdd,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const appId =
      e.dataTransfer.getData("application/huntdeck-card-id") ||
      e.dataTransfer.getData("text/plain");

    if (appId) {
      onMoveStage(appId, stage.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-w-[280px] max-w-[320px] w-full shrink-0 rounded-3xl bg-[#FAF7F0] border transition-colors flex-1 pb-4 ${
        isDragOver
          ? "border-[#2D5F8A] bg-[#2D5F8A]/5 shadow-sm"
          : "border-[#E5E1D8]/80"
      }`}
      aria-label={`${stage.label} stage column with ${applications.length} applications`}
    >
      {/* Column Header */}
      <div className="p-4 pb-3 flex items-center justify-between border-b border-[#E5E1D8]/60">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h2 className="text-xs font-bold text-[#16213A] tracking-tight">
            {stage.label}
          </h2>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#E5E1D8] text-[#5B6478]">
            {applications.length}
          </span>
        </div>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={() => onQuickAdd(stage.id)}
          className="p-1 rounded-lg text-[#5B6478] hover:text-[#16213A] hover:bg-white transition-colors"
          title={`Add opportunity to ${stage.label}`}
          aria-label={`Add application to ${stage.label}`}
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>

      {/* Column Cards List */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[300px]">
        {applications.length > 0 ? (
          applications.map((app) => (
            <KanbanCard
              key={app.id}
              application={app}
              onSelect={onSelect}
              onMoveStage={onMoveStage}
            />
          ))
        ) : (
          <div className="h-44 border-2 border-dashed border-[#E5E1D8] rounded-2xl flex flex-col items-center justify-center p-4 text-center text-[#5B6478] gap-2">
            <FolderOpen size={24} className="text-[#5B6478]/40" />
            <p className="text-xs font-medium leading-relaxed">
              No opportunities in this stage.
            </p>
            <button
              type="button"
              onClick={() => onQuickAdd(stage.id)}
              className="text-[11px] font-semibold text-[#2D5F8A] hover:underline"
            >
              + Add First Opportunity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

