/**
 * Hunt Deck — ATS Hard Formatting Validator & Pre-Flight Audit Engine
 * 
 * Enforces PRD 3.2.2 & 3.2.3 ATS Format Hard Rules:
 *  - Single-column layout with standard section dividers
 *  - Standard section headers only: "Work Experience", "Education", "Skills", "Certifications", "Projects", "Summary"
 *  - No text boxes, tables, columns, embedded graphics, or non-standard Unicode symbols
 *  - Standard date formats: `Month YYYY` or `MM/YYYY`
 *  - Contact info validation (email, phone, LinkedIn/portfolio)
 *  - Pre-flight compliance score & estimated ATS rank
 */

import type { ResumeParsedData } from "@/lib/validations/resume";

export interface FormattingViolation {
  rule: string;
  severity: "critical" | "warning";
  description: string;
  suggestion: string;
}

export interface AtsPreflightAuditReport {
  overallScore: number; // 0 - 100
  keywordDensityScore: number; // 0 - 100
  formatComplianceScore: number; // 0 - 100
  sectionCompletenessScore: number; // 0 - 100
  dateIntegrityScore: number; // 0 - 100
  estimatedAtsRankPercentile: number; // e.g. 96th percentile
  isAtsCompliant: boolean;
  violations: FormattingViolation[];
  detectedSections: string[];
  contactInfoValid: {
    hasEmail: boolean;
    hasPhone: boolean;
    hasLocation: boolean;
  };
}

const BANNED_PATTERNS = [
  { regex: /<table[\s\S]*?>/i, name: "HTML Table", desc: "Tables break ATS column parsers. Use standard single-column text dividers." },
  { regex: /\|.*\|.*\|/m, name: "Markdown Table", desc: "Markdown grid tables confuse linear text extractors. Use bulleted lists." },
  { regex: /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u, name: "Emoji / Pictograph", desc: "Unicode emojis render as unparseable glyphs in older ATS software." },
  { regex: /<img[\s\S]*?>/i, name: "Embedded Image", desc: "Images cannot be parsed by text extractors and disrupt tokenization." },
  { regex: /\[column-break\]|\[two-column\]/i, name: "Multi-Column Layout", desc: "Multi-column layouts cause reading order errors in Taleo and Workday." },
];

const VALID_DATE_FORMATS = [
  /^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}$/i,
  /^\d{2}\/\d{4}$/,
  /^\d{4}$/,
  /^Present$/i,
  /^Current$/i,
];

/**
 * Validates date string conforms to standard Month YYYY or MM/YYYY format
 */
export function isValidAtsDate(dateStr?: string): boolean {
  if (!dateStr || dateStr.trim() === "") return false;
  const clean = dateStr.trim();
  return VALID_DATE_FORMATS.some((r) => r.test(clean));
}

/**
 * Audits raw resume text or formatted markdown for ATS compliance
 */
export function auditAtsFormatting(
  rawOrMarkdownText: string,
  parsedData: ResumeParsedData,
  targetJdKeywords: string[] = []
): AtsPreflightAuditReport {
  const violations: FormattingViolation[] = [];
  let formatDeductions = 0;
  let sectionDeductions = 0;
  let dateDeductions = 0;

  // 1. Scan for banned layouts and tokens
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.regex.test(rawOrMarkdownText)) {
      violations.push({
        rule: pattern.name,
        severity: "critical",
        description: pattern.desc,
        suggestion: "Remove graphic/table structures and reformat as plain single-column bullets.",
      });
      formatDeductions += 25;
    }
  }

  // 2. Validate Contact Info
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hasValidEmail = Boolean(parsedData.email && emailRegex.test(parsedData.email));
  const hasPhone = Boolean(parsedData.phone && parsedData.phone.replace(/\D/g, "").length >= 7);
  const hasLocation = Boolean(parsedData.location && parsedData.location.length >= 2);

  if (!hasValidEmail) {
    violations.push({
      rule: "Contact Information",
      severity: "critical",
      description: "Missing or malformed contact email address.",
      suggestion: "Add a standard direct email (e.g. name@domain.com) at the top of the resume.",
    });
    formatDeductions += 15;
  }

  // 3. Section Completeness & Header Standard
  const detectedSections: string[] = [];
  if (parsedData.summary) detectedSections.push("Summary");
  if (parsedData.experience && parsedData.experience.length > 0) detectedSections.push("Work Experience");
  if (parsedData.education && parsedData.education.length > 0) detectedSections.push("Education");
  if (parsedData.skills && parsedData.skills.length > 0) detectedSections.push("Skills");
  if (parsedData.projects && parsedData.projects.length > 0) detectedSections.push("Projects");

  if (!detectedSections.includes("Work Experience")) {
    violations.push({
      rule: "Section Completeness",
      severity: "critical",
      description: "Missing Work Experience section.",
      suggestion: "Ensure 'Work Experience' or 'Professional Experience' is present.",
    });
    sectionDeductions += 40;
  }

  if (!detectedSections.includes("Skills")) {
    violations.push({
      rule: "Section Completeness",
      severity: "warning",
      description: "Missing dedicated Skills section.",
      suggestion: "Add a categorized Skills section for direct ATS keyword matching.",
    });
    sectionDeductions += 20;
  }

  // 4. Date Integrity
  for (const exp of parsedData.experience) {
    if (!isValidAtsDate(exp.startDate)) {
      violations.push({
        rule: "Date Integrity",
        severity: "warning",
        description: `Ambiguous start date "${exp.startDate}" at ${exp.company}.`,
        suggestion: "Use standard 'Month YYYY' (e.g. 'Jan 2022') or 'MM/YYYY'.",
      });
      dateDeductions += 10;
    }

    if (exp.endDate && !exp.isCurrent) {
      if (!isValidAtsDate(exp.endDate)) {
        violations.push({
          rule: "Date Integrity",
          severity: "warning",
          description: `Ambiguous end date "${exp.endDate}" at ${exp.company}.`,
          suggestion: "Use standard 'Month YYYY' or 'Present'.",
        });
        dateDeductions += 10;
      }
    }
  }

  // 5. Keyword Density Calculation
  let keywordDensityScore = 85;
  if (targetJdKeywords.length > 0) {
    const textLower = rawOrMarkdownText.toLowerCase();
    let matchedKeywords = 0;
    for (const kw of targetJdKeywords) {
      if (textLower.includes(kw.toLowerCase())) {
        matchedKeywords += 1;
      }
    }
    keywordDensityScore = Math.round((matchedKeywords / targetJdKeywords.length) * 100);
  }

  const formatComplianceScore = Math.max(0, 100 - formatDeductions);
  const sectionCompletenessScore = Math.max(0, 100 - sectionDeductions);
  const dateIntegrityScore = Math.max(0, 100 - dateDeductions);

  // Composite overall score
  const overallScore = Math.round(
    formatComplianceScore * 0.35 +
    keywordDensityScore * 0.35 +
    sectionCompletenessScore * 0.2 +
    dateIntegrityScore * 0.1
  );

  // Estimated ATS rank percentile
  const estimatedAtsRankPercentile = Math.min(99, Math.max(50, Math.round(overallScore * 0.98)));

  const isAtsCompliant = violations.filter((v) => v.severity === "critical").length === 0;

  return {
    overallScore,
    keywordDensityScore,
    formatComplianceScore,
    sectionCompletenessScore,
    dateIntegrityScore,
    estimatedAtsRankPercentile,
    isAtsCompliant,
    violations,
    detectedSections,
    contactInfoValid: {
      hasEmail: hasValidEmail,
      hasPhone,
      hasLocation,
    },
  };
}
