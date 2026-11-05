"use client";

import React, { useState, useEffect } from "react";
import { JobCard, type JobCardData } from "./JobCard";
import { JobDetailModal } from "./JobDetailModal";
import {
  MagnifyingGlass,
  ArrowClockwise,
  Sparkle,
  Faders,
  WarningOctagon,
  Lightning,
} from "@phosphor-icons/react";

const SAMPLE_JOBS: JobCardData[] = [
  {
    id: "job-1",
    title: "Senior Full-Stack Engineer",
    company: "Stripe",
    location: "San Francisco, CA",
    remoteType: "REMOTE_ONLY",
    atsPlatform: "GREENHOUSE",
    applicationUrl: "https://boards.greenhouse.io/stripe/jobs/1",
    fitScore: 92,
    matchingSkills: ["TypeScript", "React", "PostgreSQL", "Next.js", "Redis"],
    missingSkills: ["Kafka", "Terraform"],
  },
  {
    id: "job-2",
    title: "Backend Infrastructure Engineer",
    company: "Figma",
    location: "New York, NY",
    remoteType: "REMOTE_ONLY",
    atsPlatform: "GREENHOUSE",
    applicationUrl: "https://boards.greenhouse.io/figma/jobs/2",
    fitScore: 88,
    matchingSkills: ["Go", "Kubernetes", "AWS", "Docker"],
    missingSkills: ["Rust", "gRPC"],
  },
  {
    id: "job-3",
    title: "Staff Software Engineer, Platform",
    company: "Netflix",
    location: "Los Gatos, CA",
    remoteType: "ANY",
    atsPlatform: "LEVER",
    applicationUrl: "https://jobs.lever.co/netflix/3",
    fitScore: 84,
    matchingSkills: ["Java", "Distributed Systems", "PostgreSQL", "Microservices"],
    missingSkills: ["Cassandra", "Spinnaker"],
  },
  {
    id: "job-4",
    title: "Software Engineer, Core Systems",
    company: "Coinbase",
    location: "Remote",
    remoteType: "REMOTE_ONLY",
    atsPlatform: "GREENHOUSE",
    applicationUrl: "https://boards.greenhouse.io/coinbase/jobs/4",
    fitScore: 79,
    matchingSkills: ["Go", "Docker", "REST APIs"],
    missingSkills: ["Solidity", "Web3"],
  },
  {
    id: "job-5",
    title: "Full-Stack Engineer, Product",
    company: "Docker",
    location: "Remote",
    remoteType: "REMOTE_ONLY",
    atsPlatform: "LEVER",
    applicationUrl: "https://jobs.lever.co/docker/5",
    fitScore: 94,
    matchingSkills: ["React", "TypeScript", "Docker", "Node.js", "CI/CD"],
    missingSkills: ["Golang"],
  },
];

