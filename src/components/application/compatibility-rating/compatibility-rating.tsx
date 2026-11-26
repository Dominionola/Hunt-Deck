"use client";

import { RiInformationLine } from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { Meter } from "@/components/base/meter/meter";
import { Popover, PopoverHeader, PopoverTrigger } from "@/components/base/popover/popover";
import type { ProgressSize } from "@/components/base/progress/progress";
import { cx } from "@/utils/cx";
import { clampCompatibilityScore, getCompatibilityTier } from "./rating-utils";

export { clampCompatibilityScore, getCompatibilityTier } from "./rating-utils";
export type { CompatibilityTier } from "./rating-utils";

export interface CompatibilityFactor {
  label: string;
  value: number;
  weight?: string;
}

export interface CompatibilityRatingProps {
  /** Compatibility or similarity score on a 0–100 scale. Omit or pass null when unranked. */
  score?: number | null;
  /** Primary label announced by the meter and displayed above the bar. */
  label?: string;
  /** Label shown inside a neutral Chip when no score is available. */
  unrankedLabel?: string;
  /** Optional supporting detail shown inside the info popover when unranked. */
  unrankedExplanation?: string;
  /** Optional explanation shown inside an accessible info popover. */
  explanation?: string;
  /** Optional multi-factor breakdown rendered inline (breakdown variant) or inside the popover. */
  factors?: CompatibilityFactor[];
  /** Visual density: full meter row, compact header card, or full breakdown panel. */
  variant?: "meter" | "compact" | "breakdown";
  /** Track thickness passed through to BoardUI Meter. */
  size?: ProgressSize;
  className?: string;
}

function FactorMeters({ factors }: { factors: CompatibilityFactor[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {factors.map((factor) => {
        const clamped = clampCompatibilityScore(factor.value);
        const factorTier = getCompatibilityTier(clamped);
        const factorLabel = factor.weight ? `${factor.label} (${factor.weight})` : factor.label;
        return (
          <Meter
            key={factor.label}
            label={factorLabel}
            value={clamped}
            valueLabel={`${clamped}%`}
            tone={factorTier.tone}
            size="sm"
          />
        );
      })}
    </div>
  );
}

function InfoPopover({
  label,
  explanation,
  factors,
}: {
  label: string;
  explanation?: string;
  factors?: CompatibilityFactor[];
}) {
  if (!explanation && (!factors || factors.length === 0)) return null;

  return (
    <PopoverTrigger>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        iconOnly
        leadingIcon={RiInformationLine}
        aria-label={`Explain ${label}`}
        onClick={(event) => event.stopPropagation()}
        className="min-h-11 min-w-11 sm:min-h-7 sm:min-w-7 text-text-tertiary hover:text-text-primary"
      />
      <Popover showArrow className="w-80">
        <PopoverHeader title={label} description={explanation} />
        {factors && factors.length > 0 ? <FactorMeters factors={factors} /> : null}
      </Popover>
    </PopoverTrigger>
  );
}

/**
 * Unified compatibility and resume-similarity indicator built on BoardUI's
 * React Aria `Meter` (`role="meter"`), `Chip`, and `Popover`.
 */
export function CompatibilityRating({
  score,
  label = "Compatibility",
  unrankedLabel = "Not ranked",
  unrankedExplanation,
  explanation,
  factors,
  variant = "meter",
  size = "sm",
  className,
}: CompatibilityRatingProps) {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return (
      <div className={cx("flex items-center justify-between gap-2", className)}>
        <div className="flex flex-wrap items-center gap-2">
          <Chip variant="caption" color="soft">
            {unrankedLabel}
          </Chip>
          <span className="text-caption-1-regular text-text-tertiary">{label}</span>
        </div>
        <InfoPopover label={label} explanation={unrankedExplanation ?? explanation} />
      </div>
    );
  }

  const normalized = clampCompatibilityScore(score);
  const tier = getCompatibilityTier(normalized);

  if (variant === "compact") {
    return (
      <div
        className={cx(
          "flex min-w-[116px] flex-col gap-1.5 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2",
          className
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption-1-semibold text-text-secondary">{label}</span>
          <div className="flex items-center gap-1">
            <span className="text-body-medium font-semibold text-text-primary tabular-nums">
              {normalized}%
            </span>
            <InfoPopover label={label} explanation={explanation} factors={factors} />
          </div>
        </div>
        <Meter
          aria-label={label}
          value={normalized}
          showValueLabel={false}
          tone={tier.tone}
          size="sm"
        />
      </div>
    );
  }

  if (variant === "breakdown") {
    return (
      <div
        className={cx(
          "space-y-4 rounded-xl border border-border-button-default bg-background-secondary-default p-4",
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-caption-1-semibold uppercase tracking-wide text-text-secondary">
            {label}
          </span>
          <Chip variant="caption" color={tier.chipColor}>
            {tier.bandLabel}
          </Chip>
        </div>
        <Meter
          label="Overall fit"
          value={normalized}
          valueLabel={`${normalized}%`}
          tone={tier.tone}
          size="md"
          description={explanation}
        />
        {factors && factors.length > 0 ? (
          <div className="border-t border-separator-border pt-3">
            <FactorMeters factors={factors} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cx(
        "rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2.5",
        className
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-caption-1-semibold text-text-secondary">{label}</span>
          <InfoPopover label={label} explanation={explanation} factors={factors} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Chip variant="caption" color={tier.chipColor}>
            {tier.bandLabel}
          </Chip>
          <span className="text-body-medium font-semibold text-text-primary tabular-nums">
            {normalized}%
          </span>
        </div>
      </div>
      <Meter
        aria-label={label}
        value={normalized}
        showValueLabel={false}
        tone={tier.tone}
        size={size}
      />
    </div>
  );
}
