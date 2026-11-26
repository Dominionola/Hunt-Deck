"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadSimple,
  FilePdf,
  FileDoc,
  FileText,
  CheckCircle,
  WarningCircle,
  Lock,
  SpinnerGap,
  LinkedinLogo,
  Sparkle,
} from "@phosphor-icons/react";
import { step1ImportSchema, type Step1ImportInput } from "@/lib/validations/onboarding";
import type { ResumeParsedData } from "@/lib/validations/resume";
import { importOnboardingResume, loadSavedOnboardingResume } from "@/features/onboarding/importResume";
import { Button } from "@/components/base/buttons/button";

interface Step1ImportProps {
  initialData?: Partial<Step1ImportInput>;
  onComplete: (data: Step1ImportInput, parsedData?: ResumeParsedData) => void;
}

export function Step1Import({ initialData, onComplete }: Step1ImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>(initialData?.fileName || "");
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(initialData?.fileSizeBytes || 0);
  const [resumeFileId, setResumeFileId] = useState<string>(initialData?.resumeFileId || "");
  const [linkedinUrl, setLinkedinUrl] = useState<string>(initialData?.linkedinUrl || "");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedResume, setSavedResume] = useState<Awaited<ReturnType<typeof loadSavedOnboardingResume>>>(null);
  const [savedState, setSavedState] = useState<"loading" | "ready" | "error">("loading");
  const [savedRevision, setSavedRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void loadSavedOnboardingResume(controller.signal).then((resume) => {
      if (!controller.signal.aborted) { setSavedResume(resume); setSavedState("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setSavedState("error"); });
    return () => controller.abort();
  }, [savedRevision]);

  const useSavedResume = () => {
    if (!savedResume) return;
    const input = step1ImportSchema.safeParse({ resumeFileId: savedResume.id,
      fileName: savedResume.title, linkedinUrl: linkedinUrl || savedResume.parsedData.linkedinUrl || "", isScratchMode: false });
    if (!input.success) { setErrorMessage("Please enter a valid LinkedIn profile URL or leave it empty."); return; }
    onComplete(input.data, savedResume.parsedData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const validExtensions = [".pdf"];
    const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;

    if (!validExtensions.includes(fileExt)) {
      setErrorMessage("Please upload a PDF resume or a PDF export of your LinkedIn profile.");
      return;
    }

    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      setErrorMessage("Please choose a non-empty PDF up to 10 MB.");
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setFileSizeBytes(file.size);
    setResumeFileId("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleScratchMode = () => {
    const data = step1ImportSchema.safeParse({
      resumeFileId: "scratch-profile-init",
      fileName: "Scratch Master Profile",
      fileSizeBytes: 0,
      linkedinUrl,
      isScratchMode: true,
    });
    if (!data.success) { setErrorMessage("Please enter a valid LinkedIn profile URL or leave it empty."); return; }
    onComplete(data.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !resumeFileId) {
      setErrorMessage("Please drop your resume to continue.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const input = step1ImportSchema.safeParse({ resumeFileId: resumeFileId || "pending", linkedinUrl });
      if (!input.success) throw new Error("Please enter a valid LinkedIn profile URL or leave it empty.");
      setProcessStep(1);
      let id = resumeFileId;
      let parsedData: ResumeParsedData | undefined;
      if (selectedFile) {
        const result = await importOnboardingResume(selectedFile, (progress) => setProcessStep(progress >= 35 ? 2 : 1));
        id = result.resumeId;
        parsedData = result.parsedData;
        setResumeFileId(id);
      }
      setProcessStep(3);
      onComplete({
        resumeFileId: id,
        fileName,
        fileSizeBytes,
        linkedinUrl: linkedinUrl.trim(),
        isScratchMode: false,
      }, parsedData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error processing document. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {/* Editorial Headline */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#16213A] tracking-tight mb-2">
          Import your career baseline,{" "}
          <span className="font-serif italic font-normal text-[#16213A]">
            at your pace.
          </span>
        </h1>
        <p className="text-sm text-[#5B6478] max-w-lg mx-auto">
          Upload your resume or a PDF export of your LinkedIn profile, then review the extracted information.
        </p>
      </div>

      {/* Main Elevated Card */}
      <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 shadow-xs">
        {savedState === "loading" && <p role="status" className="mb-5 text-body-regular text-text-secondary">Checking for a saved resume…</p>}
        {savedState === "error" && <div role="alert" className="mb-5 space-y-2"><p className="text-body-regular text-text-secondary">Could not check for a saved resume. You can retry or upload a PDF below.</p><Button variant="secondary" className="min-h-11" onClick={() => { setSavedState("loading"); setSavedRevision((v) => v + 1); }}>Retry saved resume</Button></div>}
        {savedState === "ready" && savedResume && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border-button-default bg-background-secondary-default p-4"><div className="min-w-0"><h2 className="text-headline-medium text-text-primary">Continue with your saved resume</h2><p className="mt-2 break-words text-body-regular text-text-secondary">{savedResume.title}. Review the saved information without processing the PDF again.</p></div><Button variant="secondary" className="min-h-11" disabled={isProcessing} onClick={useSavedResume}>Use saved resume</Button></div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-[#16213A] uppercase tracking-wider mb-2">
              Master Resume Document
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
              role="button"
              tabIndex={0}
              aria-label="Choose or replace resume file"
              className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-[#2D5F8A] bg-[#2D5F8A]/8 scale-[1.01]"
                  : fileName
                  ? "border-[#2D5F8A]/40 bg-[#FAF7F0]/40"
                  : "border-[#E5E1D8] bg-[#FAF7F0]/30 hover:border-[#2D5F8A]/50 hover:bg-[#FAF7F0]/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                disabled={isProcessing}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {fileName ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F0] flex items-center justify-center text-[#2D5F8A]">
                    {fileName.endsWith(".pdf") ? (
                      <FilePdf size={28} weight="duotone" />
                    ) : fileName.endsWith(".docx") ? (
                      <FileDoc size={28} weight="duotone" />
                    ) : (
                      <FileText size={28} weight="duotone" />
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[#16213A]">{fileName}</div>
                  <div className="text-xs text-[#5B6478]">{formatFileSize(fileSizeBytes)}</div>
                  <span className="text-xs text-[#2D5F8A] hover:underline mt-1 font-medium">
                    Click or drop to replace document
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A]">
                    <UploadSimple size={24} weight="bold" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#16213A]">
                      Drag & drop your resume here, or{" "}
                      <span className="text-[#2D5F8A] underline">browse</span>
                    </div>
                    <div className="text-xs text-[#5B6478] mt-1">
                      Supports PDF up to 10 MB
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LinkedIn Profile Field (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="linkedin"
                className="block text-xs font-semibold text-[#16213A] uppercase tracking-wider"
              >
                LinkedIn Profile URL
              </label>
              <span className="text-[11px] text-[#5B6478]">Optional</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6478]">
                <LinkedinLogo size={18} weight="bold" />
              </div>
              <input
                id="linkedin"
                type="url"
                disabled={isProcessing}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/username"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl text-sm text-[#16213A] placeholder-[#5B6478]/50 focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]/20 focus:border-[#2D5F8A] transition-all"
              />
            </div>
            <p className="text-[11px] text-[#5B6478] mt-1.5">
              Saved as a profile link. We do not import information from this URL. Upload a LinkedIn profile PDF to import its details.
            </p>
          </div>

          {/* Extraction Streaming Progress Overlay */}
          {isProcessing && (
            <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#2D5F8A]/20 space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2D5F8A]">
                <SpinnerGap size={16} className="animate-spin" />
                <span>Processing your document...</span>
              </div>
              <div className="space-y-1.5 text-xs text-[#5B6478]">
                <div
                  className={`flex items-center gap-2 transition-opacity ${
                    processStep >= 1 ? "opacity-100 text-[#16213A]" : "opacity-40"
                  }`}
                >
                  <CheckCircle size={14} weight="fill" className="text-[#2D5F8A]" />
                  <span>Uploading privately and waiting for the worker...</span>
                </div>
                <div
                  className={`flex items-center gap-2 transition-opacity ${
                    processStep >= 2 ? "opacity-100 text-[#16213A]" : "opacity-40"
                  }`}
                >
                  <CheckCircle size={14} weight="fill" className="text-[#2D5F8A]" />
                  <span>Extracting your information...</span>
                </div>
                <div
                  className={`flex items-center gap-2 transition-opacity ${
                    processStep >= 3 ? "opacity-100 text-[#16213A]" : "opacity-40"
                  }`}
                >
                  <CheckCircle size={14} weight="fill" className="text-[#2D5F8A]" />
                  <span>Preparing your extracted skills for review...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Privacy Guarantee Banner */}
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] text-xs text-[#5B6478]">
            <Lock size={16} weight="fill" className="text-[#2D5F8A] shrink-0" />
            <span>
              Your resume is securely parsed and encrypted strictly for your personal job matches and application customizer.
            </span>
          </div>

          {/* Actions Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleScratchMode}
              disabled={isProcessing}
              className="text-xs text-[#5B6478] hover:text-[#16213A] transition-colors order-2 sm:order-1 font-medium min-h-[44px] px-2 flex items-center"
            >
              I don&apos;t have a resume right now &mdash; start from scratch &rarr;
            </button>

            <button
              type="submit"
              disabled={(!selectedFile && !resumeFileId) || isProcessing}
              className={`w-full sm:w-auto min-h-[46px] px-8 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all order-1 sm:order-2 active:scale-[0.98] ${
                (!selectedFile && !resumeFileId) || isProcessing
                  ? "bg-[#E5E1D8] text-[#5B6478] cursor-not-allowed"
                  : "bg-[#16213A] hover:bg-[#0D1527] text-white shadow-sm hover:shadow"
              }`}
            >
              {isProcessing ? (
                <>
                  <SpinnerGap size={18} className="animate-spin" />
                  <span>Extracting Skills...</span>
                </>
              ) : (
                <>
                  <Sparkle size={16} weight="fill" />
                  <span>Verify Skills &rarr;</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