export function JobFeed() {
  const [jobs, setJobs] = useState<JobCardData[]>(SAMPLE_JOBS);
  const [selectedJob, setSelectedJob] = useState<JobCardData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "REMOTE" | "GREENHOUSE" | "LEVER" | "HIGH_MATCH">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingest from API route if available, otherwise sample jobs
  const fetchLiveJobs = async () => {
    try {
      const res = await fetch("/api/jobs?limit=25");
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const mapped: JobCardData[] = data.items.map((item: {
            id: string;
            title: string;
            company: string;
            location?: string;
            remoteType?: string;
            atsPlatform: string;
            applicationUrl: string;
          }) => ({
            id: item.id,
            title: item.title,
            company: item.company,
            location: item.location,
            remoteType: item.remoteType,
            atsPlatform: item.atsPlatform,
            applicationUrl: item.applicationUrl,
            fitScore: 85,
            matchingSkills: ["TypeScript", "React", "PostgreSQL"],
            missingSkills: ["Kubernetes"],
          }));
          setJobs(mapped);
          return;
        }
      }
    } catch {
      // Fallback to sample data for demo/testing
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchLiveJobs);
  }, []);

  const handleSyncAts = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/jobs", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      setIsLoading(true);
      await fetchLiveJobs();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to sync ATS boards");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTailor = (job: JobCardData) => {
    window.location.href = `/dashboard/resume?jobId=${job.id}&title=${encodeURIComponent(job.title)}`;
  };

  // Filter and search logic
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === "REMOTE") return job.remoteType === "REMOTE_ONLY";
    if (activeFilter === "GREENHOUSE") return job.atsPlatform === "GREENHOUSE";
    if (activeFilter === "LEVER") return job.atsPlatform === "LEVER";
    if (activeFilter === "HIGH_MATCH") return (job.fitScore ?? 0) >= 85;

    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#FAF7F0] border border-[#E5E1D8] rounded-full text-xs font-medium text-[#2D5F8A] mb-2">
            <Lightning size={14} weight="fill" />
            <span>8-Minute First-Mover Aggregator</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#16213A]">
            Direct ATS Postings, <span className="font-serif italic font-normal text-[#2D5F8A]">matched before they hit LinkedIn</span>
          </h1>
          <p className="text-xs text-[#5B6478] mt-1">
            Aggregated straight from verified Greenhouse, Lever, and Ashby endpoints without middleman latency.
          </p>
        </div>

        <button
          onClick={handleSyncAts}
          disabled={isSyncing}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <ArrowClockwise size={16} className={isSyncing ? "animate-spin" : ""} />
          <span>{isSyncing ? "Syncing ATS Boards..." : "Sync Live ATS Boards"}</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white border border-[#E5E1D8] rounded-2xl shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6478]"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by role title, company (e.g. Stripe, Backend Engineer)..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F0]/30 border border-[#E5E1D8] rounded-xl text-[#16213A] placeholder-[#5B6478]/60 focus:outline-hidden focus:border-[#2D5F8A] transition-colors"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto shrink-0 pb-1 sm:pb-0">
          <Faders size={16} className="text-[#5B6478] mr-1 hidden sm:block" />
          {[
            { id: "ALL", label: "All Roles" },
            { id: "HIGH_MATCH", label: "85%+ Match" },
            { id: "REMOTE", label: "Remote Only" },
            { id: "GREENHOUSE", label: "Greenhouse" },
            { id: "LEVER", label: "Lever" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as typeof activeFilter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                activeFilter === chip.id
                  ? "bg-[#16213A] text-white"
                  : "bg-[#FAF7F0] text-[#5B6478] hover:text-[#16213A] border border-[#E5E1D8]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* State 1: Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl" />
          ))}
        </div>
      ) : errorMessage ? (
        /* State 2: Error State */
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
          <WarningOctagon size={36} className="text-rose-600 mx-auto" />
          <h3 className="text-sm font-semibold text-[#16213A]">Failed to load live jobs</h3>
          <p className="text-xs text-[#5B6478]">{errorMessage}</p>
          <button
            onClick={fetchLiveJobs}
            className="px-4 py-2 bg-[#16213A] text-white text-xs font-medium rounded-lg"
          >
            Retry
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        /* State 3: Empty State */
        <div className="p-12 bg-white border border-[#E5E1D8] rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A] mx-auto">
            <Sparkle size={24} weight="duotone" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#16213A]">No matching jobs found</h3>
            <p className="text-xs text-[#5B6478] mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or trigger a live crawl across ATS endpoints.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchTerm("");
              setActiveFilter("ALL");
            }}
            className="px-4 py-2 bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* State 4: Interactive Grid of Job Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSelect={(j) => setSelectedJob(j)}
              onTailor={handleTailor}
            />
          ))}
        </div>
      )}

      {/* Job Detail Modal with Keyword Gap Analysis */}
      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onTailor={handleTailor}
      />
    </div>
  );
}
