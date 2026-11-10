import type { ResumeParsedData } from "@/lib/validations/resume";
import type { CompanyContextBrief } from "@/services/ai/companyResearchService";
import type { CoverLetterTone, CoverLetterParagraphs } from "@/services/ai/coverLetterGenerator";
import type { AtsPreflightAuditReport } from "@/services/parsing/formattingValidator";
import type { JDDecomposition, TailoredRoleExperience } from "@/services/ai/bulletRewriter";

export interface TailorTargetJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryRange?: string;
  remoteType: "Remote" | "Hybrid" | "On-site";
  atsPlatform: "Greenhouse" | "Lever" | "Ashby" | "Workday" | "Other";
  applicationUrl: string;
  fitScore: number;
  description: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  implicitSkills: string[];
  senioritySignals: string[];
}

export interface TailorSessionState {
  job: TailorTargetJob;
  masterProfile: ResumeParsedData;
  decomposedJd: JDDecomposition;
  tailoredRoles: TailoredRoleExperience[];
  coverLetter: {
    tone: CoverLetterTone;
    paragraphs: CoverLetterParagraphs;
    wordCount: number;
    companyBrief: CompanyContextBrief;
    isClicheFree: boolean;
    violationsDetected: string[];
  };
  auditReport: AtsPreflightAuditReport;
}

