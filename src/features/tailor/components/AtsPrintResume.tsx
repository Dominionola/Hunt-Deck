"use client";

import React from "react";
import type { ResumeParsedData } from "@/lib/validations/resume";
import type { TailoredRoleExperience } from "@/services/ai/bulletRewriter";

interface AtsPrintResumeProps {
  profile: ResumeParsedData;
  tailoredRoles: TailoredRoleExperience[];
  targetRoleTitle: string;
}

/**
 * Pure, single-column, machine-readable ATS resume layout.
 * Styled specifically for standard ATS parsers and printing.
 * No tables, no multi-column floats, no icons, no graphics.
 */
export function AtsPrintResume({
  profile,
  tailoredRoles,
  targetRoleTitle,
}: AtsPrintResumeProps) {
  return (
    <div
      id="ats-printable-resume"
      className="p-8 sm:p-12 bg-white text-black font-sans max-w-[800px] mx-auto border border-[#E5E1D8] shadow-xs print:border-none print:shadow-none print:p-0 print:max-w-none text-[11pt] leading-[1.45]"
      style={{ fontFamily: "Arial, Calibri, sans-serif" }}
    >
      {/* 1. Header (Name + Contact Details) */}
      <header className="border-b-2 border-black pb-3 mb-5 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-black mb-1">
          {profile.fullName}
        </h1>
        {targetRoleTitle && (
          <div className="text-xs font-semibold text-neutral-800 tracking-wider uppercase mb-1">
            Target Role: {targetRoleTitle}
          </div>
        )}
        <div className="text-xs text-neutral-800 space-x-2">
          {profile.location && <span>{profile.location}</span>}
          {profile.phone && <span>• {profile.phone}</span>}
          {profile.email && <span>• {profile.email}</span>}
        </div>
      </header>

      {/* 2. Professional Summary */}
      {profile.summary && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-2">
            Professional Summary
          </h2>
          <p className="text-xs text-neutral-900 leading-relaxed">
            {profile.summary}
          </p>
        </section>
      )}

      {/* 3. Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-2">
            Technical Skills
          </h2>
          <div className="text-xs text-neutral-900 leading-relaxed">
            <span className="font-semibold">Core Competencies: </span>
            {profile.skills.join(", ")}
          </div>
        </section>
      )}

      {/* 4. Work Experience */}
      <section className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-2">
          Work Experience
        </h2>
        <div className="space-y-4">
          {tailoredRoles.map((role, idx) => (
            <article key={idx} className="space-y-1">
              <div className="flex justify-between items-baseline text-xs font-bold text-black">
                <span>{role.title} — {role.company}</span>
                <span className="font-normal text-neutral-800">
                  {role.startDate} – {role.endDate || (role.isCurrent ? "Present" : "")}
                </span>
              </div>
              <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-neutral-900">
                {role.bullets.map((b, bIdx) => (
                  <li key={bIdx} className="leading-snug">
                    {b.rewrittenBullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* 5. Education */}
      {profile.education && profile.education.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-2">
            Education
          </h2>
          <div className="space-y-2">
            {profile.education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline text-xs text-black">
                <div>
                  <span className="font-bold">{edu.degree}</span>
                  {edu.fieldOfStudy && <span> in {edu.fieldOfStudy}</span>}
                  <span>, {edu.institution}</span>
                </div>
                {edu.graduationYear && (
                  <span className="text-neutral-800">{edu.graduationYear}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Projects */}
      {profile.projects && profile.projects.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-2">
            Selected Technical Projects
          </h2>
          <div className="space-y-2">
            {profile.projects.map((proj, idx) => (
              <div key={idx} className="text-xs text-neutral-900">
                <span className="font-bold text-black">{proj.name}</span>: {proj.description} (
                <span className="italic">{proj.technologies.join(", ")}</span>)
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
