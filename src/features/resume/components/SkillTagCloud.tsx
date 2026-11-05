"use client";

import React, { useState } from "react";
import { Plus, X, Tag } from "@phosphor-icons/react";

interface SkillTagCloudProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  readOnly?: boolean;
}

export function SkillTagCloud({ skills, onChange, readOnly = false }: SkillTagCloudProps) {
  const [newSkillInput, setNewSkillInput] = useState("");

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;

    if (!skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...skills, trimmed]);
    }
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Tag size={18} className="text-[#2D5F8A]" />
          <h4 className="text-sm font-semibold text-[#16213A] uppercase tracking-wider">
            Verified Skills Cloud ({skills.length})
          </h4>
        </div>
        <span className="text-xs text-[#5B6478]">
          Used for 1536-dim ATS vector similarity matching
        </span>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[64px] p-4 bg-[#FAF7F0]/40 border border-[#E5E1D8] rounded-xl">
        {skills.length === 0 ? (
          <p className="text-xs text-[#5B6478] italic self-center">
            No skills detected yet. Upload your resume or add key competencies below.
          </p>
        ) : (
          skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-[#E5E1D8] text-xs font-medium text-[#16213A] rounded-md shadow-xs transition-colors hover:border-[#2D5F8A]/50"
            >
              <span>{skill}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-[#5B6478] hover:text-rose-600 focus:outline-hidden transition-colors"
                  aria-label={`Remove ${skill}`}
                >
                  <X size={12} weight="bold" />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {!readOnly && (
        <form onSubmit={handleAddSkill} className="flex gap-2">
          <input
            type="text"
            value={newSkillInput}
            onChange={(e) => setNewSkillInput(e.target.value)}
            placeholder="Add missing skill (e.g., Kubernetes, Next.js, Redis)..."
            className="flex-1 px-3.5 py-2 text-xs bg-white border border-[#E5E1D8] rounded-lg text-[#16213A] placeholder-[#5B6478]/60 focus:outline-hidden focus:border-[#2D5F8A] transition-colors"
          />
          <button
            type="submit"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Add Skill</span>
          </button>
        </form>
      )}
    </div>
  );
}
