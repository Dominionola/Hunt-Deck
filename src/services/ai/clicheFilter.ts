/**
 * Hunt Deck — Banned Clichés & Anti-Bot Cover Letter Filter
 * 
 * Enforces PRD 3.3.3 Non-Negotiable Prohibitions:
 *  - "I am writing to express my enthusiastic interest in..."
 *  - "I am passionate about..."
 *  - "I would be a great fit because..."
 *  - "Please find my resume attached..."
 *  - Prohibits "I " as the very first word of the entire letter
 *  - Hard-filters hollow buzzwords ("results-driven", "team player", "self-starter", "rockstar")
 */

export interface ClicheValidationResult {
  isValid: boolean;
  violations: string[];
  scrubbedText: string;
}

export const BANNED_PHRASES: Array<{ pattern: RegExp; name: string; replacement: string }> = [
  {
    pattern: /i am writing to (?:express my (?:enthusiastic )?interest in|apply for)/i,
    name: "Generic 'I am writing to apply' opening",
    replacement: "Following",
  },
  {
    pattern: /i am passionate about/i,
    name: "'I am passionate about' bot cliché",
    replacement: "My engineering focus centers on",
  },
  {
    pattern: /i would be a (?:great|perfect) fit because/i,
    name: "'I would be a great fit' cliché",
    replacement: "My technical background aligns with these priorities through",
  },
  {
    pattern: /please find my resume attached/i,
    name: "'Please find my resume attached' formality filler",
    replacement: "My background and quantified milestones demonstrate",
  },
  {
    pattern: /\b(?:fast-paced environment|dynamic environment)\b/i,
    name: "'Fast-paced environment' buzzword",
    replacement: "high-growth roadmap",
  },
  {
    pattern: /\bresults-driven\b/i,
    name: "'Results-driven' hollow superlative",
    replacement: "metrics-focused",
  },
  {
    pattern: /\bteam player\b/i,
    name: "'Team player' buzzword",
    replacement: "collaborative partner",
  },
  {
    pattern: /\bself-starter\b/i,
    name: "'Self-starter' buzzword",
    replacement: "autonomous builder",
  },
  {
    pattern: /\b(?:rockstar|ninja|guru|wizard)\b/i,
    name: "Tech colloquialisms ('rockstar/ninja')",
    replacement: "specialist",
  },
  {
    pattern: /\bthink(?:ing)? outside the box\b/i,
    name: "'Thinking outside the box' cliché",
    replacement: "solving foundational architectural problems",
  },
  {
    pattern: /\bproven track record\b/i,
    name: "'Proven track record' filler",
    replacement: "demonstrated history",
  },
];

/**
 * Validates whether a cover letter text contains prohibited clichés or openings
 */
export function validateCoverLetterAntiCliches(letterText: string): ClicheValidationResult {
  const violations: string[] = [];
  const trimmed = letterText.trim();

  // Rule: Prohibit "I " as the very first word of the letter
  if (/^I\s+/i.test(trimmed)) {
    violations.push("Letter begins with 'I' as the first word. Cover letters must lead with company context, an engineering hook, or an industry observation.");
  }

  // Check all banned phrases
  for (const item of BANNED_PHRASES) {
    if (item.pattern.test(trimmed)) {
      violations.push(`Detected prohibited phrase: "${item.name}"`);
    }
  }

  const scrubbedText = scrubBannedCliches(trimmed);

  return {
    isValid: violations.length === 0,
    violations,
    scrubbedText,
  };
}

/**
 * Automatically scrubs and refactors banned phrases from the letter text
 */
export function scrubBannedCliches(text: string): string {
  let cleaned = text.trim();

  // If starts with "I ", reframe first sentence
  if (/^I\s+have\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^I\s+have\s+/i, "Having ");
  } else if (/^I\s+am\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^I\s+am\s+/i, "As an engineer, I am ");
  } else if (/^I\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^I\s+/i, "In recent years, I ");
  }

  // Replace each banned pattern with professional alternative
  for (const item of BANNED_PHRASES) {
    cleaned = cleaned.replace(item.pattern, item.replacement);
  }

  return cleaned;
}

