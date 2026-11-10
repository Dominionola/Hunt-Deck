/**
 * Hunt Deck — LinkedIn Skills Gap & Endorsement Strategy Analyzer
 * 
 * Implements PRD Module 12.4.5:
 *  - Cross-references LinkedIn profile skills against top 20 target JD skills
 *  - Identifies high-priority missing skills from Master Profile (zero fabrication)
 *  - Determines optimal Top-3 Pinned LinkedIn skills for algorithmic weighting
 *  - Generates collegiate peer-to-peer endorsement request templates
 */

export interface SkillGapItem {
  skill: string;
  category: "Languages" | "Frameworks" | "Cloud" | "Architecture" | "Tools";
  marketFrequencyPercent: number; // e.g. 85% of JDs require this
  isCurrentlyOnProfile: boolean;
  isInMasterResume: boolean;
  actionRequired: "ADD_TO_LINKEDIN" | "PIN_TO_TOP_3" | "REQUEST_ENDORSEMENT" | "OPTIMAL";
}

export interface EndorsementOutreachTemplate {
  colleagueName: string;
  relationship: "former_manager" | "peer_engineer" | "cross_functional";
  targetSkills: string[];
  message: string;
  characterCount: number;
}

export interface SkillsStrategyReport {
  overallCoveragePercent: number;
  matchedSkillsCount: number;
  missingSkillsCount: number;
  top3RecommendedPinned: string[];
  skillsList: SkillGapItem[];
  endorsementTemplates: EndorsementOutreachTemplate[];
}

const DEFAULT_TARGET_ROLE_SKILLS: Array<{
  skill: string;
  category: "Languages" | "Frameworks" | "Cloud" | "Architecture" | "Tools";
  marketFrequency: number;
}> = [
  { skill: "TypeScript", category: "Languages", marketFrequency: 92 },
  { skill: "Distributed Systems", category: "Architecture", marketFrequency: 88 },
  { skill: "PostgreSQL", category: "Cloud", marketFrequency: 84 },
  { skill: "React", category: "Frameworks", marketFrequency: 82 },
  { skill: "Node.js", category: "Languages", marketFrequency: 80 },
  { skill: "AWS", category: "Cloud", marketFrequency: 78 },
  { skill: "Docker", category: "Cloud", marketFrequency: 75 },
  { skill: "Go", category: "Languages", marketFrequency: 72 },
  { skill: "System Architecture", category: "Architecture", marketFrequency: 70 },
  { skill: "Microservices", category: "Architecture", marketFrequency: 68 },
  { skill: "Kubernetes", category: "Cloud", marketFrequency: 65 },
  { skill: "GraphQL", category: "Frameworks", marketFrequency: 60 },
  { skill: "Redis", category: "Cloud", marketFrequency: 58 },
  { skill: "CI/CD Pipelines", category: "Tools", marketFrequency: 55 },
  { skill: "Kafka", category: "Cloud", marketFrequency: 52 },
];

/**
 * Analyzes skills gap between LinkedIn profile, verified resume, and target JDs
 */
export function analyzeSkillsGap(
  linkedInSkillNames: string[],
  resumeVerifiedSkills: string[]
): SkillsStrategyReport {
  const profileSet = new Set(linkedInSkillNames.map((s) => s.trim().toLowerCase()));
  const resumeSet = new Set(resumeVerifiedSkills.map((s) => s.trim().toLowerCase()));

  const skillsList: SkillGapItem[] = DEFAULT_TARGET_ROLE_SKILLS.map((item) => {
    const norm = item.skill.toLowerCase();
    const isCurrentlyOnProfile = profileSet.has(norm);
    const isInMasterResume = resumeSet.has(norm);

    let actionRequired: SkillGapItem["actionRequired"] = "OPTIMAL";
    if (!isCurrentlyOnProfile && isInMasterResume) {
      actionRequired = "ADD_TO_LINKEDIN";
    } else if (isCurrentlyOnProfile && item.marketFrequency >= 80) {
      actionRequired = "PIN_TO_TOP_3";
    } else if (isCurrentlyOnProfile) {
      actionRequired = "REQUEST_ENDORSEMENT";
    }

    return {
      skill: item.skill,
      category: item.category,
      marketFrequencyPercent: item.marketFrequency,
      isCurrentlyOnProfile,
      isInMasterResume,
      actionRequired,
    };
  });

  const matched = skillsList.filter((s) => s.isCurrentlyOnProfile);
  const missing = skillsList.filter((s) => !s.isCurrentlyOnProfile && s.isInMasterResume);

  const coveragePercent = Math.round((matched.length / skillsList.length) * 100);

  // Top 3 pinned: prioritize highest market frequency skills that are in profile or resume
  const top3RecommendedPinned = skillsList
    .filter((s) => s.isCurrentlyOnProfile || s.isInMasterResume)
    .sort((a, b) => b.marketFrequencyPercent - a.marketFrequencyPercent)
    .slice(0, 3)
    .map((s) => s.skill);

  // Generate endorsement request templates
  const endorsementTemplates = generateEndorsementTemplates(
    matched.slice(0, 3).map((m) => m.skill)
  );

  return {
    overallCoveragePercent: coveragePercent,
    matchedSkillsCount: matched.length,
    missingSkillsCount: missing.length,
    top3RecommendedPinned,
    skillsList,
    endorsementTemplates,
  };
}

/**
 * Generates collegiate endorsement outreach templates (< 100 words)
 */
export function generateEndorsementTemplates(
  skillsToHighlight: string[]
): EndorsementOutreachTemplate[] {
  const skillsStr = skillsToHighlight.join(" and ");

  return [
    {
      colleagueName: "Sarah",
      relationship: "peer_engineer",
      targetSkills: skillsToHighlight,
      message: `Hi Sarah! Hope you're doing well. I'm updating my LinkedIn profile to highlight our distributed systems work. Would you be open to endorsing me for ${skillsStr}? Happy to return the favor on your top skills as well!`,
      characterCount: 228,
    },
    {
      colleagueName: "David",
      relationship: "former_manager",
      targetSkills: skillsToHighlight,
      message: `Hi David, hope all is great with you and the team! I'm refreshing my profile to better reflect my work in ${skillsStr}. If you have a quick moment, I'd really appreciate an endorsement for those areas. Thanks so much!`,
      characterCount: 227,
    },
  ];
}

