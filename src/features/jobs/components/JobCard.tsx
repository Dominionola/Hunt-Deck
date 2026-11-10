"use client";

import React from "react";
import { Buildings, MapPin, Sparkle, ArrowSquareOut, CheckCircle } from "@phosphor-icons/react";

export interface JobCardData {
  id: string;
  title: string;
  company: string;
  location?: string;
  remoteType?: string;
  atsPlatform: string;
  applicationUrl: string;
  fitScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  postedAt?: string | Date;
}

interface JobCardProps {
  job: JobCardData;
  onSelect: (job: JobCardData) => void;
  onTailor?: (job: JobCardData) => void;
}

export function JobCard({ job, onSelect, onTailor }: JobCardProps) {
  const score = job.fitScore ?? 84;
  const isHighMatch = score >= 80;
  const isMidMatch = score >= 60 && score < 80;

  return (
    <div
      onClick={() => onSelect(job)}
      className="group relative p-5 bg-white border border-[#E5E1D8] rounded-xl hover:border-[#2D5F8A]/50 transition-all duration-200 hover:shadow-xs cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Meta: Company + Platform + Score */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A] font-semibold text-xs">
              <Buildings size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5B6478]">{job.company}</p>
              <h3 className="text-sm font-bold text-[#16213A] group-hover:text-[#2D5F8A] transition-colors leading-snug">
                {job.title}
              </h3>
            </div>
          </div>

          {/* Match Score Badge */}
          <div
            className={`shrink-0 inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
              isHighMatch
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : isMidMatch
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <Sparkle size={12} weight="fill" />
            <span>{score}% Match</span>
          </div>
        </div>

        {/* Location & Remote & ATS tag */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5B6478] mb-3">
          <span className="inline-flex items-center space-x-1">
            <MapPin size={12} />
            <span>{job.location || "Remote"}</span>
          </span>
          <span>•</span>
          <span className="px-2 py-0.5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-md font-medium text-[#16213A]">
            {job.atsPlatform}
          </span>
          {job.remoteType === "REMOTE_ONLY" && (
            <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-md font-medium">
              Remote
            </span>
          )}
        </div>

        {/* Matching Skills Tags */}
        {job.matchingSkills && job.matchingSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.matchingSkills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#FAF7F0]/80 border border-[#E5E1D8] text-[11px] font-medium text-[#16213A] rounded-md"
              >
                <CheckCircle size={10} className="text-emerald-600" weight="fill" />
                <span>{skill}</span>
              </span>
            ))}
            {job.matchingSkills.length > 4 && (
              <span className="text-[11px] text-[#5B6478] self-center">
                +{job.matchingSkills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-[#E5E1D8] flex items-center justify-between text-xs">
        <a
          href={job.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center space-x-1 text-[#5B6478] hover:text-[#16213A] transition-colors"
        >
          <span>ATS Direct Link</span>
          <ArrowSquareOut size={12} />
        </a>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onTailor) {
              onTailor(job);
            } else {
              onSelect(job);
            }
          }}
          className="px-3 py-1.5 bg-[#16213A] hover:bg-[#0D1527] text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          Tailor Resume
        </button>
      </div>
    </div>
  );
}
