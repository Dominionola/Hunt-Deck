"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  LinkedinLogo,
  Copy,
  CheckCircle,
  PaperPlaneTilt,
  Sparkle,
  WarningCircle,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import {
  type EnrichedContact,
  enrichCompanyContacts,
} from "@/services/contacts/contactIntelligenceService";
import { OutreachModal } from "@/features/contacts/components/OutreachModal";

interface CompanyContactsCardProps {
  companyName: string;
  roleTitle: string;
}

export function CompanyContactsCard({
  companyName,
  roleTitle,
}: CompanyContactsCardProps) {
  const [contacts, setContacts] = useState<EnrichedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeContactForOutreach, setActiveContactForOutreach] = useState<EnrichedContact | null>(null);
  const [copiedEmailMap, setCopiedEmailMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    enrichCompanyContacts(companyName, roleTitle)
      .then((results) => {
        if (isMounted) {
          setContacts(results);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to discover contacts");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [companyName, roleTitle]);

  const handleCopyEmail = (contact: EnrichedContact) => {
    navigator.clipboard.writeText(contact.email);
    setCopiedEmailMap((prev) => ({ ...prev, [contact.id]: true }));
    toast.success("Email copied", {
      description: `Copied ${contact.email} (${contact.confidenceTier})`,
    });
    setTimeout(() => {
      setCopiedEmailMap((prev) => ({ ...prev, [contact.id]: false }));
    }, 2000);
  };

  // 1. Loading Skeleton State (pulsing #FAF7F0)
  if (isLoading) {
    return (
      <div className="p-4 bg-white border border-[#E5E1D8] rounded-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D8]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#FAF7F0] animate-pulse" />
            <div className="h-4 w-40 bg-[#FAF7F0] rounded-md animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-[#FAF7F0] rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 bg-[#FAF7F0]/60 rounded-lg space-y-2 animate-pulse">
              <div className="h-4 w-32 bg-[#E5E1D8] rounded" />
              <div className="h-3 w-48 bg-[#E5E1D8] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="p-4 bg-white border border-red-200 rounded-xl space-y-2 text-xs">
        <div className="flex items-center gap-2 text-red-700 font-bold">
          <WarningCircle size={16} />
          <span>Contact Intelligence Unavailable</span>
        </div>
        <p className="text-[#5B6478]">{error}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            enrichCompanyContacts(companyName, roleTitle)
              .then(setContacts)
              .finally(() => setIsLoading(false));
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 text-[#16213A] border border-[#E5E1D8] rounded-lg font-semibold cursor-pointer"
        >
          <ArrowsClockwise size={12} />
          <span>Retry Discovery</span>
        </button>
      </div>
    );
  }

  // 3. Empty State
  if (contacts.length === 0) {
    return (
      <div className="p-5 bg-white border border-[#E5E1D8] rounded-xl text-center space-y-2">
        <div className="w-9 h-9 mx-auto rounded-full bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#5B6478]">
          <Users size={18} />
        </div>
        <div className="text-xs font-bold text-[#16213A]">No verified contacts indexed yet</div>
        <p className="text-[11px] text-[#5B6478] max-w-sm mx-auto">
          Google Dork search crawler found no public executive LinkedIn snippets for this company.
        </p>
      </div>
    );
  }

  // 4. Interactive State
  return (
    <>
      <div className="p-4 bg-white border border-[#E5E1D8] rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D8]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#2D5F8A]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#16213A]">
              Key Contacts & Hiring Leads
            </h4>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <Sparkle size={11} weight="fill" />
            <span>{contacts.length} Decision Makers Found</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {contacts.map((contact) => {
            const isHiringMgr = contact.roleType === "hiring_manager";
            const isExec = contact.roleType === "executive";
            const isCopied = copiedEmailMap[contact.id];

            return (
              <div
                key={contact.id}
                className="p-3 bg-[#FAF7F0]/50 border border-[#E5E1D8] rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-[#16213A]">{contact.fullName}</span>

                      {/* Role Pill */}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isHiringMgr
                            ? "bg-emerald-100 text-emerald-800"
                            : isExec
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {isHiringMgr
                          ? "Likely Hiring Manager"
                          : isExec
                          ? "Executive Sponsor"
                          : "Team Lead / Peer"}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#5B6478] mt-0.5 leading-snug">
                      {contact.title} • {contact.department}
                    </p>
                  </div>

                  {/* LinkedIn Link */}
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 rounded-md text-[#5B6478] hover:text-[#0077b5] hover:bg-white transition-colors"
                    title={`View ${contact.fullName} on LinkedIn`}
                  >
                    <LinkedinLogo size={16} />
                  </a>
                </div>

                {/* Email Address & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#E5E1D8]/60 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#5B6478] font-mono text-[11px] truncate max-w-[200px]">
                      {contact.email}
                    </span>

                    {/* Verified Confidence Badge */}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                        contact.confidenceTier === "verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : contact.confidenceTier === "high_confidence"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {contact.confidenceTier.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(contact)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#16213A] bg-white hover:bg-[#FAF7F0] border border-[#E5E1D8] rounded-md transition-colors cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle size={12} className="text-emerald-600" weight="fill" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Email</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveContactForOutreach(contact)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#2D5F8A] hover:bg-[#2D5F8A]/90 rounded-md transition-colors cursor-pointer"
                    >
                      <PaperPlaneTilt size={12} />
                      <span>Draft Outreach</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1-Click Outreach Modal */}
      {activeContactForOutreach && (
        <OutreachModal
          contact={activeContactForOutreach}
          roleTitle={roleTitle}
          onClose={() => setActiveContactForOutreach(null)}
        />
      )}
    </>
  );
}
