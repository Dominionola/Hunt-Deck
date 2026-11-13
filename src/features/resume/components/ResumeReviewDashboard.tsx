"use client";

import React, { useState } from "react";
import { ResumeDropzone } from "./ResumeDropzone";
import { SkillTagCloud } from "./SkillTagCloud";
import type { ResumeParsedData } from "@/lib/validations/resume";
import {
  Briefcase,
  GraduationCap,
  Sparkle,
  Check,
  FloppyDisk,
  WarningOctagon,
  ArrowRight,
  ShieldCheck,
  Lightning,
} from "@phosphor-icons/react";

interface ResumeReviewDashboardProps {
  initialData?: ResumeParsedData | null;
  onSave?: (data: ResumeParsedData) => Promise<void>;
}

export function ResumeReviewDashboard({
  initialData = null,
  onSave,
}: ResumeReviewDashboardProps) {
  const [resumeData, setResumeData] = useState<ResumeParsedData | null>(initialData);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with live database on mount if initialData is not supplied
  React.useEffect(() => {
    if (!initialData) {
      async function fetchSavedResume() {
        try {
          const res = await fetch("/api/resumes");
          if (res.ok) {
            const data = await res.json();
            if (data.resume?.parsedData) {
              setResumeData(data.resume.parsedData);
              setResumeId(data.resume.id);
            }
          }
        } catch {
          // Gracefully continue to dropzone
        }
      }
      fetchSavedResume();
    }
  }, [initialData]);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to process resume");
      }

      setResumeData(json.extractedData || json.parsedData);
      if (json.resumeId) {
        setResumeId(json.resumeId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resumeData) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (onSave) {
        await onSave(resumeData);
      } else {
        const res = await fetch("/api/resumes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId, parsedData: resumeData }),
        });
        if (!res.ok) {
          throw new Error("Failed to persist profile changes.");
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // State 1: Loading Skeleton State
  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-28 bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl" />
          <div className="md:col-span-2 h-64 bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl" />
        </div>
        <div className="h-80 bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl" />
      </div>
    );
  }

  // State 2: Error State
  if (errorMessage && !resumeData) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
        <WarningOctagon size={44} className="text-rose-600 mx-auto" weight="duotone" />
        <h3 className="text-base font-semibold text-[#16213A]">Unable to Parse Document</h3>
        <p className="text-xs text-[#5B6478] max-w-md mx-auto">{errorMessage}</p>
        <button
          onClick={() => setErrorMessage(null)}
          className="px-4 py-2 bg-[#16213A] text-white text-xs font-medium rounded-lg hover:bg-[#0D1527] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // State 3: Empty State (Upload Prompt)
  if (!resumeData) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#FAF7F0] border border-[#E5E1D8] rounded-full text-xs font-medium text-[#2D5F8A]">
            <Lightning size={14} weight="fill" />
            <span>Pipeline 01: Resume Ingestion & Entity Parsing</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#16213A]">
            Ingest your master profile, <span className="font-serif italic font-normal text-[#2D5F8A]">pass ATS filters</span>
          </h2>
          <p className="text-sm text-[#5B6478] max-w-xl mx-auto">
            Upload your resume. Hunt Deck extracts your experience, normalizes your skills cloud, and prepares 1536-dimensional vectors for first-mover discovery.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 border border-[#E5E1D8] rounded-2xl shadow-xs">
          <ResumeDropzone onFileAccepted={handleFileUpload} isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#5B6478]">
          <div className="flex items-center space-x-2.5 p-3.5 bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-xl">
            <ShieldCheck size={20} className="text-[#2D5F8A] shrink-0" weight="fill" />
            <span>Zero Hallucinations Guarantee</span>
          </div>
          <div className="flex items-center space-x-2.5 p-3.5 bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-xl">
            <Sparkle size={20} className="text-[#2D5F8A] shrink-0" weight="fill" />
            <span>Anti-Watermark AI Purge</span>
          </div>
          <div className="flex items-center space-x-2.5 p-3.5 bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-xl">
            <Lightning size={20} className="text-[#2D5F8A] shrink-0" weight="fill" />
            <span>8-Minute First Mover Sync</span>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Interactive Review State (Human Gate)
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header & Gate Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-[#E5E1D8] rounded-2xl shadow-xs">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#2D5F8A]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Human Review Gate — Ready to Audit</span>
          </div>
          <h2 className="text-2xl font-bold text-[#16213A] mt-1">{resumeData.fullName}</h2>
          <p className="text-xs text-[#5B6478]">
            {resumeData.email && `${resumeData.email} • `}
            {resumeData.location || "Remote / Anywhere"}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setResumeData(null)}
            className="px-3.5 py-2 text-xs font-medium text-[#5B6478] hover:text-[#16213A] bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 border border-[#E5E1D8] rounded-lg transition-colors cursor-pointer"
          >
            Upload Different Resume
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-[#16213A] hover:bg-[#0D1527] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check size={16} weight="bold" className="text-emerald-400" />
                <span>Profile Confirmed</span>
              </>
            ) : (
              <>
                <FloppyDisk size={16} weight="bold" />
                <span>{isSaving ? "Saving Profile..." : "Confirm & Save Profile"}</span>
                <ArrowRight size={14} weight="bold" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Executive Summary & Skills */}
        <div className="lg:col-span-1 space-y-6">
          {/* Executive Summary Card */}
          <div className="p-6 bg-white border border-[#E5E1D8] rounded-2xl shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#16213A] uppercase tracking-wider">
              Executive Summary
            </h3>
            <textarea
              value={resumeData.summary || ""}
              onChange={(e) =>
                setResumeData({ ...resumeData, summary: e.target.value })
              }
              rows={5}
              className="w-full p-3 text-xs leading-relaxed bg-[#FAF7F0]/30 border border-[#E5E1D8] rounded-xl text-[#16213A] focus:outline-hidden focus:border-[#2D5F8A] transition-colors resize-none"
              placeholder="Candidate summary..."
            />
            <p className="text-[11px] text-[#5B6478]">
              Directly vectorized for semantic search ranking.
            </p>
          </div>

          {/* Skills Cloud Card */}
          <div className="p-6 bg-white border border-[#E5E1D8] rounded-2xl shadow-xs">
            <SkillTagCloud
              skills={resumeData.skills}
              onChange={(newSkills) =>
                setResumeData({ ...resumeData, skills: newSkills })
              }
            />
          </div>
        </div>

        {/* Right Col: Chronological Experience & Education */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Experience */}
          <div className="p-6 bg-white border border-[#E5E1D8] rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center space-x-2">
                <Briefcase size={18} className="text-[#2D5F8A]" />
                <h3 className="text-sm font-semibold text-[#16213A] uppercase tracking-wider">
                  Experience ({resumeData.experience.length})
                </h3>
              </div>
              <span className="text-xs text-[#5B6478]">Chronological Provenance Verified</span>
            </div>

            <div className="space-y-6">
              {resumeData.experience.map((exp, idx) => (
                <div
                  key={`${exp.company}-${idx}`}
                  className="p-4 bg-[#FAF7F0]/20 border border-[#E5E1D8] rounded-xl space-y-2 hover:border-[#2D5F8A]/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-[#16213A]">{exp.title}</h4>
                    <span className="text-xs font-medium text-[#2D5F8A] bg-[#2D5F8A]/10 px-2 py-0.5 rounded-full">
                      {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#5B6478]">{exp.company}</p>

                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1.5 text-xs text-[#16213A] list-disc list-inside">
                      {exp.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          {resumeData.education && resumeData.education.length > 0 && (
            <div className="p-6 bg-white border border-[#E5E1D8] rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#E5E1D8] pb-3">
                <GraduationCap size={18} className="text-[#2D5F8A]" />
                <h3 className="text-sm font-semibold text-[#16213A] uppercase tracking-wider">
                  Education
                </h3>
              </div>
              <div className="space-y-3">
                {resumeData.education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs p-3 bg-[#FAF7F0]/20 border border-[#E5E1D8] rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-[#16213A]">{edu.institution}</p>
                      <p className="text-[#5B6478]">
                        {edu.degree} {edu.fieldOfStudy && `in ${edu.fieldOfStudy}`}
                      </p>
                    </div>
                    {edu.graduationYear && (
                      <span className="text-[#5B6478]">{edu.graduationYear}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
