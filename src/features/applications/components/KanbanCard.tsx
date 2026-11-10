"use client";

import React, { useState } from "react";
import {
  DotsThreeVertical,
  Calendar,
  CurrencyDollar,
  ArrowRight,
  Clock,
  Sparkle,
  Briefcase,
  User,
} from "@phosphor-icons/react";
import { PipelineApplication, PipelineStage, STAGES } from "../types";

interface KanbanCardProps {
  application: PipelineApplication;
  onSelect: (app: PipelineApplication) => void;
  onMoveStage: (id: string, newStage: PipelineStage) => void;
}

export function KanbanCard({ application, onSelect, onMoveStage }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/huntdeck-card-id", application.id);
    e.dataTransfer.setData("text/plain", application.id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Check if follow-up is due today or soon
  const isFollowUpDueSoon =
    application.followUpDueDate?.toLowerCase().includes("today") ||
    application.followUpDueDate?.toLowerCase().includes("tomorrow") ||
    application.followUpDueDate?.toLowerCase().includes("due in 2");

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(application)}
      className={`group relative bg-white border border-[#E5E1D8] rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-[#2D5F8A]/40 ${
        isDragging ? "opacity-40 scale-98 border-dashed border-[#2D5F8A]" : ""
      }`}
      aria-label={`${application.role} at ${application.company}`}
    >
      {/* Top Row: Company Monogram + Title + Menu */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#16213A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {application.company.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-[#16213A] truncate group-hover:text-[#2D5F8A] transition-colors">
              {application.role}
            </h3>
            <span className="text-[11px] font-medium text-[#5B6478] truncate block">
              {application.company}
            </span>
          </div>
        </div>

        {/* Quick Menu Button */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1 rounded-lg text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0] transition-colors"
            aria-label="Application options"
          >
            <DotsThreeVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white border border-[#E5E1D8] shadow-lg p-1.5 z-40 text-xs">
                <div className="px-2 py-1 text-[10px] font-bold text-[#5B6478] uppercase tracking-wider border-b border-[#E5E1D8]/60 mb-1">
                  Move to Stage
                </div>
                {STAGES.filter((s) => s.id !== application.stage).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onMoveStage(application.id, s.id);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#FAF7F0] text-[#16213A] flex items-center justify-between transition-colors"
                  >
                    <span>{s.label}</span>
                    <ArrowRight size={12} className="text-[#5B6478]" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta Row: Work Arrangement & Salary */}
      <div className="flex items-center gap-2 mb-3 text-[11px] text-[#5B6478]">
        <span className="inline-flex items-center gap-1 font-medium capitalize">
          <Briefcase size={13} className="text-[#2D5F8A]" />
          {application.workArrangement}
        </span>
        <span>•</span>
        <span className="inline-flex items-center gap-0.5 truncate font-mono text-[10px]">
          <CurrencyDollar size={13} />
          {application.salary}
        </span>
      </div>

      {/* Stage Specific Badges */}
      <div className="space-y-2 pt-2 border-t border-[#E5E1D8]/60">
        {/* Fit Score & Interview/Follow-up Counter */}
        <div className="flex items-center justify-between gap-2">
          {/* ATS Fit Badge */}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              application.fitScore >= 92
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20"
            }`}
          >
            <Sparkle size={11} weight="fill" />
            <span>{application.fitScore}% ATS</span>
          </span>

          {/* Follow-up / Interview Pill */}
          {application.interviewDate ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 truncate">
              <Calendar size={11} weight="bold" />
              <span className="truncate">Active Loop</span>
            </span>
          ) : application.followUpDueDate ? (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full truncate ${
                isFollowUpDueSoon
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-[#FAF7F0] text-[#5B6478] border border-[#E5E1D8]"
              }`}
            >
              <Clock size={11} />
              <span className="truncate">{application.followUpDueDate}</span>
            </span>
          ) : (
            <span className="text-[10px] text-[#5B6478]/80 font-medium capitalize">
              via {application.source}
            </span>
          )}
        </div>

        {/* Hiring Lead indicator if known */}
        {application.contact && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#5B6478] pt-1 truncate">
            <User size={12} className="text-[#2D5F8A] shrink-0" />
            <span className="truncate">
              Lead: <strong className="text-[#16213A]">{application.contact.name}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

