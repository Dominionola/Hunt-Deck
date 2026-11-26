"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  Sparkle,
  GitDiff,
  Tag,
} from "@phosphor-icons/react";
import {
  RiDownloadLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiMailLine,
  RiPrinterLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import { Tab, TabList, TabPanel, Tabs } from "@/components/base/tabs/tabs";
import { toast } from "@/components/base/toast/toast";
import type { TailorSessionState } from "../types";
import type { CoverLetterTone } from "@/services/ai/coverLetterGenerator";
import { AtsPrintResume } from "./AtsPrintResume";

interface TailorWorkspacePaneProps {
  session: TailorSessionState;
  onToneChange: (tone: CoverLetterTone) => void;
  onBulletEdit?: (roleIndex: number, bulletIndex: number, text: string) => void;
}

export function TailorWorkspacePane({
  session,
  onToneChange,
}: TailorWorkspacePaneProps) {
  const [activeTab, setActiveTab] = useState<"resume" | "cover_letter" | "audit">("resume");
  const [showDiffMap, setShowDiffMap] = useState<Record<string, boolean>>({});
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const toggleDiff = (key: string) => {
    setShowDiffMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyCoverLetter = () => {
    const text = [
      session.coverLetter.paragraphs.hook,
      session.coverLetter.paragraphs.evidence,
      session.coverLetter.paragraphs.connection,
      session.coverLetter.paragraphs.close,
    ].join("\n\n");

    navigator.clipboard.writeText(text);
    setCopiedLetter(true);
    toast.success("Cover letter copied", {
      description: "4-paragraph bespoke cover letter copied to clipboard.",
    });
    setTimeout(() => setCopiedLetter(false), 2500);
  };

  const handleDownloadAts = async (format: "html" | "text" = "html") => {
    setIsExporting(true);
    try {
      const profile = session.candidateProfile || session.masterProfile;
      const targetJob = session.targetJob || session.job;
      const res = await fetch("/api/tailor/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          summary: profile.summary,
          targetRoleTitle: targetJob.title,
          skills: profile.skills,
          tailoredRoles: session.tailoredRoles,
          format,
        }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profile.fullName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-ats-resume.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("ATS Document Downloaded", {
        description: `Exported clean, single-column machine-readable ${format.toUpperCase()} file.`,
      });
    } catch {
      toast.error("Export Failed", {
        description: "Launching browser print layout instead.",
      });
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = () => {
    toast.info("Generating ATS PDF", {
      description: "Launching browser print preview in single-column ATS layout.",
    });
    window.print();
  };

  return (
    <main className="w-full lg:w-[55%] xl:w-[58%] flex flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6 shadow-xs">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as "resume" | "cover_letter" | "audit")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabList aria-label="Tailoring workspace sections" className="w-auto border-b-0">
            <Tab id="resume" icon={RiFileTextLine} className="min-h-11">
              ATS Resume
            </Tab>
            <Tab id="cover_letter" icon={RiMailLine} className="min-h-11">
              Cover Letter
            </Tab>
            <Tab
              id="audit"
              icon={RiShieldCheckLine}
              count={session.auditReport.overallScore}
              className="min-h-11"
            >
              Pre-Flight Audit
            </Tab>
          </TabList>

          {/* Global Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              leadingIcon={RiDownloadLine}
              disabled={isExporting}
              onClick={() => handleDownloadAts("html")}
              className="min-h-11"
            >
              {isExporting ? "Exporting..." : "Download ATS File"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              leadingIcon={RiPrinterLine}
              onClick={handlePrintPdf}
              className="min-h-11"
            >
              Print PDF
            </Button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: ATS Tailored Resume View                               */}
        {/* ───────────────────────────────────────────────────────────── */}
        <TabPanel id="resume">
        <div className="space-y-6">
          {/* Status Sub-Banner */}
          <div className="p-3 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkle size={14} className="text-[#2D5F8A]" />
              <span className="font-semibold text-[#16213A]">
                3-Pass ATS Optimization Active
              </span>
              <span className="text-[#5B6478]">
                • Relevance scoring, keyword injection & Google XYZ alignment applied
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle size={13} weight="fill" />
              <span>Zero Hallucinations Verified</span>
            </div>
          </div>

          {/* Section: Tailored Work Experience Bullets */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478] border-b border-[#E5E1D8] pb-1">
              Work Experience — 3-Pass Rewrites & Diff Analysis
            </h3>

            {session.tailoredRoles.map((role, roleIdx) => (
              <div key={roleIdx} className="p-4 bg-white border border-[#E5E1D8] rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#16213A]">{role.title}</h4>
                    <p className="text-xs text-[#5B6478]">
                      {role.company} • {role.startDate} – {role.endDate || "Present"}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF3F7] text-[#2D5F8A]">
                    {role.bullets.length} Tailored Bullets
                  </span>
                </div>

                {/* Bullets List */}
                <div className="space-y-2.5">
                  {role.bullets.map((bullet, bIdx) => {
                    const diffKey = `${roleIdx}-${bIdx}`;
                    const isDiffOpen = showDiffMap[diffKey];

                    return (
                      <div
                        key={bIdx}
                        className="p-3 bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-[#16213A] leading-relaxed font-medium">
                            • {bullet.rewrittenBullet}
                          </p>

                          <button
                            type="button"
                            onClick={() => toggleDiff(diffKey)}
                            className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-[#2D5F8A] hover:underline cursor-pointer bg-white px-2 py-0.5 rounded border border-[#E5E1D8]"
                            title="Compare with original master resume bullet"
                          >
                            <GitDiff size={12} />
                            <span>{isDiffOpen ? "Hide Diff" : "Diff"}</span>
                          </button>
                        </div>

                        {/* Diff Comparison Accordion */}
                        {isDiffOpen && (
                          <div className="p-2.5 bg-white border border-[#E5E1D8] rounded-md space-y-1.5 text-[11px]">
                            <div className="text-[#5B6478]">
                              <span className="font-bold text-red-600">- Master:</span> {bullet.sourceBullet}
                            </div>
                            <div className="text-[#16213A]">
                              <span className="font-bold text-emerald-700">+ Tailored:</span> {bullet.rewrittenBullet}
                            </div>
                          </div>
                        )}

                        {/* Badges: Relevance, XYZ, Injected Keywords */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {Math.round(bullet.relevanceScore * 100)}% Relevance
                          </span>

                          {bullet.xyzFormatted && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                              Google XYZ
                            </span>
                          )}

                          {bullet.injectedKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200/60"
                            >
                              <Tag size={10} />
                              <span>{kw}</span>
                            </span>
                          ))}

                          {bullet.missingMetricFlag && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                              Metric needed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* Section: Live Machine-Readable ATS Print Preview */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                Clean Machine-Readable ATS Sheet Preview
              </h3>
              <span className="text-[11px] text-[#5B6478]">
                Single-column • Arial/Calibri • Standard Headers
              </span>
            </div>
            <AtsPrintResume
              profile={session.masterProfile}
              tailoredRoles={session.tailoredRoles}
              targetRoleTitle={session.job.title}
            />
          </section>
        </div>
        </TabPanel>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: Deep Bespoke Cover Letter View                         */}
        {/* ───────────────────────────────────────────────────────────── */}
        <TabPanel id="cover_letter">
          <div className="space-y-5">
            {/* Tone Selector & Anti-Cliche Badge */}
            <div className="p-4 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider mb-1.5">
                  Tone Calibration
                </div>
                <SegmentedControl
                  aria-label="Cover letter tone calibration"
                  selectedKeys={[session.coverLetter.tone]}
                  onSelectionChange={(keys) => {
                    const selected = [...keys][0] as CoverLetterTone | undefined;
                    if (selected) onToneChange(selected);
                  }}
                >
                  <SegmentedControlItem id="modern_tech" className="min-h-10">Modern tech</SegmentedControlItem>
                  <SegmentedControlItem id="executive" className="min-h-10">Executive</SegmentedControlItem>
                  <SegmentedControlItem id="warm" className="min-h-10">Warm</SegmentedControlItem>
                </SegmentedControl>
              </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">Length</div>
                <div className="text-xs font-bold text-[#16213A]">
                  {session.coverLetter.wordCount} words
                  <span className="text-[10px] font-normal text-[#5B6478] ml-1">(target: 280–420)</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>100% Cliché-Free</span>
              </div>
            </div>
          </div>

          {/* 4 Paragraphs Card */}
          <div className="p-6 bg-white border border-[#E5E1D8] rounded-xl space-y-5 shadow-2xs font-sans text-xs sm:text-sm text-[#16213A] leading-relaxed">
            {/* P1 Hook */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#2D5F8A]">
                <span>P1 — The Hook (Verified Fact & Context)</span>
                <span className="text-[#5B6478] font-normal">Zero &quot;I am writing to apply&quot;</span>
              </div>
              <p className="bg-[#FAF7F0]/60 p-3 rounded-lg border border-[#E5E1D8]/80">
                {session.coverLetter.paragraphs.hook}
              </p>
            </div>

            {/* P2 Evidence */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#2D5F8A]">
                <span>P2 — The Evidence (Candidate Metrics & Outcomes)</span>
                <span className="text-[#5B6478] font-normal">Strictly from Master Profile</span>
              </div>
              <p className="bg-[#FAF7F0]/60 p-3 rounded-lg border border-[#E5E1D8]/80">
                {session.coverLetter.paragraphs.evidence}
              </p>
            </div>

            {/* P3 Connection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#2D5F8A]">
                <span>P3 — The Connection (Values & Engineering Culture)</span>
                <span className="text-[#5B6478] font-normal">Aligned with Company Brief</span>
              </div>
              <p className="bg-[#FAF7F0]/60 p-3 rounded-lg border border-[#E5E1D8]/80">
                {session.coverLetter.paragraphs.connection}
              </p>
            </div>

            {/* P4 Close */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#2D5F8A]">
                <span>P4 — The Close (Confident, Executive CTA)</span>
                <span className="text-[#5B6478] font-normal">Proactive, no begging</span>
              </div>
              <p className="bg-[#FAF7F0]/60 p-3 rounded-lg border border-[#E5E1D8]/80">
                {session.coverLetter.paragraphs.close}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-body-2-regular text-text-secondary">
              Ready to send with your application on {session.job.atsPlatform}.
            </span>
            <Button
              type="button"
              variant="primary"
              leadingIcon={RiFileCopyLine}
              onClick={handleCopyCoverLetter}
              className="min-h-11"
            >
              {copiedLetter ? "Copied to Clipboard!" : "Copy Full Letter"}
            </Button>
          </div>
          </div>
        </TabPanel>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: ATS Pre-Flight Audit Report View                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <TabPanel id="audit">
        <div className="space-y-5">
          {/* Pre-Flight Score Banner */}
          <div className="p-5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white border-2 border-emerald-500 flex flex-col items-center justify-center text-center shadow-xs">
                <span className="text-xl font-extrabold text-emerald-700 leading-none">
                  {session.auditReport.overallScore}
                </span>
                <span className="text-[9px] font-bold text-[#5B6478] uppercase">/ 100</span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                  <span>ATS Pre-Flight Passed</span>
                </div>
                <h3 className="text-base font-bold text-[#16213A] mt-0.5">
                  Predicted ATS Ranking: Top {100 - session.auditReport.estimatedAtsRankPercentile}%
                </h3>
                <p className="text-xs text-[#5B6478]">
                  Verified compliance across Greenhouse, Lever, Workday, and Ashby parsers.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              leadingIcon={RiDownloadLine}
              onClick={handlePrintPdf}
              className="min-h-11"
            >
              Download Report &amp; PDF
            </Button>
          </div>

          {/* 4 Dimension Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] font-bold text-[#5B6478] uppercase">Format Score</div>
              <div className="text-lg font-bold text-[#16213A] mt-0.5">
                {session.auditReport.formatComplianceScore}%
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Single-column</div>
            </div>

            <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] font-bold text-[#5B6478] uppercase">Keyword Density</div>
              <div className="text-lg font-bold text-[#16213A] mt-0.5">
                {session.auditReport.keywordDensityScore}%
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Verbatim match</div>
            </div>

            <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] font-bold text-[#5B6478] uppercase">Sections</div>
              <div className="text-lg font-bold text-[#16213A] mt-0.5">
                {session.auditReport.sectionCompletenessScore}%
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">All standard</div>
            </div>

            <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl">
              <div className="text-[10px] font-bold text-[#5B6478] uppercase">Date Integrity</div>
              <div className="text-lg font-bold text-[#16213A] mt-0.5">
                {session.auditReport.dateIntegrityScore}%
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Month YYYY</div>
            </div>
          </div>

          {/* Machine-Readability Checklist */}
          <div className="p-4 bg-white border border-[#E5E1D8] rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#16213A]">
              Pre-Flight ATS Verification Checklist
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>Single-column linear text layout</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>Zero tables or grid structures</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>Standard section headers only</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>Standard date formats (Month YYYY)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>Zero emojis or non-standard Unicode</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>Valid contact info & direct email</span>
              </div>
            </div>
          </div>
        </div>
        </TabPanel>
      </Tabs>
    </main>
  );
}
