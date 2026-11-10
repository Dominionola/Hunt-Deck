"use client";

import React, { useState } from "react";
import {
  X,
  EnvelopeSimple,
  LinkedinLogo,
  Copy,
  CheckCircle,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import type { EnrichedContact, OutreachDraft } from "@/services/contacts/contactIntelligenceService";
import { generateOutreachDraft } from "@/services/contacts/contactIntelligenceService";

interface OutreachModalProps {
  contact: EnrichedContact | null;
  roleTitle: string;
  onClose: () => void;
}

export function OutreachModal({
  contact,
  roleTitle,
  onClose,
}: OutreachModalProps) {
  const [activeTab, setActiveTab] = useState<"email" | "inmail">("email");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!contact) return null;

  const draft: OutreachDraft = generateOutreachDraft(
    contact,
    roleTitle,
    "Alex Rivera",
    ["TypeScript", "Distributed Systems"]
  );

  const handleCopyEmail = () => {
    const text = `Subject: ${draft.coldEmailSubject}\n\n${draft.coldEmailBody}`;
    navigator.clipboard.writeText(text);
    setCopiedType("email");
    toast.success("Cold email copied", {
      description: `Draft outreach copied for ${contact.fullName}.`,
    });
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyInMail = () => {
    navigator.clipboard.writeText(draft.linkedInInMailNote);
    setCopiedType("inmail");
    toast.success("InMail note copied", {
      description: "Concise note (< 300 chars) copied for LinkedIn connect.",
    });
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outreach-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-white border border-[#E5E1D8] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E1D8] bg-[#FAF7F0]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF3F7] text-[#2D5F8A] uppercase tracking-wider">
                1-Click Outreach Drafter
              </span>
              <span className="text-xs text-[#5B6478]">
                To: <strong className="text-[#16213A]">{contact.fullName}</strong> ({contact.title})
              </span>
            </div>
            <h2 id="outreach-modal-title" className="text-base font-bold text-[#16213A] mt-1">
              Personalized Direct Outreach Pitch
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5B6478] hover:text-[#16213A] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: Cold Email vs LinkedIn InMail */}
        <div className="flex border-b border-[#E5E1D8] bg-white text-xs font-semibold px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "email"
                ? "border-[#2D5F8A] text-[#2D5F8A] font-bold"
                : "border-transparent text-[#5B6478] hover:text-[#16213A]"
            }`}
          >
            <EnvelopeSimple size={14} />
            <span>Executive Cold Email</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inmail")}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "inmail"
                ? "border-[#2D5F8A] text-[#2D5F8A] font-bold"
                : "border-transparent text-[#5B6478] hover:text-[#16213A]"
            }`}
          >
            <LinkedinLogo size={14} className="text-[#0077b5]" />
            <span>LinkedIn InMail / Note</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
              &lt; 300 chars
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs sm:text-sm">
          {activeTab === "email" && (
            <div className="space-y-3">
              <div className="p-3 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">Subject</div>
                <div className="font-semibold text-[#16213A] text-xs sm:text-sm">
                  {draft.coldEmailSubject}
                </div>
              </div>

              <div className="p-4 bg-white border border-[#E5E1D8] rounded-xl whitespace-pre-line text-xs sm:text-sm text-[#16213A] leading-relaxed font-sans shadow-2xs">
                {draft.coldEmailBody}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#5B6478]">
                  Verified contact email: <strong className="text-[#16213A]">{contact.email}</strong>
                </span>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {copiedType === "email" ? (
                    <>
                      <CheckCircle size={14} className="text-emerald-400" weight="fill" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Subject & Body</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === "inmail" && (
            <div className="space-y-3">
              <div className="p-3 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#5B6478]">
                  <LinkedinLogo size={16} className="text-[#0077b5]" />
                  <span>LinkedIn Connection Message Limit:</span>
                  <strong className="text-[#16213A]">300 characters</strong>
                </div>

                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {draft.linkedInInMailNote.length} / 300 chars
                </span>
              </div>

              <div className="p-4 bg-white border border-[#E5E1D8] rounded-xl text-xs sm:text-sm text-[#16213A] leading-relaxed font-sans shadow-2xs">
                {draft.linkedInInMailNote}
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#2D5F8A] hover:underline font-semibold"
                >
                  <PaperPlaneTilt size={13} />
                  <span>Open {contact.fullName}&apos;s Profile</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyInMail}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0077b5] hover:bg-[#006097] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {copiedType === "inmail" ? (
                    <>
                      <CheckCircle size={14} className="text-emerald-400" weight="fill" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy InMail Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

