"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  CurrencyDollar,
  Sparkle,
  Trash,
  User,
  Plus,
  ArrowSquareOut,
  Globe,
  LinkedinLogo,
} from "@phosphor-icons/react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/base/modal/modal";
import { Button } from "@/components/base/buttons/button";
import { toast } from "@/components/base/toast/toast";
import { PipelineApplication, PipelineStage, STAGES } from "../types";
import { FollowUpActionsDrawer } from "./FollowUpActionsDrawer";
import { CompanyContactsCard } from "@/features/jobs/components/CompanyContactsCard";
import {
  resolveCompanyDomain,
  resolveCompanyLinkedInUrl,
} from "@/services/contacts/contactIntelligenceService";

interface ApplicationDetailDrawerProps {
  application: PipelineApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onMoveStage: (id: string, newStage: PipelineStage) => void;
  onAddNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

export function ApplicationDetailDrawer({
  application,
  isOpen,
  onClose,
  onMoveStage,
  onAddNote,
  onDelete,
}: ApplicationDetailDrawerProps) {
  const [newNote, setNewNote] = useState("");
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  if (!application) return null;

  const currentStageConfig = STAGES.find((s) => s.id === application.stage);

  const handleCopyPitch = () => {
    const contactGreeting = application.contact?.name.split(" ")[0] || "there";
    const pitchText = `Hi ${contactGreeting}, noticed the ${application.role} opening at ${application.company}. Given my background in ${application.tags.slice(0, 2).join(" and ")}, I've tailored an overview of my work: https://huntdeck.com/p/candidate`;

    navigator.clipboard?.writeText(pitchText);
    toast.success("Outreach Pitch Copied", {
      description: `Direct message template for ${application.company} ready to paste.`,
    });
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    onAddNote(application.id, newNote.trim());
    setNewNote("");
    toast.success("Note Logged", {
      description: "Added note to application activity timeline.",
    });
  };

  return (
    <Modal size="xl" isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalHeader
        title={application.role}
        description={`${application.company} · ${application.location}`}
      />

      <ModalBody>
        <div className="flex flex-col gap-6 pt-2">
          {/* Stage Switcher Pill Bar */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">
              Current Pipeline Stage
            </span>
            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8]">
              {STAGES.map((s) => {
                const isCurrent = s.id === application.stage;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onMoveStage(application.id, s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isCurrent
                        ? "bg-[#16213A] text-white shadow-2xs"
                        : "text-[#5B6478] hover:text-[#16213A] hover:bg-white"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isCurrent ? "#FFFFFF" : s.color }}
                    />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
            {currentStageConfig && (
              <p className="text-[11px] text-[#5B6478] px-1">
                {currentStageConfig.description}
              </p>
            )}
          </div>

          {/* Source & Application Link */}
          {(() => {
            const companyDomain = resolveCompanyDomain(application.company);
            const companyLinkedInUrl = resolveCompanyLinkedInUrl(application.company);

            return (
              <div className="p-3.5 rounded-2xl bg-white border border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center shrink-0 text-[#2D5F8A]">
                    <Globe size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">
                      Source: <span className="text-[#16213A]">{application.source}</span>
                    </div>
                    <div className="text-xs text-[#5B6478] truncate">
                      {(() => {
                        if (!application.portalUrl) return "No application URL attached";
                        try {
                          return new URL(application.portalUrl).hostname.replace(/^www\./, "");
                        } catch {
                          return application.portalUrl;
                        }
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Company Official Website */}
                  {companyDomain && (
                    <a
                      href={`https://${companyDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 text-[#16213A] border border-[#E5E1D8] text-xs font-semibold transition-colors active:scale-[0.98]"
                      title={`Visit ${application.company} Official Website`}
                    >
                      <Globe size={14} className="text-[#2D5F8A]" />
                      <span>Website</span>
                    </a>
                  )}

                  {/* Company LinkedIn Page */}
                  {companyLinkedInUrl && (
                    <a
                      href={companyLinkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 text-[#0077b5] border border-[#E5E1D8] text-xs font-semibold transition-colors active:scale-[0.98]"
                      title={`View ${application.company} on LinkedIn`}
                    >
                      <LinkedinLogo size={15} weight="fill" />
                      <span>Company LinkedIn</span>
                    </a>
                  )}

                  {/* Application Posting Link */}
                  {application.portalUrl && /^https?:\/\//i.test(application.portalUrl) && (
                    <a
                      href={application.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#2D5F8A] hover:bg-[#16213A] text-white text-xs font-semibold transition-colors active:scale-[0.98] shrink-0"
                    >
                      <span>Open Posting</span>
                      <ArrowSquareOut size={14} weight="bold" />
                    </a>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Fit Score & Comp Badge Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] space-y-1">
              <div className="flex items-center justify-between text-xs text-[#5B6478]">
                <span className="font-medium">ATS Match</span>
                <Sparkle size={14} className="text-[#2D5F8A]" weight="fill" />
              </div>
              <div className="text-xl font-bold font-mono text-[#16213A]">
                {application.fitScore}%
              </div>
              <p className="text-[10px] text-[#5B6478]">
                Keyword compatibility score
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] space-y-1">
              <div className="flex items-center justify-between text-xs text-[#5B6478]">
                <span className="font-medium">Compensation</span>
                <CurrencyDollar size={14} className="text-emerald-700" />
              </div>
              <div className="text-xs font-bold text-[#16213A] truncate font-mono pt-1">
                {application.salary}
              </div>
              <p className="text-[10px] text-[#5B6478] capitalize">
                {application.workArrangement} arrangement
              </p>
            </div>
          </div>

          {/* Timeline Milestones */}
          {(application.interviewDate || application.followUpDueDate || application.appliedDate) && (
            <div className="p-4 rounded-2xl bg-white border border-[#E5E1D8] space-y-2.5">
              <span className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider block">
                Timeline & Milestones
              </span>

              {application.interviewDate && (
                <div className="flex items-center gap-2.5 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
                  <Calendar size={16} weight="bold" />
                  <span>{application.interviewDate}</span>
                </div>
              )}

              {application.followUpDueDate && (
                <div className="flex items-center gap-2.5 text-xs text-[#16213A] bg-[#FAF7F0] p-2.5 rounded-xl border border-[#E5E1D8]">
                  <Clock size={16} className="text-[#2D5F8A]" />
                  <span>Follow-up action: <strong>{application.followUpDueDate}</strong></span>
                </div>
              )}

              {application.appliedDate && (
                <div className="flex items-center gap-2 text-xs text-[#5B6478] px-1">
                  <CheckCircle size={14} className="text-emerald-600" weight="fill" />
                  <span>Application submitted {application.appliedDate}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsFollowUpModalOpen(true)}
                className="w-full mt-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#EDF3F7] border border-[#2D5F8A]/30 text-[#2D5F8A] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <Clock size={15} />
                <span>Open Follow-Up Cadence &amp; AI Drafts</span>
              </button>
            </div>
          )}

          {/* Hiring Contact Intelligence */}
          {application.contact && (
            <div className="p-4 rounded-2xl bg-white border border-[#E5E1D8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">
                  Linked Application Contact
                </span>
                <button
                  type="button"
                  onClick={handleCopyPitch}
                  className="text-xs text-[#2D5F8A] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Copy size={13} />
                  <span>Copy Pitch</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D5F8A]/10 text-[#2D5F8A] flex items-center justify-center font-bold">
                  <User size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#16213A]">
                    {application.contact.name}
                  </div>
                  <div className="text-[11px] text-[#5B6478]">
                    {application.contact.role}
                  </div>
                  {application.contact.email && (
                    <div className="text-[10px] font-mono text-[#2D5F8A]">
                      {application.contact.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Decision Makers & Outreach Discovery */}
          <CompanyContactsCard
            companyName={application.company}
            roleTitle={application.role}
            jobDescription={application.description}
          />

          {/* Verified Skills Cloud */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">
              Matched Skills & Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {application.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white border border-[#E5E1D8] text-[#16213A] font-medium"
                >
                  <CheckCircle size={12} weight="fill" className="text-[#2D5F8A]" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Activity Notes Log */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">
              Activity Notes ({application.notes.length})
            </span>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {application.notes.map((note, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] text-xs text-[#16213A] leading-relaxed"
                >
                  {note}
                </div>
              ))}
            </div>

            {/* Add note input */}
            <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log a call, interview question, or reminder…"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E5E1D8] bg-white text-[#16213A] placeholder-[#5B6478] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[#16213A] text-white text-xs font-semibold hover:bg-[#0D1527] transition-colors flex items-center gap-1"
              >
                <Plus size={14} weight="bold" />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="w-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remove ${application.company} from your pipeline?`)) {
                onDelete(application.id);
                onClose();
              }
            }}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs flex items-center gap-1 font-semibold"
            aria-label="Delete opportunity"
          >
            <Trash size={16} />
            <span>Remove</span>
          </button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleCopyPitch}>
              Copy Outreach Pitch
            </Button>
            <Button onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </ModalFooter>

      {/* Follow-Up Actions Drawer */}
      <FollowUpActionsDrawer
        application={application}
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        onFollowUpLogged={(appId, note) => {
          onAddNote(appId, note);
          setIsFollowUpModalOpen(false);
        }}
      />
    </Modal>
  );
}
