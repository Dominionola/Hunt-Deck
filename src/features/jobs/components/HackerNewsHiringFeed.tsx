"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  CheckCircle,
  ArrowSquareOut,
  Sparkle,
  WarningCircle,
  MagnifyingGlass,
  EnvelopeSimple,
  Clock,
  Briefcase,
  Buildings,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import type { HnJobItem } from "@/services/jobs/adapters/hackerNewsHiringAdapter";

interface HnApiResponse {
  threadId: string;
  threadTitle: string;
  totalHits: number;
  jobs: HnJobItem[];
}

export function HackerNewsHiringFeed() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedEmailMap, setCopiedEmailMap] = useState<Record<string, boolean>>({});
  const [expandedIdMap, setExpandedIdMap] = useState<Record<string, boolean>>({});

  const {
    data,
    isPending: isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["hacker-news", search.trim(), remoteOnly, page],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (remoteOnly) params.set("remoteOnly", "true");
      params.set("page", String(page));
      params.set("limit", "25");

      const res = await fetch(`/api/jobs/hacker-news?${params.toString()}`, { signal });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || `HTTP ${res.status}: Failed to fetch Hacker News feed`);
      }
      return (await res.json()) as HnApiResponse;
    },
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load Hacker News postings."
    : null;

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmailMap((prev) => ({ ...prev, [id]: true }));
    toast.success("Direct Contact Copied", {
      description: `${email} ready to paste for executive outreach.`,
    });
    setTimeout(() => {
      setCopiedEmailMap((prev) => ({ ...prev, [id]: false }));
    }, 2500);
  };

  const handleSaveToPipeline = async (job: HnJobItem) => {
    setSavingId(job.externalJobId || job.title);
    try {
      const res = await fetch("/api/jobs/hacker-news/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalJobId: job.externalJobId,
          company: job.company,
          title: job.title,
          location: job.location,
          description: job.description,
          applicationUrl: job.applicationUrl,
          remoteType: job.remoteType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          directEmail: job.directEmail,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || "Failed to persist opportunity.");
      }

      const savedData = (await res.json()) as { success: boolean; jobId: string };
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Opportunity Saved to Pipeline", {
        description: `${job.title} at ${job.company} added. Direct founder contact linked.`,
      });

      // Jump directly to tailoring workspace for this newly embedded job
      if (savedData.jobId) {
        router.push(`/dashboard/tailor?jobId=${savedData.jobId}`);
      }
    } catch (err) {
      toast.error("Failed to Save Opportunity", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner & Value Prop Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#FAF7F0] border border-[#E5E1D8] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16213A] text-white text-[11px] font-bold uppercase tracking-wider">
              <Sparkle size={12} weight="fill" />
              <span>Unadvertised Stealth Feed</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#16213A] tracking-tight">
              {data?.threadTitle || "Ask HN: Who is hiring? (Monthly Thread)"}
            </h2>
            <p className="text-xs sm:text-sm text-[#5B6478] max-w-2xl leading-relaxed">
              Official monthly Y Combinator Hacker News hiring thread. 600+ tech companies post engineering and product roles
              directly in the comments—weeks before syndicating to LinkedIn. Many include direct founder/CTO emails.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white border border-[#E5E1D8] text-[#2D5F8A]">
              {data?.totalHits ? `${data.totalHits} Total Postings` : "Live Feed"}
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6478]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Filter by tech stack or keyword (e.g. Next.js, Rust, Distributed Systems)..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E5E1D8] rounded-xl text-xs text-[#16213A] placeholder:text-[#5B6478] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]/30"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setRemoteOnly(!remoteOnly);
              setPage(0);
            }}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
              remoteOnly
                ? "bg-[#2D5F8A] text-white shadow-2xs"
                : "bg-white text-[#5B6478] border border-[#E5E1D8] hover:text-[#16213A]"
            }`}
          >
            <span>Remote Only</span>
            {remoteOnly && <CheckCircle size={14} weight="fill" />}
          </button>
        </div>
      </div>

      {/* 1. Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 sm:p-6 bg-white border border-[#E5E1D8] rounded-3xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D8]">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-[#FAF7F0] rounded-md animate-pulse" />
                  <div className="h-4 w-32 bg-[#FAF7F0] rounded-md animate-pulse" />
                </div>
                <div className="h-8 w-24 bg-[#FAF7F0] rounded-xl animate-pulse" />
              </div>
              <div className="h-16 w-full bg-[#FAF7F0] rounded-xl animate-pulse" />
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
          <h3 className="text-sm font-bold text-[#16213A]">Unable to Load Hacker News Thread</h3>
          <p className="text-xs text-[#5B6478] max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] text-xs font-bold text-[#16213A] hover:bg-[#EDF3F7] cursor-pointer"
          >
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 3. Empty State */}
      {!isLoading && !error && data && data.jobs.length === 0 && (
        <div className="p-8 bg-white border border-[#E5E1D8] rounded-3xl text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#FAF7F0] text-[#5B6478] flex items-center justify-center">
            <Briefcase size={20} />
          </div>
          <h3 className="text-sm font-bold text-[#16213A]">No Matching Hacker News Postings Found</h3>
          <p className="text-xs text-[#5B6478] max-w-sm mx-auto">
            Try loosening your search filters or toggling off &ldquo;Remote Only&rdquo; to view all worldwide postings from this thread.
          </p>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRemoteOnly(false);
              }}
              className="text-xs font-semibold text-[#2D5F8A] hover:underline"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      )}

      {/* 4. Interactive State — Job List */}
      {!isLoading && !error && data && data.jobs.length > 0 && (
        <div className="space-y-4">
          {data.jobs.map((job) => {
            const isSaving = savingId === (job.externalJobId || job.title);
            const isCopied = job.directEmail ? copiedEmailMap[job.externalJobId || ""] : false;
            const isExpanded = expandedIdMap[job.externalJobId || ""] ?? false;

            return (
              <div
                key={job.externalJobId}
                className="p-5 sm:p-6 bg-white border border-[#E5E1D8] rounded-3xl shadow-2xs space-y-4 transition-all hover:border-[#2D5F8A]/40"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E5E1D8]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-[#16213A]">{job.company}</span>
                      <span className="text-[#5B6478]">&bull;</span>
                      <span className="font-semibold text-sm text-[#2D5F8A]">{job.title}</span>

                      {/* Arrangement Pill */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          job.remoteType === "REMOTE_ONLY"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : job.remoteType === "HYBRID"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {job.remoteType === "REMOTE_ONLY"
                          ? "Remote"
                          : job.remoteType === "HYBRID"
                          ? "Hybrid"
                          : "On-site"}
                      </span>

                      {/* Compensation Tag */}
                      {job.salaryMin && job.salaryMax && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#16213A] border border-[#E5E1D8]">
                          ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#5B6478] flex-wrap pt-0.5">
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <Buildings size={13} />
                          <span>{job.location}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock size={13} />
                        <span>Posted by @{job.author}</span>
                      </span>

                      {job.directEmail && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <EnvelopeSimple size={13} weight="bold" />
                          <span>Direct Contact: {job.directEmail}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {job.directEmail && (
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(job.directEmail!, job.externalJobId || "")}
                        className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 text-[#16213A] border border-[#E5E1D8] transition-colors active:scale-[0.98] cursor-pointer"
                        title="Copy direct recruiter/founder email"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle size={14} className="text-emerald-600" weight="fill" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Email</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveToPipeline(job)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#2D5F8A] hover:bg-[#16213A] text-white transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <Sparkle size={13} weight="fill" />
                      <span>{isSaving ? "Saving..." : "Tailor & Apply"}</span>
                    </button>
                  </div>
                </div>

                {/* Body Text */}
                <div className="space-y-2">
                  <p
                    className={`text-xs text-[#5B6478] leading-relaxed whitespace-pre-line ${
                      isExpanded ? "" : "line-clamp-4"
                    }`}
                  >
                    {job.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIdMap((prev) => ({
                          ...prev,
                          [job.externalJobId || ""]: !isExpanded,
                        }))
                      }
                      className="text-[#2D5F8A] font-semibold hover:underline"
                    >
                      {isExpanded ? "Show Less" : "Read Full Post"}
                    </button>

                    {job.sourceUrl && /^https:\/\//i.test(job.sourceUrl) && (
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#5B6478] hover:text-[#16213A]"
                      >
                        <span>View on Hacker News</span>
                        <ArrowSquareOut size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#E5E1D8] text-xs font-semibold text-[#16213A] hover:bg-[#FAF7F0] disabled:opacity-40 active:scale-[0.98]"
            >
              Previous Page
            </button>

            <span className="text-xs text-[#5B6478]">
              Page {page + 1} &bull; Showing up to 25 items
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#E5E1D8] text-xs font-semibold text-[#16213A] hover:bg-[#FAF7F0] active:scale-[0.98]"
            >
              Next Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
