"use client";

import { useState } from "react";
import { Sparkle, Briefcase, Globe } from "@phosphor-icons/react";
import { JobFeed } from "./JobFeed";
import { HackerNewsHiringFeed } from "./HackerNewsHiringFeed";
import { RemoteFeedsBrowser } from "./RemoteFeedsBrowser";

export function JobDiscoveryTabs() {
  const [activeTab, setActiveTab] = useState<"ats" | "remote" | "hackernews">("ats");

  return (
    <div className="space-y-6">
      {/* Top Source Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("ats")}
          className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
            activeTab === "ats"
              ? "bg-[#16213A] text-white shadow-2xs"
              : "text-[#5B6478] hover:text-[#16213A] hover:bg-white"
          }`}
        >
          <Briefcase size={16} />
          <span>Live ATS &amp; Verified Listings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("remote")}
          className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
            activeTab === "remote"
              ? "bg-[#2D5F8A] text-white shadow-2xs"
              : "text-[#5B6478] hover:text-[#16213A] hover:bg-white"
          }`}
        >
          <Globe size={16} />
          <span>Himalayas &amp; Jobicy</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-inherit">
            100k+ Remote
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hackernews")}
          className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
            activeTab === "hackernews"
              ? "bg-[#2D5F8A] text-white shadow-2xs"
              : "text-[#5B6478] hover:text-[#16213A] hover:bg-white"
          }`}
        >
          <Sparkle size={16} weight="fill" className={activeTab === "hackernews" ? "text-amber-300" : "text-[#2D5F8A]"} />
          <span>Hacker News &ldquo;Who is Hiring?&rdquo;</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-inherit">
            Direct Contacts
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "ats" && <JobFeed />}
      {activeTab === "remote" && <RemoteFeedsBrowser />}
      {activeTab === "hackernews" && <HackerNewsHiringFeed />}
    </div>
  );
}
