"use client";

import React, { useState, useRef } from "react";
import { UploadSimple, FilePdf, CheckCircle, WarningCircle, SpinnerGap } from "@phosphor-icons/react";

interface ResumeDropzoneProps {
  onFileAccepted: (file: File) => void;
  isLoading?: boolean;
}

export function ResumeDropzone({ onFileAccepted, isLoading = false }: ResumeDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFile = (file: File) => {
    setErrorMessage(null);

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    const hasValidExt = /\.(pdf|docx|txt)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !hasValidExt) {
      setErrorMessage("Please upload a PDF or DOCX file (up to 10MB).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds 10MB limit.");
      return;
    }

    setSelectedFile(file);
    onFileAccepted(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          isDragOver
            ? "border-[#2D5F8A] bg-[#FAF7F0]/60 scale-[1.01]"
            : "border-[#E5E1D8] bg-[#FAF7F0]/20 hover:border-[#2D5F8A]/40 hover:bg-[#FAF7F0]/40"
        } ${isLoading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center text-center space-y-3">
            <SpinnerGap size={40} className="text-[#2D5F8A] animate-spin" />
            <p className="text-base font-medium text-[#16213A]">
              Analyzing document & extracting career entities...
            </p>
            <p className="text-xs text-[#5B6478]">
              Decomposing skills, verifying dates, and generating 1536-dim vector embeddings
            </p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A]">
              <FilePdf size={28} weight="duotone" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#16213A]">{selectedFile.name}</p>
              <p className="text-xs text-[#5B6478]">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
              </p>
            </div>
            <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle size={14} weight="fill" />
              <span>Click or drop new file to replace</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A]">
              <UploadSimple size={24} weight="bold" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#16213A]">
                Drop your current resume here, or{" "}
                <span className="text-[#2D5F8A] font-semibold underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-[#5B6478] mt-1">
                Supports PDF or DOCX up to 10MB • Machine-read in memory
              </p>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-center space-x-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
          <WarningCircle size={16} weight="fill" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
