"use client";

import React, { useState, useRef } from "react";
import {
  UploadSimple,
  FilePdf,
  FileDoc,
  FileText,
  CheckCircle,
  WarningCircle,
  Lock,
  ArrowRight,
  SpinnerGap,
  LinkedinLogo,
  Sparkle,
} from "@phosphor-icons/react";
import type { Step1ImportInput } from "@/lib/validations/onboarding";

interface Step1ImportProps {
  initialData?: Partial<Step1ImportInput>;
  onComplete: (data: Step1ImportInput) => void;
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const validExtensions = [".pdf", ".docx", ".txt"];
    const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;

    if (!validExtensions.includes(fileExt)) {
      setErrorMessage("Please upload a valid resume file (.pdf, .docx, or .txt)");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("File exceeds the 20MB limit. Please upload a smaller document.");
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setFileSizeBytes(file.size);
    // Generate a temporary client ID if none exists yet
    setResumeFileId(crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}`);
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
    onComplete({
      resumeFileId: "scratch-profile-init",
      fileName: "Scratch Master Profile",
      fileSizeBytes: 0,
      linkedinUrl,
      isScratchMode: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !resumeFileId) {
      setErrorMessage("Please drop your resume to continue.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Simulate high-fidelity parsing stages as per spec (< 2.5s)
    try {
      setProcessStep(1); // Text extraction
      await new Promise((r) => setTimeout(r, 600));

      setProcessStep(2); // Google XYZ atomization
      await new Promise((r) => setTimeout(r, 700));

      setProcessStep(3); // Categorizing technical competencies
      await new Promise((r) => setTimeout(r, 600));

      onComplete({
        resumeFileId: resumeFileId || "res-default",
        fileName: fileName || "Resume.pdf",
        fileSizeBytes: fileSizeBytes || 120000,
        linkedinUrl: linkedinUrl.trim(),
        isScratchMode: false,
      });
    } catch {
      setErrorMessage("Error processing document. Please try again.");
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
            in sixty seconds.
          </span>
        </h1>
        <p className="text-sm text-[#5B6478] max-w-lg mx-auto">
          Choose a resume and optionally add your LinkedIn profile to preview the setup flow.
        </p>
      </div>

      {/* Main Elevated Card */}
      <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 shadow-sm">
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
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-[#2D5F8A] bg-[#2D5F8A]/5 scale-[1.01]"
                  : fileName
                  ? "border-[#2D5F8A]/40 bg-[#FFFFFF]"
                  : "border-[#E5E1D8] bg-[#FFFFFF] hover:border-[#2D5F8A]/50 hover:bg-[#FFFFFF]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
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
                      Supports PDF, DOCX, or TXT up to 20MB
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
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/username"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl text-sm text-[#16213A] placeholder-[#5B6478]/50 focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]/20 focus:border-[#2D5F8A] transition-all"
              />
            </div>
            <p className="text-[11px] text-[#5B6478] mt-1.5">
              Optional in this preview; the link is not checked.
            </p>
          </div>

          {/* Extraction Streaming Progress Overlay */}
          {isProcessing && (
            <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#2D5F8A]/20 space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2D5F8A]">
                <SpinnerGap size={16} className="animate-spin" />
                <span>Preparing preview...</span>
              </div>
              <div className="space-y-1.5 text-xs text-[#5B6478]">
                <div
                  className={`flex items-center gap-2 transition-opacity ${
                    processStep >= 1 ? "opacity-100 text-[#16213A]" : "opacity-40"
                  }`}
                >
                  <CheckCircle size={14} weight="fill" className="text-[#2D5F8A]" />
                  <span>Preparing the next step...</span>
                </div>
                <div
                  className={`flex items-center gap-2 transition-opacity ${
                    processStep >= 2 ? "opacity-100 text-[#16213A]" : "opacity-40"
                  }`}
                >
                  <CheckCircle size={14} weight="fill" className="text-[#2D5F8A]" />
                  <span>Loading example skills...</span>
                </div>
                <div
                  className={`flex items-center gap-2 transition-opacity ${
                    processStep >= 3 ? "opacity-100 text-[#16213A]" : "opacity-40"
                  }`}
                >
                  <CheckCircle size={14} weight="fill" className="text-[#2D5F8A]" />
                  <span>Almost ready...</span>
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
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FFFFFF] border border-[#E5E1D8] text-xs text-[#5B6478]">
            <Lock size={16} weight="fill" className="text-[#2D5F8A] shrink-0" />
            <span>
              This preview stays in your browser and does not upload your resume.
            </span>
          </div>

          {/* Actions Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleScratchMode}
              className="text-xs text-[#5B6478] hover:text-[#16213A] transition-colors order-2 sm:order-1 font-medium"
            >
              I don&apos;t have a resume right now &mdash; start from scratch &rarr;
            </button>

            <button
              type="submit"
              disabled={(!selectedFile && !resumeFileId) || isProcessing}
              className={`w-full sm:w-auto px-6 py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all order-1 sm:order-2 ${
                (!selectedFile && !resumeFileId) || isProcessing
                  ? "bg-[#E5E1D8] text-[#5B6478] cursor-not-allowed"
                  : "bg-[#16213A] hover:bg-[#0D1527] text-white shadow-sm hover:shadow"
              }`}
            >
              {isProcessing ? (
                <>
                  <SpinnerGap size={16} className="animate-spin" />
                  <span>Preparing preview...</span>
                </>
              ) : (
                <>
                  <Sparkle size={16} weight="fill" />
                  <span>Continue &rarr;</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
