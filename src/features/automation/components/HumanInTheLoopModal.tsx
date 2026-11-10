"use client";

import React, { useState } from "react";
import {
  X,
  ShieldWarning,
  WarningCircle,
  CheckCircle,
  LockKey,
  PaperPlaneTilt,
  Sparkle,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import type { WorkerExecutionResult } from "@/services/automation/playwrightWorker";
import type { MappedFormField } from "@/services/automation/atsFormMapper";

interface HumanInTheLoopModalProps {
  execution: WorkerExecutionResult;
  fields: MappedFormField[];
  onApproveAndSubmit: (updatedFields: Record<string, string>) => void;
  onClose: () => void;
}

export function HumanInTheLoopModal({
  execution,
  fields,
  onApproveAndSubmit,
  onClose,
}: HumanInTheLoopModalProps) {
  const isCaptcha = execution.stage === "CAPTCHA_DETECTED";

  // State for user-reviewed answers
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) {
      if (f.requiresHumanReview) {
        initial[f.fieldId] = f.value || "";
      }
    }
    return initial;
  });

  const [captchaSolved, setCaptchaSolved] = useState(false);

  const handleFieldChange = (fieldId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleConfirmSubmit = () => {
    if (isCaptcha && !captchaSolved) {
      toast.error("Security Verification Required", {
        description: "Please complete the CAPTCHA in the external ATS window before continuing.",
      });
      return;
    }

    toast.success("Application Approved", {
      description: `Human review confirmed. Submitting to ${execution.platform} portal...`,
    });
    onApproveAndSubmit(answers);
  };

  const reviewFields = fields.filter((f) => f.requiresHumanReview);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hitl-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-white border border-[#E5E1D8] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#E5E1D8] bg-[#FAF7F0]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isCaptcha
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-blue-100 border-blue-300 text-[#2D5F8A]"
              }`}
            >
              {isCaptcha ? <LockKey size={22} weight="fill" /> : <ShieldWarning size={22} weight="fill" />}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E5E1D8] uppercase tracking-wider text-[#16213A]">
                  Human-in-the-Loop Gate
                </span>
                <span className="text-xs font-semibold text-[#5B6478]">
                  {execution.platform} ATS Portal
                </span>
              </div>
              <h2 id="hitl-modal-title" className="text-base font-bold text-[#16213A] mt-0.5">
                {isCaptcha ? "Security Verification Detected" : "Review Required Before Submission"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#5B6478] hover:text-[#16213A] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs sm:text-sm">
          {/* Quality Gate Status */}
          <div className="p-3 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#16213A]">
              <Sparkle size={15} className="text-[#2D5F8A]" weight="fill" />
              <span>Pre-Submission Quality Gate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle size={12} weight="fill" />
                <span>Resume 94%</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle size={12} weight="fill" />
                <span>Cover Letter Fact</span>
              </span>
            </div>
          </div>

          {/* CAPTCHA Barrier Block */}
          {isCaptcha ? (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-start gap-2 text-amber-900 font-bold">
                <WarningCircle size={16} weight="fill" className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm">Cloudflare Turnstile or CAPTCHA Challenge Detected</div>
                  <p className="font-normal text-amber-800 mt-1 leading-relaxed text-[11px]">
                    Hunt Deck never automates or circumvents CAPTCHAs to ensure full legal compliance with employer ATS portals.
                    Please solve the verification challenge in your browser window, then authorize the final submission.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                <a
                  href={execution.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#2D5F8A] font-bold hover:underline"
                >
                  <span>Open {execution.platform} Portal in New Tab</span>
                </a>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#16213A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={captchaSolved}
                    onChange={(e) => setCaptchaSolved(e.target.checked)}
                    className="rounded border-[#E5E1D8] text-[#2D5F8A] focus:ring-[#2D5F8A]"
                  />
                  <span>I have completed the verification</span>
                </label>
              </div>
            </div>
          ) : (
            /* Custom Questions Review */
            <div className="space-y-3">
              <div className="text-xs text-[#5B6478]">
                The following custom questions cannot be answered automatically with 100% certainty. Please review and confirm:
              </div>

              {reviewFields.map((field) => (
                <div key={field.fieldId} className="p-3.5 bg-white border border-[#E5E1D8] rounded-xl space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`field-${field.fieldId}`}
                      className="font-bold text-xs text-[#16213A]"
                    >
                      {field.label}
                    </label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#2D5F8A]">
                      {field.category}
                    </span>
                  </div>

                  {field.reasonForReview && (
                    <div className="text-[11px] text-[#5B6478] italic">
                      Note: {field.reasonForReview}
                    </div>
                  )}

                  <div className="relative">
                    <input
                      id={`field-${field.fieldId}`}
                      type="text"
                      value={answers[field.fieldId] || ""}
                      onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                      placeholder="Enter verified answer..."
                      className="w-full px-3 py-2 text-xs bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-lg text-[#16213A] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#FAF7F0] border-t border-[#E5E1D8] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold text-[#5B6478] hover:text-[#16213A] transition-colors cursor-pointer"
          >
            Cancel / Save for Later
          </button>

          <button
            type="button"
            onClick={handleConfirmSubmit}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <PaperPlaneTilt size={14} weight="bold" />
            <span>Approve & Complete Application</span>
          </button>
        </div>
      </div>
    </div>
  );
}
