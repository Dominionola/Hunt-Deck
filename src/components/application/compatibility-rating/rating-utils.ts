import type { ChipColor } from "@/components/base/badges/chip";
import type { MeterTone } from "@/components/base/meter/meter";

export interface CompatibilityTier {
  tone: MeterTone;
  chipColor: ChipColor;
  bandLabel: string;
}

/**
 * Maps a 0–100 compatibility or similarity score to BoardUI Meter and Chip
 * semantic tokens.
 */
export function getCompatibilityTier(score: number): CompatibilityTier {
  if (score >= 80) {
    return {
      tone: "success",
      chipColor: "lime",
      bandLabel: "Strong match",
    };
  }
  if (score >= 60) {
    return {
      tone: "accent",
      chipColor: "blue",
      bandLabel: "Moderate match",
    };
  }
  return {
    tone: "warning",
    chipColor: "yellow",
    bandLabel: "Low match",
  };
}

/**
 * Clamps and rounds numeric rating inputs into a bounded integer percentage.
 */
export function clampCompatibilityScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
