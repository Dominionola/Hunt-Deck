"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowSquareOut,
  Briefcase,
  Buildings,
  Globe,
  MagnifyingGlass,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import type { RemoteFeedProvider } from "@/lib/validations/remoteFeeds";

interface RemoteFeedItem {
  provider: RemoteFeedProvider;
  externalJobId?: string;
  company: string;
  title: string;
  description: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  remoteType: "REMOTE_ONLY" | "HYBRID" | "ONSITE" | "ANY";
  atsPlatform: "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "OTHER";
  applicationUrl: string;
  postedAt?: string;
  employmentType?: string | null;
  seniority?: string[];
  techStack?: string[];
}

interface RemoteFeedApiResponse {
  success: true;
  provider: RemoteFeedProvider;
  totalAvailable: number;
  nextCursor: string | null;
  items: RemoteFeedItem[];
}

const QUICK_TOPICS = ["React", "TypeScript", "Python", "Full Stack", "Backend", "AI"];
const JOBICY_GEOS = [
  { label: "Worldwide", value: "" },
  { label: "USA", value: "usa" },
  { label: "Europe", value: "europe" },
  { label: "UK", value: "uk" },
];

export function RemoteFeedsBrowser() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<RemoteFeedProvider>("himalayas");
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [geo, setGeo] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const {
    data,
    isPending: isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["remote-feeds", provider, activeQuery.trim(), geo, cursor],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        provider,
        limit: "20",
      });
      if (activeQuery.trim()) params.set("q", activeQuery.trim());
      if (provider === "jobicy" && geo) params.set("geo", geo);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/jobs/remote-feeds?${params.toString()}`, { signal });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errBody?.error || "Unable to reach remote job feed.");
      }
      return (await res.json()) as RemoteFeedApiResponse;
    },
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load remote feed."
    : null;

  const switchProvider = (next: RemoteFeedProvider) => {
    if (next === provider) return;
    setProvider(next);
    setCursor(null);
    setCursorHistory([]);
  };

  const applySearch = (nextQuery: string) => {
    setSearchInput(nextQuery);
    setActiveQuery(nextQuery);
    setCursor(null);
    setCursorHistory([]);
  };

  const handleSaveAndTailor = async (item: RemoteFeedItem) => {
    const itemId = item.externalJobId ?? item.applicationUrl;
    setSavingId(itemId);
    try {
      const res = await fetch("/api/jobs/remote-feeds/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: item.provider,
          externalJobId: itemId,
          company: item.company,
          title: item.title,
          description: item.description,
          location: item.location,
          salaryMin: item.salaryMin,
          salaryMax: item.salaryMax,
          remoteType: item.remoteType,
          atsPlatform: item.atsPlatform,
          applicationUrl: item.applicationUrl,
          postedAt: item.postedAt,
        }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errBody?.error || "Failed to import remote listing.");
      }

      const saved = (await res.json()) as { jobId: string };
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Remote Listing Imported", {
        description: `${item.title} at ${item.company} saved to your workspace.`,
      });
      router.push(`/dashboard/tailor/${encodeURIComponent(saved.jobId)}`);
    } catch (err) {
      toast.error("Import Failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setSavingId(null);
    }
  };

  const handleNextPage = () => {
    if (!data?.nextCursor) return;
    setCursorHistory((prev) => [...prev, cursor ?? ""]);
    setCursor(data.nextCursor);
  };

  const handlePrevPage = () => {
    if (cursorHistory.length === 0) return;
    const nextHistory = [...cursorHistory];
    const prevCursor = nextHistory.pop() || null;
    setCursorHistory(nextHistory);
    setCursor(prevCursor);
  };

  return (
    <div className="space-y-6">
      {/* Provider Header & Controls */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#FAF7F0] border border-[#E5E1D8] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16213A] text-white text-[11px] font-bold uppercase tracking-wider">
              <Globe size={12} weight="bold" />
              <span>Global Remote Feeds</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#16213A] tracking-tight">
              {provider === "himalayas" ? (
                <>
                  Himalayas{" "}
                  <span className="font-serif italic font-normal text-[#2D5F8A]">
                    Remote Index
                  </span>
                </>
              ) : (
                <>
                  Jobicy{" "}
                  <span className="font-serif italic font-normal text-[#2D5F8A]">
                    Fresh 7-Day Feed
                  </span>
                </>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-[#5B6478] max-w-2xl leading-relaxed">
              {provider === "himalayas" ? (
                <>
                  100k+ verified remote positions with structured salary bands and regional restrictions. Powered by{" "}
                  <a
                    href="https://himalayas.app/jobs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#2D5F8A] hover:underline"
                  >
                    Himalayas
                  </a>
                  .
                </>
              ) : (
                <>
                  Fresh remote jobs curated from the last 7 days with rapid cursor pagination. Powered by{" "}
                  <a
                    href="https://jobicy.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#2D5F8A] hover:underline"
                  >
                    Jobicy
                  </a>
                  .
                </>
              )}
            </p>
          </div>

          {/* Sub-Provider Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#E5E1D8] self-start lg:self-center">
            <button
              type="button"
              onClick={() => switchProvider("himalayas")}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                provider === "himalayas"
                  ? "bg-[#16213A] text-white shadow-2xs"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              Himalayas (100k+)
            </button>
            <button
              type="button"
              onClick={() => switchProvider("jobicy")}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                provider === "jobicy"
                  ? "bg-[#2D5F8A] text-white shadow-2xs"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              Jobicy (Fresh 7d)
            </button>
          </div>
        </div>

        {/* Search + Filter Row */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applySearch(searchInput);
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6478]"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                provider === "himalayas"
                  ? "Search Himalayas (e.g. Senior React, Staff Backend, AI)..."
                  : "Filter Jobicy by skill or tag (e.g. python, react, devops)..."
              }
              className="w-full min-h-[44px] pl-9 pr-4 py-2 bg-white border border-[#E5E1D8] rounded-xl text-xs text-[#16213A] placeholder:text-[#5B6478] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A]"
            />
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
          >
            Search Feed
          </button>
        </form>

        {/* Quick Chips & Jobicy Geo */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_TOPICS.map((topic) => {
              const isSelected = activeQuery.toLowerCase() === topic.toLowerCase();
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => applySearch(isSelected ? "" : topic)}
                  className={`min-h-[36px] px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer active:scale-[0.98] ${
                    isSelected
                      ? "bg-[#2D5F8A] text-white border-[#2D5F8A]"
                      : "bg-white text-[#5B6478] border-[#E5E1D8] hover:text-[#16213A]"
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>

          {provider === "jobicy" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {JOBICY_GEOS.map((item) => {
                const isSelected = geo === item.value;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setGeo(item.value);
                      setCursor(null);
                      setCursorHistory([]);
                    }}
                    className={`min-h-[36px] px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? "bg-[#16213A] text-white border-[#16213A]"
                        : "bg-white text-[#5B6478] border-[#E5E1D8] hover:text-[#16213A]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 1. Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 sm:p-6 bg-white border border-[#E5E1D8] rounded-3xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D8]">
                <div className="space-y-2">
                  <div className="h-5 w-52 bg-[#FAF7F0] rounded-md animate-pulse" />
                  <div className="h-4 w-36 bg-[#FAF7F0] rounded-md animate-pulse" />
                </div>
                <div className="h-10 w-28 bg-[#FAF7F0] rounded-xl animate-pulse" />
              </div>
              <div className="h-14 w-full bg-[#FAF7F0] rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* 2. Error State */}
      {!isLoading && error && (
        <div className="p-6 bg-white border border-red-200 rounded-3xl text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <WarningCircle size={20} weight="bold" />
          </div>
          <h3 className="text-sm font-bold text-[#16213A]">Remote Feed Unavailable</h3>
          <p className="text-xs text-[#5B6478] max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] text-xs font-bold text-[#16213A] hover:bg-[#EDF3F7] cursor-pointer"
          >
            Retry Feed
          </button>
        </div>
      )}

      {/* 3. Empty State */}
      {!isLoading && !error && data && data.items.length === 0 && (
        <div className="p-8 bg-white border border-[#E5E1D8] rounded-3xl text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#FAF7F0] text-[#5B6478] flex items-center justify-center">
            <Briefcase size={20} />
          </div>
          <h3 className="text-sm font-bold text-[#16213A]">No Matching Remote Roles</h3>
          <p className="text-xs text-[#5B6478] max-w-sm mx-auto">
            No listings matched your query on {provider === "himalayas" ? "Himalayas" : "Jobicy"}. Try another keyword or switch feeds.
          </p>
          {activeQuery && (
            <button
              type="button"
              onClick={() => applySearch("")}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[#2D5F8A] hover:underline cursor-pointer"
            >
              Reset Search
            </button>
          )}
        </div>
      )}

      {/* 4. Interactive State */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <div className="space-y-4">
          {data.items.map((item) => {
            const itemId = item.externalJobId ?? item.applicationUrl;
            const isSaving = savingId === itemId;
            return (
              <div
                key={itemId}
                className="p-5 sm:p-6 bg-white border border-[#E5E1D8] rounded-3xl shadow-2xs space-y-3 transition-all hover:border-[#2D5F8A]/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E5E1D8]">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-[#16213A]">{item.company}</span>
                      <span className="text-[#5B6478]">&bull;</span>
                      <span className="font-semibold text-sm text-[#2D5F8A]">{item.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Remote
                      </span>
                      {item.salaryMin && item.salaryMax && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#16213A] border border-[#E5E1D8]">
                          ${item.salaryMin.toLocaleString()} – ${item.salaryMax.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#5B6478] flex-wrap">
                      {item.location && (
                        <span className="inline-flex items-center gap-1">
                          <Buildings size={13} />
                          <span>{item.location}</span>
                        </span>
                      )}
                      {item.employmentType && <span>{item.employmentType}</span>}
                      {item.seniority && item.seniority.length > 0 && (
                        <span>{item.seniority.join(", ")}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={item.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 text-[#16213A] border border-[#E5E1D8] transition-colors active:scale-[0.98]"
                    >
                      <span>Apply on {provider === "himalayas" ? "Himalayas" : "Jobicy"}</span>
                      <ArrowSquareOut size={13} />
                    </a>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handleSaveAndTailor(item)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#2D5F8A] hover:bg-[#16213A] text-white transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <Sparkle size={13} weight="fill" />
                      <span>{isSaving ? "Importing..." : "Tailor & Save"}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#5B6478] leading-relaxed line-clamp-3">
                  {item.description}
                </p>

                {item.techStack && item.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.techStack.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] text-[#16213A]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Cursor Pagination */}
          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              disabled={cursorHistory.length === 0}
              onClick={handlePrevPage}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#E5E1D8] text-xs font-semibold text-[#16213A] hover:bg-[#FAF7F0] disabled:opacity-40 active:scale-[0.98] cursor-pointer"
            >
              Previous
            </button>

            <span className="text-xs text-[#5B6478]">
              {data.totalAvailable.toLocaleString()} roles available on{" "}
              {provider === "himalayas" ? "Himalayas" : "Jobicy"}
            </span>

            <button
              type="button"
              disabled={!data.nextCursor}
              onClick={handleNextPage}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#E5E1D8] text-xs font-semibold text-[#16213A] hover:bg-[#FAF7F0] disabled:opacity-40 active:scale-[0.98] cursor-pointer"
            >
              Next Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
