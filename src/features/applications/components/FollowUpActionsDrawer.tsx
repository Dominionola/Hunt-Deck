"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Copy,
  Check,
  EnvelopeSimple,
  LinkedinLogo,
  ArrowSquareOut,
  CalendarCheck,
  X,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import type { PipelineApplication } from "../types";
import {
  generateApplicationFollowUpSchedule,
  type FollowUpScheduleItem,
  type FollowUpType,
} from "@/services/followup/followUpScheduler";
import {
  generateFollowUp1ValueAdd,
  generateFollowUp2Graceful,
  generatePostInterviewThankYou,
  type GeneratedFollowUpDraft,
} from "@/services/ai/followUpGenerator";

interface FollowUpActionsDrawerProps {
  application: PipelineApplication;
  isOpen: boolean;
  onClose: () => void;
  onFollowUpLogged?: (applicationId: string, logNote: string) => void;
}

export function FollowUpActionsDrawer({
  application,
  isOpen,
  onClose,
  onFollowUpLogged,
}: FollowUpActionsDrawerProps) {
  const [selectedType, setSelectedType] = useState<FollowUpType>("FOLLOW_UP_1");
  const [activeChannelTab, setActiveChannelTab] = useState<"email" | "inmail">("email");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const schedule: FollowUpScheduleItem[] = useMemo(() => {
    return generateApplicationFollowUpSchedule({
      id: application.id,
      company: application.company,
      role: application.role,
      appliedDate: application.appliedDate || new Date().toISOString().split("T")[0],
      interviewDate: application.interviewDate,
      contact: application.contact,
    });
  }, [application]);

  const activeDraft: GeneratedFollowUpDraft = useMemo(() => {
    const context = {
      candidateName: "Alex Rivera",
      candidateEmail: application.contact?.email || "recruiter@target.com",
      companyName: application.company,
      roleTitle: application.role,
      contactName: application.contact?.name,
      appliedDate: application.appliedDate,
      recentCompanyNews: `${application.company}'s recent platform expansion`,
      technicalInsightHook: "scaling distributed query pipelines with sub-100ms latency",
      portfolioUrl: "https://github.com/alexrivera/distributed-streams",
      interviewTopicsDiscussed: ["distributed streaming architectures", "p99 database latency"],
    };

    if (selectedType === "FOLLOW_UP_2") {
      return generateFollowUp2Graceful(context);
    }
    if (selectedType === "POST_INTERVIEW_THANK_YOU") {
      return generatePostInterviewThankYou(context);
    }
    return generateFollowUp1ValueAdd(context);
  }, [application, selectedType]);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard", {
      description: `${label} ready to paste.`,
    });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleLogFollowUpSent = () => {
    const label =
      selectedType === "FOLLOW_UP_1"
        ? "Follow-Up #1 (Value-Add Check-In)"
        : selectedType === "FOLLOW_UP_2"
        ? "Follow-Up #2 (Graceful Final Touch)"
        : "Post-Interview Thank-You Note";

    const note = `Sent ${label} via ${activeChannelTab} on ${new Date().toLocaleDateString()}.`;
    if (onFollowUpLogged) {
      onFollowUpLogged(application.id, note);
    }
    toast.success("Follow-Up Logged", {
      description: `Recorded follow-up action in ${application.company} application timeline.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E5E1D8] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5E1D8]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 text-[11px] font-bold uppercase tracking-wider">
              <Clock size={13} weight="bold" />
              <span>Automated Follow-Up Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#16213A] tracking-tight">
              Follow-Up Cadence &middot;{" "}
              <span className="font-serif italic font-normal text-[#2D5F8A]">
                {application.company}
              </span>
            </h2>
            <p className="text-xs text-[#5B6478]">
              {application.role} &bull; Applied: {application.appliedDate || "Recently"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0] flex items-center justify-center transition-all active:scale-[0.98]"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cadence Timeline Selector */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6478]">
            Follow-Up Milestone Schedule
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {schedule.map((item) => {
              const isSelected = selectedType === item.type;
              const typeLabel =
                item.type === "FOLLOW_UP_1"
                  ? "Follow-Up #1"
                  : item.type === "FOLLOW_UP_2"
                  ? "Follow-Up #2"
                  : "Thank-You Note";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedType(item.type)}
                  className={`p-3 rounded-2xl border text-start transition-all active:scale-[0.98] ${
                    isSelected
                      ? "bg-[#FAF7F0] border-[#2D5F8A] ring-1 ring-[#2D5F8A]"
                      : "bg-white border-[#E5E1D8] hover:border-[#2D5F8A]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#16213A]">{typeLabel}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        item.status === "DUE_TODAY"
                          ? "bg-amber-100 text-amber-800"
                          : item.status === "OVERDUE"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5B6478]">
                    Due: <strong className="text-[#16213A] font-mono">{item.scheduledDate}</strong>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Channel Format Switcher */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 bg-[#FAF7F0] p-1 rounded-xl border border-[#E5E1D8]">
            <button
              type="button"
              onClick={() => setActiveChannelTab("email")}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                activeChannelTab === "email"
                  ? "bg-[#16213A] text-white shadow-xs"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              <EnvelopeSimple size={15} />
              <span>Email Draft</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveChannelTab("inmail")}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                activeChannelTab === "inmail"
                  ? "bg-[#16213A] text-white shadow-xs"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              <LinkedinLogo size={15} />
              <span>LinkedIn InMail (&le;300 chars)</span>
            </button>
          </div>

          <span className="text-xs font-mono text-[#5B6478]">
            {activeChannelTab === "email"
              ? `${activeDraft.wordCount} words`
              : `${activeDraft.inMailCharacterCount}/300 chars`}
          </span>
        </div>

        {/* Message Draft Box */}
        <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl p-4 sm:p-5 space-y-3">
          {activeChannelTab === "email" && (
            <div className="pb-2 border-b border-[#E5E1D8]/80 text-xs">
              <span className="font-semibold text-[#5B6478]">Subject: </span>
              <span className="font-medium text-[#16213A]">{activeDraft.subject}</span>
            </div>
          )}

          <div className="text-xs font-sans text-[#16213A] leading-relaxed whitespace-pre-wrap">
            {activeChannelTab === "email" ? activeDraft.emailBody : activeDraft.inMailDraft}
          </div>
        </div>

        {/* Multi-Channel Action Buttons (Apple HIG compliant) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeChannelTab === "email" ? (
              <>
                <a
                  href={activeDraft.mailtoUrl}
                  className="min-h-[44px] flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
                >
                  <ArrowSquareOut size={15} />
                  <span>Launch Mail Client</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy("email_body", activeDraft.emailBody, "Email Draft")}
                  className="min-h-[44px] flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-[#E5E1D8] bg-white hover:border-[#2D5F8A] text-[#16213A] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  {copiedKey === "email_body" ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Body</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleCopy("inmail_text", activeDraft.inMailDraft, "LinkedIn InMail")}
                className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#084e96] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
              >
                {copiedKey === "inmail_text" ? (
                  <>
                    <Check size={15} />
                    <span>Copied InMail</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>Copy 300-Char InMail</span>
                  </>
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogFollowUpSent}
            className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#2D5F8A]/30 bg-[#EDF3F7] hover:bg-[#E3EDF5] text-[#2D5F8A] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <CalendarCheck size={15} />
            <span>Mark Sent &amp; Log Note</span>
          </button>
        </div>
      </div>
    </div>
  );
}

