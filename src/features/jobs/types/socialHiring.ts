export interface SocialHiringPost {
  id: string;
  authorName: string;
  authorRole: string;
  authorCompany: string;
  authorAvatarUrl?: string;
  platform: "linkedin" | "x" | "threads";
  originalPostUrl: string;
  targetRole: string;
  location: string;
  workArrangement: "remote" | "hybrid" | "onsite";
  postedAt: string;
  fitScore: number;
  postContent: string;
  highlightedKeywords: string[];
  tailoredPitch: string;
  matchingSkills: string[];
}

