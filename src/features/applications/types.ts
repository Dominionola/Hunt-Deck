export type PipelineStage = "saved" | "tailored" | "applied" | "interviewing" | "offer";

export interface PipelineContact {
  name: string;
  role: string;
  email?: string;
  linkedInUrl?: string;
}

export interface PipelineApplication {
  id: string;
  company: string;
  role: string;
  location: string;
  workArrangement: "remote" | "hybrid" | "onsite";
  salary: string;
  fitScore: number;
  stage: PipelineStage;
  appliedDate?: string;
  followUpDueDate?: string;
  interviewDate?: string;
  contact?: PipelineContact;
  notes: string[];
  tags: string[];
  portalUrl?: string;
  source: "greenhouse" | "lever" | "ashby" | "social" | "direct";
}

export interface StageConfig {
  id: PipelineStage;
  label: string;
  color: string;
  accentBg: string;
  borderColor: string;
  description: string;
}

export const STAGES: StageConfig[] = [
  {
    id: "saved",
    label: "Saved / Radar",
    color: "#94b4ca",
    accentBg: "#EDF3F7",
    borderColor: "#C9D8E3",
    description: "Pinned for research and keyword gap analysis",
  },
  {
    id: "tailored",
    label: "Tailored & Ready",
    color: "#2d5f8a",
    accentBg: "#E3EDF5",
    borderColor: "#94B4CA",
    description: "Bespoke resume & cover letter pack synthesized",
  },
  {
    id: "applied",
    label: "Applied",
    color: "#16213a",
    accentBg: "#FAF7F0",
    borderColor: "#E5E1D8",
    description: "Submitted via ATS or direct hiring lead outreach",
  },
  {
    id: "interviewing",
    label: "Interviewing",
    color: "#d97706",
    accentBg: "#FEF3C7",
    borderColor: "#FDE68A",
    description: "Screening loops, technical tests, or leadership panels",
  },
  {
    id: "offer",
    label: "Offer / Closed",
    color: "#15803d",
    accentBg: "#DCFCE7",
    borderColor: "#BBF7D0",
    description: "Received offers, negotiation, or final closing",
  },
];

