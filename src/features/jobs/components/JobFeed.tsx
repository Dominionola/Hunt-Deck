"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RiRefreshLine,
  RiExternalLinkLine,
  RiEqualizerLine,
  RiCloseLine,
  RiBuildingLine,
  RiBriefcaseLine,
  RiStarLine,
} from "@remixicon/react";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { SearchField } from "@/components/base/search-field/search-field";
import { Skeleton, SkeletonText } from "@/components/base/skeleton/skeleton";
import { Chip } from "@/components/base/badges/chip";
import { CompatibilityRating } from "@/components/application/compatibility-rating/compatibility-rating";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import { jobListingResponseSchema, jobListingSchema, type JobListing } from "@/lib/validations/jobListing";
import type { RegionScope } from "@/lib/validations/job";
import type { ProfilePreferencesInput } from "@/lib/validations/profile";
import { getJobFreshness, POPULAR_TECH_STACK_FILTERS } from "@/services/jobs/techStackExtractor";
import { PreferencesDrawer } from "./PreferencesDrawer";
import { cx } from "@/utils/cx";
import { z } from "zod";

const panel = "rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6";
type FeedItem = JobListing & { publicSlug?: string; sourceName?: string };
type FeedState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: FeedItem[]; total: number; personalization?: string; expandedCount?: number };

const freehireResponseSchema = z.object({
  success: z.literal(true),
  totalAvailable: z.number().int().nonnegative(),
  items: z.array(
    jobListingSchema.extend({
      publicSlug: z.string(),
      sourceName: z.string(),
    })
  ),
});

type SuggestionsState = {
  targetTitles: string[];
  companies: string[];
  roles: string[];
};

const DEFAULT_PREFERENCES: ProfilePreferencesInput = {
  remotePreference: "ANY",
  preferredLocations: [],
  targetTitles: [],
  minSalary: null,
};

