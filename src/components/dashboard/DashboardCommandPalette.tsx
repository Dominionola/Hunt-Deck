"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  RiCompass3Line,
  RiFileAddLine,
  RiFileTextLine,
  RiHome5Line,
  RiKanbanView,
  RiSearchLine,
  RiSendPlaneLine,
  RiSparklingFill,
  RiUserVoiceLine,
} from "@remixicon/react";
import {
  CommandPalette,
  CommandPaletteItem,
  CommandPaletteSection,
} from "@/components/base/command-palette/command-palette";
import { toast } from "@/components/base/toast/toast";
import { useDashboard } from "./DashboardContext";

export function DashboardCommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useDashboard();

  const handleAction = (key: string | number) => {
    setCommandPaletteOpen(false);

    switch (key) {
      case "nav-home":
        router.push("/dashboard");
        break;
      case "nav-jobs":
        router.push("/dashboard/jobs");
        break;
      case "nav-applications":
        router.push("/dashboard/applications");
        break;
      case "nav-tailor":
        router.push("/dashboard/tailor");
        break;
      case "nav-profile":
        router.push("/dashboard/resume");
        break;
      case "run-radar":
        toast.info("Job Radar Scan Triggered", {
          description: "Scanning Greenhouse, Lever, and Ashby for fresh roles…",
        });
        break;
      case "upload-resume":
        toast.info("Master Profile", {
          description: "Navigating to resume upload and entity extraction…",
        });
        router.push("/dashboard/resume");
        break;
      case "tailor-stripe":
        toast.success("Tailored Application Queued", {
          description: "Bespoke resume & cover letter generation initiated for Stripe (Staff Systems Engineer).",
        });
        router.push("/dashboard/tailor/stripe-staff-systems");
        break;
      case "followup-vercel":
        toast.success("Follow-up Drafted", {
          description: "Sarah Jenkins follow-up email template ready in Pipeline CRM.",
        });
        break;
      case "interview-amazon":
        toast.info("STAR+R Practice Loop", {
          description: "AWS Leadership Principle scenarios ready for mock interview rehearsal.",
        });
        break;
      default:
        break;
    }
  };

  return (
    <CommandPalette
      isOpen={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      onAction={handleAction}
      shortcut="k"
      placeholder="Type a command or jump to workspace…"
    >
      <CommandPaletteSection title="Quick Actions">
        <CommandPaletteItem
          id="run-radar"
          icon={RiSparklingFill}
          shortcut="⌘R"
          description="Trigger live ATS crawler scan"
        >
          Scan Job Radar Now
        </CommandPaletteItem>
        <CommandPaletteItem
          id="upload-resume"
          icon={RiFileAddLine}
          shortcut="⌘U"
          description="Ingest new resume PDF or DOCX"
        >
          Upload Master Resume
        </CommandPaletteItem>
      </CommandPaletteSection>

      <CommandPaletteSection title="Priority Application Moves">
        <CommandPaletteItem
          id="tailor-stripe"
          icon={RiSendPlaneLine}
          shortcut="1"
          description="94% fit · 14m ago"
        >
          Tailor for Stripe (Staff Systems Engineer)
        </CommandPaletteItem>
        <CommandPaletteItem
          id="followup-vercel"
          icon={RiCompass3Line}
          shortcut="2"
          description="Sarah Jenkins · Due today"
        >
          Follow Up with Vercel (Edge Platform)
        </CommandPaletteItem>
        <CommandPaletteItem
          id="interview-amazon"
          icon={RiUserVoiceLine}
          shortcut="3"
          description="Technical loop in 2 hours"
        >
          Review AWS STAR+R Interview Prep
        </CommandPaletteItem>
      </CommandPaletteSection>

      <CommandPaletteSection title="Workspace Navigation">
        <CommandPaletteItem
          id="nav-home"
          icon={RiHome5Line}
          description="High-conviction cockpit"
        >
          Mission Control
        </CommandPaletteItem>
        <CommandPaletteItem
          id="nav-jobs"
          icon={RiSearchLine}
          description="Live vector-matched feed"
        >
          Job Discovery Feed
        </CommandPaletteItem>
        <CommandPaletteItem
          id="nav-applications"
          icon={RiKanbanView}
          description="Kanban pipeline CRM"
        >
          Application Pipeline CRM
        </CommandPaletteItem>
        <CommandPaletteItem
          id="nav-tailor"
          icon={RiFileTextLine}
          description="3-pass ATS bullet rewriter & bespoke cover letter"
        >
          ATS Application Tailor
        </CommandPaletteItem>
        <CommandPaletteItem
          id="nav-profile"
          icon={RiFileAddLine}
          description="Verified skills cloud & Golden Record"
        >
          Master Candidate Profile
        </CommandPaletteItem>
      </CommandPaletteSection>
    </CommandPalette>
  );
}

