"use client";

import React, { useState } from "react";
import {
  Sparkle,
  ArrowSquareOut,
  Copy,
  CheckCircle,
  ChatCircleText,
  Quotes,
  LinkedinLogo,
  TwitterLogo,
  Briefcase,
  MapPin,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import { SocialHiringPost } from "../types/socialHiring";

interface SocialHiringCardProps {
  post: SocialHiringPost;
  onSelect?: (post: SocialHiringPost) => void;
}

export function SocialHiringCard({ post, onSelect }: SocialHiringCardProps) {
  const [pitchCopied, setPitchCopied] = useState(false);
  const [showFullPitch, setShowFullPitch] = useState(false);

  const handleApplyAndCopyPitch = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Copy tailored outreach pitch to clipboard
    navigator.clipboard?.writeText(post.tailoredPitch);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 3000);

    // 2. Trigger BoardUI toast notification
    const platformLabel = post.platform === "linkedin" ? "LinkedIn" : "X / Twitter";
    toast.success("Outreach Pitch Copied!", {
      description: `Tailored 2-sentence pitch for ${post.authorName} is ready to paste into your ${platformLabel} DM.`,
    });

    // 3. Open original canonical social post in new window
    window.open(post.originalPostUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyPitchOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(post.tailoredPitch);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 3000);
    toast.success("Pitch Copied to Clipboard", {
      description: "Direct message copy ready to paste.",
    });
  };

  return (
    <div
      onClick={() => onSelect?.(post)}
      className="group relative p-5 bg-white border border-[#E5E1D8] rounded-2xl hover:border-[#2D5F8A]/50 transition-all duration-200 hover:shadow-xs cursor-pointer flex flex-col justify-between"
      aria-label={`Social hiring post from ${post.authorName}`}
    >
      <div>
        {/* Top Header: Platform Badge + Author Identity + Score */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Author Avatar with initials */}
            <div className="w-9 h-9 rounded-xl bg-[#16213A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {post.authorName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#16213A] truncate">
                  {post.authorName}
                </span>
                {post.platform === "linkedin" ? (
                  <LinkedinLogo size={14} weight="fill" className="text-[#0A66C2] shrink-0" />
                ) : (
                  <TwitterLogo size={14} weight="fill" className="text-[#16213A] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[#5B6478] truncate">
                {post.authorRole} · {post.authorCompany}
              </p>
            </div>
          </div>

          {/* Match Score Badge */}
          <div className="shrink-0 inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Sparkle size={12} weight="fill" />
            <span>{post.fitScore}% Match</span>
          </div>
        </div>

        {/* Target Role & Work Arrangement */}
        <div className="mb-2.5">
          <span className="text-[10px] font-bold tracking-wider text-[#2D5F8A] uppercase block mb-0.5">
            UNADVERTISED SOCIAL ROLE
          </span>
          <h3 className="text-sm font-bold text-[#16213A] group-hover:text-[#2D5F8A] transition-colors leading-snug">
            {post.targetRole}
          </h3>
        </div>

        {/* Location & Remote Pill */}
        <div className="flex items-center gap-2 text-[11px] text-[#5B6478] mb-3">
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} />
            <span>{post.location}</span>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 font-medium capitalize">
            <Briefcase size={12} className="text-[#2D5F8A]" />
            {post.workArrangement}
          </span>
          <span>•</span>
          <span className="text-[10px] text-[#5B6478]/80">{post.postedAt}</span>
        </div>

        {/* Live Quote Preview of Original Post */}
        <div className="p-3 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl mb-3 text-xs text-[#16213A] leading-relaxed relative">
          <Quotes size={16} className="text-[#2D5F8A]/40 mb-1" weight="fill" />
          <p className="line-clamp-3 text-[11px] text-[#16213A]">
            &ldquo;{post.postContent}&rdquo;
          </p>
        </div>

        {/* Matching Skills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.matchingSkills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white border border-[#E5E1D8] text-[10px] font-medium text-[#16213A] rounded-md"
            >
              <CheckCircle size={10} className="text-emerald-600" weight="fill" />
              <span>{skill}</span>
            </span>
          ))}
        </div>

        {/* Tailored Pitch Accordion Preview */}
        <div className="mb-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullPitch((prev) => !prev);
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#2D5F8A] hover:underline"
          >
            <ChatCircleText size={13} />
            <span>{showFullPitch ? "Hide Tailored Pitch" : "Preview AI Outreach Pitch"}</span>
          </button>

          {showFullPitch && (
            <div className="mt-2 p-2.5 rounded-xl bg-white border border-[#2D5F8A]/30 text-[11px] text-[#16213A] leading-relaxed shadow-2xs animate-in fade-in duration-100">
              <span className="text-[9px] font-bold text-[#2D5F8A] uppercase tracking-wider block mb-1">
                Generated Outreach DM:
              </span>
              <p className="italic text-[#5B6478]">&ldquo;{post.tailoredPitch}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Primary 1-Click Action */}
      <div className="pt-3 border-t border-[#E5E1D8] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleCopyPitchOnly}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B6478] hover:text-[#16213A] transition-colors py-1.5 px-2 rounded-lg hover:bg-[#FAF7F0]"
          title="Copy pitch only to clipboard"
        >
          <Copy size={13} />
          <span>{pitchCopied ? "Copied!" : "Copy Pitch"}</span>
        </button>

        {/* 1-Click: Open Post + Copy Pitch */}
        <button
          type="button"
          onClick={handleApplyAndCopyPitch}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-bold transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
        >
          <span>Apply via Post + Pitch</span>
          <ArrowSquareOut size={14} />
        </button>
      </div>
    </div>
  );
}