const ARRANGEMENT_LABELS: Record<ProfilePreferencesInput["remotePreference"], string> = {
  ANY: "Any arrangement",
  REMOTE_ONLY: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

export function JobFeed() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"recent" | "personalized">("personalized");
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [remoteOverride, setRemoteOverride] = useState<ProfilePreferencesInput["remotePreference"] | null>(null);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [selectedStack, setSelectedStack] = useState<string[]>([]);
  const [regionScope, setRegionScope] = useState<RegionScope>("ANY");
  const [locationFilter, setLocationFilter] = useState("");
  const [activeLocationQuery, setActiveLocationQuery] = useState("");

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsState>({
    targetTitles: [],
    companies: [],
    roles: [],
  });
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const preferencesQuery = useQuery({
    queryKey: ["profile", "preferences"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/profile/preferences", { signal });
      if (!res.ok) return DEFAULT_PREFERENCES;
      const data = (await res.json()) as { preferences?: ProfilePreferencesInput };
      return data.preferences ?? DEFAULT_PREFERENCES;
    },
    staleTime: 5 * 60_000,
  });

  const preferences = preferencesQuery.data ?? DEFAULT_PREFERENCES;
  const prefsLoaded = preferencesQuery.isSuccess;

  useEffect(() => {
    if (!suggestionsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [suggestionsOpen]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/jobs/suggestions?q=${encodeURIComponent(search.trim())}`,
            { signal: controller.signal }
          );
          if (!res.ok) return;
          const data = (await res.json()) as SuggestionsState;
          if (!controller.signal.aborted) {
            setSuggestions(data);
          }
        } catch {
          // Ignore non-critical autocomplete failure
        }
      })();
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, suggestionsOpen]);

  const feedQuery = useQuery({
    queryKey: [
      "jobs",
      "feed",
      mode,
      query,
      selectedTitles,
      selectedStack,
      regionScope,
      remoteOverride,
      activeLocationQuery,
      page,
      preferences.targetTitles[0] ?? "",
      preferences.remotePreference,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        limit: "20",
        page: String(page),
        ...(query ? { search: query } : {}),
        ...(selectedTitles.length > 0 ? { titles: selectedTitles.join(",") } : {}),
        ...(selectedStack.length > 0 ? { stack: selectedStack.join(",") } : {}),
        ...(regionScope !== "ANY" ? { regionScope } : {}),
        ...(remoteOverride ? { remoteType: remoteOverride } : {}),
        ...(activeLocationQuery ? { location: activeLocationQuery } : {}),
      });

      const response = await fetch(
        `/api/jobs${mode === "personalized" ? "/matches" : ""}?${params}`,
        { signal }
      );
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Your session expired. Sign in again."
            : "Job listings could not be loaded. Please retry."
        );
      }
      const localData = jobListingResponseSchema.parse(await response.json());

      const shouldExpandCatalog =
        page === 1 &&
        (localData.items.length < 12 || Boolean(query || activeLocationQuery || selectedTitles.length > 0));

      if (!shouldExpandCatalog) {
        return {
          items: localData.items as FeedItem[],
          total: localData.pagination.total,
          personalization: localData.personalization,
          expandedCount: undefined as number | undefined,
        };
      }

      const baseQuery =
        query ||
        selectedTitles.join(" OR ") ||
        preferences.targetTitles[0] ||
        "Software Engineer";
      const locationTerm =
        activeLocationQuery ||
        (regionScope === "US" ? "United States" : regionScope === "EMEA" ? "Europe" : "");
      const combinedQuery = [baseQuery, locationTerm, selectedStack.join(" ")]
        .filter(Boolean)
        .join(" ")
        .trim()
        .slice(0, 160);

      const effectiveWork = remoteOverride ?? preferences.remotePreference;
      const fhParams = new URLSearchParams({
        q: combinedQuery,
        limit: "12",
        offset: "0",
        ...(effectiveWork !== "ANY" ? { workMode: effectiveWork } : {}),
      });

      try {
        const fhRes = await fetch(`/api/jobs/freehire?${fhParams}`, { signal });
        if (!fhRes.ok) {
          return {
            items: localData.items as FeedItem[],
            total: localData.pagination.total,
            personalization: localData.personalization,
            expandedCount: undefined as number | undefined,
          };
        }
        const fhData = freehireResponseSchema.parse(await fhRes.json());
        const existingKeys = new Set(
          localData.items.map(
            (item) => `${item.company.trim().toLowerCase()}::${item.title.trim().toLowerCase()}`
          )
        );
        const supplemental = fhData.items.filter((item) => {
          const k = `${item.company.trim().toLowerCase()}::${item.title.trim().toLowerCase()}`;
          if (existingKeys.has(k)) return false;
          existingKeys.add(k);
          return true;
        });

        return {
          items: [...localData.items, ...supplemental] as FeedItem[],
          total: localData.pagination.total + supplemental.length,
          personalization: localData.personalization,
          expandedCount: supplemental.length > 0 ? supplemental.length : undefined,
        };
      } catch {
        return {
          items: localData.items as FeedItem[],
          total: localData.pagination.total,
          personalization: localData.personalization,
          expandedCount: undefined as number | undefined,
        };
      }
    },
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });

  const state: FeedState = feedQuery.isPending
    ? { status: "loading" }
    : feedQuery.isError
    ? {
        status: "error",
        message:
          feedQuery.error instanceof Error && !(feedQuery.error instanceof z.ZodError)
            ? feedQuery.error.message
            : "Job listings could not be loaded. Please retry.",
      }
    : {
        status: "ready",
        items: feedQuery.data.items,
        total: feedQuery.data.total,
        personalization: feedQuery.data.personalization,
        expandedCount: feedQuery.data.expandedCount,
      };

  const refresh = () => {
    setSaveError(null);
    void feedQuery.refetch();
  };

  const saveAndTailorJob = async (publicSlug: string) => {
    setSavingSlug(publicSlug);
    setSaveError(null);
    try {
      const response = await fetch("/api/jobs/freehire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicSlug }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Could not import posting for tailoring.");
      }
      const data = z.object({ jobId: z.string().min(1) }).parse(await response.json());
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push(`/dashboard/tailor/${encodeURIComponent(data.jobId)}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not import posting.");
      setSavingSlug(null);
    }
  };

  const toggleStackPill = (tag: string) => {
    setSelectedStack((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  const toggleRolePill = (title: string) => {
    setSelectedTitles((prev) =>
      prev.some((t) => t.toLowerCase() === title.toLowerCase())
        ? prev.filter((t) => t.toLowerCase() !== title.toLowerCase())
        : [...prev, title]
    );
    setPage(1);
  };

  const applySearchSelection = (value: string) => {
    setSearch(value);
    setQuery(value.trim());
    setSuggestionsOpen(false);
    setPage(1);
  };

  const quickRemoveSavedLocation = async (target: string) => {
    const nextPrefs: ProfilePreferencesInput = {
      ...preferences,
      preferredLocations: preferences.preferredLocations.filter((l) => l !== target),
    };
    queryClient.setQueryData(["profile", "preferences"], nextPrefs);
    try {
      await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPrefs),
      });
    } finally {
      setPage(1);
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  };

  const effectiveArrangement = remoteOverride ?? preferences.remotePreference;
  const hasSuggestions =
    suggestions.targetTitles.length > 0 ||
    suggestions.companies.length > 0 ||
    suggestions.roles.length > 0;

  return (
    <div className="space-y-5 text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Listing order">
          <Button
            variant={mode === "personalized" ? "primary" : "secondary"}
            aria-pressed={mode === "personalized"}
            className="min-h-11"
            onClick={() => {
              setPage(1);
              setMode("personalized");
            }}
          >
            Resume similarity
          </Button>
          <Button
            variant={mode === "recent" ? "primary" : "secondary"}
            aria-pressed={mode === "recent"}
            className="min-h-11"
            onClick={() => {
              setPage(1);
              setMode("recent");
            }}
          >
            Recent listings
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            leadingIcon={RiEqualizerLine}
            className="min-h-11"
            onClick={() => setDrawerOpen(true)}
          >
            Edit preferences
          </Button>
          <Button
            variant="secondary"
            leadingIcon={RiRefreshLine}
            className="min-h-11"
            onClick={refresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-4 sm:p-5">
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setSuggestionsOpen(false);
            setPage(1);
            setQuery(search.trim());
            setActiveLocationQuery(locationFilter.trim());
          }}
        >
          <div ref={searchBoxRef} className="relative">
            <SearchField
              label="Search roles or companies"
              placeholder="e.g. Frontend, Linear, AI"
              shape="rounded"
              value={search}
              onFocus={() => setSuggestionsOpen(true)}
              onChange={(val) => {
                setSearch(val);
                setSuggestionsOpen(true);
              }}
              onClear={() => {
                setSearch("");
                setQuery("");
                setSuggestionsOpen(false);
                setPage(1);
              }}
              fieldClassName="min-h-11"
              maxLength={200}
            />
            {suggestionsOpen && hasSuggestions && (
              <div
                role="listbox"
                aria-label="Role and company suggestions"
                className="absolute start-0 end-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-lg"
              >
                {suggestions.targetTitles.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2.5 py-1 text-caption-1-semibold text-text-tertiary">
                      Your target roles
                    </p>
                    {suggestions.targetTitles.map((item) => (
                      <button
                        key={`target-${item}`}
                        type="button"
                        role="option"
                        aria-selected={query === item}
                        onClick={() => applySearchSelection(item)}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-start text-body-2-regular text-text-primary transition-colors hover:bg-background-secondary-hover"
                      >
                        <RiStarLine className="size-4 shrink-0 text-foreground-icon-secondary" />
                        <span className="truncate">{item}</span>
                      </button>
                    ))}
                  </div>
                )}

                {suggestions.companies.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2.5 py-1 text-caption-1-semibold text-text-tertiary">
                      Companies
                    </p>
                    {suggestions.companies.map((company) => (
                      <button
                        key={`company-${company}`}
                        type="button"
                        role="option"
                        aria-selected={query === company}
                        onClick={() => applySearchSelection(company)}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-start text-body-2-regular text-text-primary transition-colors hover:bg-background-secondary-hover"
                      >
                        <RiBuildingLine className="size-4 shrink-0 text-foreground-icon-secondary" />
                        <span className="truncate capitalize">{company}</span>
                      </button>
                    ))}
                  </div>
                )}

                {suggestions.roles.length > 0 && (
                  <div>
                    <p className="px-2.5 py-1 text-caption-1-semibold text-text-tertiary">
                      Open roles
                    </p>
                    {suggestions.roles.map((role) => (
                      <button
                        key={`role-${role}`}
                        type="button"
                        role="option"
                        aria-selected={query === role}
                        onClick={() => applySearchSelection(role)}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-start text-body-2-regular text-text-primary transition-colors hover:bg-background-secondary-hover"
                      >
                        <RiBriefcaseLine className="size-4 shrink-0 text-foreground-icon-secondary" />
                        <span className="truncate">{role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            label="Filter by location"
            placeholder="e.g. Remote, London, US"
            value={locationFilter}
            onChange={setLocationFilter}
            fieldClassName="min-h-11"
            maxLength={120}
          />
          <div className="flex items-end gap-2">
            <Button type="submit" className="min-h-11">
              Apply filters
            </Button>
            {(query || selectedTitles.length > 0 || selectedStack.length > 0 || regionScope !== "ANY" || activeLocationQuery || remoteOverride) && (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                  setSelectedTitles([]);
                  setSelectedStack([]);
                  setRegionScope("ANY");
                  setLocationFilter("");
                  setActiveLocationQuery("");
                  setRemoteOverride(null);
                  setPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </form>

        {prefsLoaded && preferences.targetTitles.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-separator-border pt-3">
            <span className="text-caption-1-semibold text-text-secondary">
              Your selected roles:
            </span>
            <button
              type="button"
              aria-pressed={selectedTitles.length === 0}
              onClick={() => {
                setSelectedTitles([]);
                setPage(1);
              }}
              className={cx(
                "min-h-8 rounded-full border px-3 py-1 text-caption-1-semibold transition-colors",
                selectedTitles.length === 0
                  ? "border-transparent bg-button-primary text-text-white shadow-xs"
                  : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
              )}
            >
              All roles
            </button>
            {preferences.targetTitles.map((title) => {
              const active = selectedTitles.some((t) => t.toLowerCase() === title.toLowerCase());
              return (
                <button
                  key={title}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleRolePill(title)}
                  className={cx(
                    "min-h-8 rounded-full border px-3 py-1 text-caption-1-semibold transition-colors",
                    active
                      ? "border-transparent bg-button-primary text-text-white shadow-xs"
                      : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
                  )}
                >
                  {title}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-separator-border pt-3">
          <span className="text-caption-1-semibold text-text-secondary">
            Tech stack:
          </span>
          {POPULAR_TECH_STACK_FILTERS.map((tag) => {
            const active = selectedStack.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() => toggleStackPill(tag)}
                className={cx(
                  "min-h-8 rounded-full border px-3 py-1 text-caption-1-semibold transition-colors",
                  active
                    ? "border-transparent bg-button-primary text-text-white shadow-xs"
                    : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-separator-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption-1-semibold text-text-secondary">Work type:</span>
            <SegmentedControl
              aria-label="Filter by work arrangement"
              selectedKeys={[effectiveArrangement]}
              onSelectionChange={(keys) => {
                const selected = [...keys][0] as ProfilePreferencesInput["remotePreference"] | undefined;
                if (selected) {
                  setPage(1);
                  setRemoteOverride(selected);
                }
              }}
            >
              <SegmentedControlItem id="ANY" className="min-h-9">Any</SegmentedControlItem>
              <SegmentedControlItem id="REMOTE_ONLY" className="min-h-9">Remote</SegmentedControlItem>
              <SegmentedControlItem id="HYBRID" className="min-h-9">Hybrid</SegmentedControlItem>
              <SegmentedControlItem id="ONSITE" className="min-h-9">On-site</SegmentedControlItem>
            </SegmentedControl>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption-1-semibold text-text-secondary">Region:</span>
            <SegmentedControl
              aria-label="Filter by remote region eligibility"
              selectedKeys={[regionScope]}
              onSelectionChange={(keys) => {
                const selected = [...keys][0] as RegionScope | undefined;
                if (selected) {
                  setPage(1);
                  setRegionScope(selected);
                }
              }}
            >
              <SegmentedControlItem id="ANY" className="min-h-9">Any region</SegmentedControlItem>
              <SegmentedControlItem id="WORLDWIDE" className="min-h-9">Worldwide</SegmentedControlItem>
              <SegmentedControlItem id="US" className="min-h-9">US</SegmentedControlItem>
              <SegmentedControlItem id="EMEA" className="min-h-9">EMEA / Europe</SegmentedControlItem>
            </SegmentedControl>
          </div>

          {prefsLoaded && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-caption-1-regular text-text-tertiary">
                Saved profile: {ARRANGEMENT_LABELS[preferences.remotePreference]}
              </span>
              {preferences.preferredLocations.map((loc) => (
                <Chip key={loc} variant="caption" color="soft" className="gap-1 pe-1.5">
                  <span>{loc}</span>
                  <button
                    type="button"
                    aria-label={`Remove saved location ${loc}`}
                    onClick={() => void quickRemoveSavedLocation(loc)}
                    className="inline-flex size-4 items-center justify-center rounded-full hover:bg-background-tertiary-default"
                  >
                    <RiCloseLine className="size-3" />
                  </button>
                </Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {mode === "personalized" && (
        <p className="text-body-2-regular text-text-secondary">
          Ranks saved listings by similarity to your primary resume, boosted for selected target roles and seamlessly supplemented from our wider live ATS catalog when searches narrow. Similarity is not a qualification score or hiring probability.
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-body-2-regular text-text-error-primary">
          {saveError}
        </p>
      )}

      {state.status === "loading" && (
        <div role="status" aria-label="Loading job listings" className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cx(panel, "space-y-4")}>
              <div className="flex items-center justify-between gap-3">
                <Skeleton shape="text" className="h-3.5 w-32" />
                <Skeleton shape="rect" className="h-5 w-16" />
              </div>
              <Skeleton shape="text" className="h-5 w-3/4" />
              <SkeletonText lines={2} />
              <div className="flex gap-2 pt-1">
                <Skeleton shape="rect" className="h-11 w-28" />
                <Skeleton shape="rect" className="h-11 w-36" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div role="alert" className={panel}>
          <p className="text-body-regular text-text-secondary">{state.message}</p>
          <Button variant="secondary" className="mt-4 min-h-11" onClick={refresh}>
            Retry listings
          </Button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          {state.items.length === 0 ? (
            <div className={panel}>
              <h2 className="text-headline-medium">
                {state.personalization === "no_resume"
                  ? "Save a primary resume to rank roles"
                  : state.personalization === "incompatible_resume"
                    ? "Your resume is not ready for similarity ranking"
                    : mode === "personalized"
                      ? "No matches for your current preferences"
                      : "No listings found"}
              </h2>
              <p className="mt-3 text-body-regular text-text-secondary">
                {state.personalization === "no_resume" || state.personalization === "incompatible_resume"
                  ? "Review your master profile or browse recent listings. Ranking requires compatible saved embeddings."
                  : mode === "personalized"
                    ? "Edit your location or work arrangement preferences, try another search, or browse recent listings."
                    : "Try another search or adjust your filters. New opportunities will appear here as they become available."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" className="min-h-11" onClick={() => setDrawerOpen(true)}>
                  Edit preferences
                </Button>
                {mode === "personalized" && (
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    onClick={() => {
                      setPage(1);
                      setMode("recent");
                    }}
                  >
                    Browse recent listings
                  </Button>
                )}
                <ButtonLink href="/dashboard/resume" variant="secondary" className="min-h-11">
                  Review profile
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {state.items.map((job) => {
                const freshness = getJobFreshness(job.postedAt);
                return (
                  <article key={job.id} className={panel}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body-2-regular text-text-secondary">
                        {job.company} · {job.atsPlatform}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {freshness && (
                          <Chip variant="caption" color={freshness.isHighlight ? "lime" : "soft"}>
                            {freshness.label}
                          </Chip>
                        )}
                        {(job.atsPlatform === "ASHBY" || job.atsPlatform === "GREENHOUSE" || job.atsPlatform === "LEVER" || job.atsPlatform === "WORKDAY") && (
                          <Chip variant="caption" color="soft">
                            Direct ATS
                          </Chip>
                        )}
                      </div>
                    </div>
                    <h2 className="mt-2 break-words text-title-3-semibold">{job.title}</h2>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.matchesTargetRole !== undefined && (
                        <Chip variant="caption" color="soft">
                          {job.matchesTargetRole ? "Selected role" : "Beyond selected titles"}
                        </Chip>
                      )}
                      {job.techStack?.map((tag) => (
                        <button
                          key={`${job.id}-${tag}`}
                          type="button"
                          onClick={() => toggleStackPill(tag)}
                          className={cx(
                            "rounded-full border px-2.5 py-0.5 text-caption-1-regular transition-colors",
                            selectedStack.includes(tag)
                              ? "border-transparent bg-button-primary text-text-white shadow-xs"
                              : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-body-regular text-text-secondary">
                      {job.location || "Location not listed"} ·{" "}
                      {
                        {
                          REMOTE_ONLY: "Remote",
                          HYBRID: "Hybrid",
                          ONSITE: "On-site",
                          ANY: "Arrangement not specified",
                        }[job.remoteType]
                      }
                    </p>
                    <CompatibilityRating
                      score={job.semanticSimilarity}
                      label="Resume similarity"
                      unrankedLabel={job.publicSlug ? "Live catalog match" : "Not ranked"}
                      unrankedExplanation={
                        job.publicSlug
                          ? "Live ATS catalog listing. Save & tailor to score against your primary resume."
                          : "Requires a compatible primary resume embedding to rank similarity."
                      }
                      explanation="Vector cosine similarity between your primary resume and this posting, boosted for selected target roles. Not a qualification or hiring probability score."
                      className="mt-4"
                    />
                    <div className="mt-5 flex flex-wrap gap-2">
                      <ButtonLink
                        href={job.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="secondary"
                        className="min-h-11"
                        trailingIcon={RiExternalLinkLine}
                      >
                        View posting<span className="sr-only"> (opens in a new tab)</span>
                      </ButtonLink>
                      {job.publicSlug ? (
                        <Button
                          variant="primary"
                          className="min-h-11"
                          disabled={savingSlug === job.publicSlug}
                          onClick={() => void saveAndTailorJob(job.publicSlug!)}
                        >
                          {savingSlug === job.publicSlug ? "Preparing workspace…" : "Save & Tailor Resume"}
                        </Button>
                      ) : (
                        <ButtonLink
                          href={`/dashboard/tailor/${encodeURIComponent(job.id)}`}
                          variant="ghost"
                          className="min-h-11"
                        >
                          Open tailoring workspace
                        </ButtonLink>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-2-regular text-text-tertiary">
              {state.total.toLocaleString()} listings · Page {page}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                className="min-h-11"
                onClick={() => {
                  setPage((v) => v - 1);
                }}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page * 20 >= state.total}
                className="min-h-11"
                onClick={() => {
                  setPage((v) => v + 1);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <PreferencesDrawer
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        preferences={preferences}
        onSaved={(updated) => {
          queryClient.setQueryData(["profile", "preferences"], updated);
          setRemoteOverride(null);
          setPage(1);
          void queryClient.invalidateQueries({ queryKey: ["jobs"] });
        }}
      />
    </div>
  );
}
