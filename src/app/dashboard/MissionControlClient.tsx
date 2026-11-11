"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Briefcase,
  ChartBar,
  Microphone,
  EnvelopeSimple,
  CheckCircle,
  User,
  Copy,
} from "@phosphor-icons/react";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
} from "@/components/base/drawer/drawer";
import { Button } from "@/components/base/buttons/button";
import { toast } from "@/components/base/toast/toast";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { JobRadar } from "./JobRadar";
import styles from "./dashboard.module.css";

interface SelectedAction {
  id: string;
  title: string;
  subtitle: string;
  company: string;
  role: string;
  fitScore: number;
  contactName?: string;
  type: "tailor" | "followup" | "interview";
  summary: string;
  skills: string[];
}

const ACTION_DETAILS: Record<string, SelectedAction> = {
  stripe: {
    id: "stripe",
    title: "Tailor application for Stripe",
    subtitle: "Staff Systems Engineer · 14m ago · 94% fit",
    company: "Stripe",
    role: "Staff Systems Engineer — Core Infrastructure",
    fitScore: 94,
    contactName: "David Chen (Staff Platform Lead)",
    type: "tailor",
    summary:
      "Stripe is actively hiring for their payment processing engine. Your background in Go, distributed consensus (Raft), and low-latency systems matches 8 of 8 mandatory keywords.",
    skills: ["Distributed Systems", "Go", "PostgreSQL", "Kafka", "High-Throughput Arch"],
  },
  vercel: {
    id: "vercel",
    title: "Follow up with Sarah at Vercel",
    subtitle: "Senior Product Designer / DevRel · Due today",
    company: "Vercel",
    role: "Senior Infrastructure & Edge Systems",
    fitScore: 91,
    contactName: "Sarah Jenkins (Director of Engineering)",
    type: "followup",
    summary:
      "Initial application submitted 4 days ago. Sarah viewed your profile on LinkedIn yesterday. A polite, value-first follow-up email increases response rate by 42%.",
    skills: ["Next.js", "Edge Functions", "TypeScript", "Turbopack"],
  },
  amazon: {
    id: "amazon",
    title: "Prepare for Amazon technical screen",
    subtitle: "Principal Systems Architect · In 2 hours",
    company: "Amazon AWS",
    role: "Principal Solutions Architect",
    fitScore: 89,
    contactName: "Marcus Vance (Recruiting Partner)",
    type: "interview",
    summary:
      "Behavioral and system design loop scheduled for today. Hunt Deck generated 5 custom STAR+R interview stories tailored to AWS Leadership Principles (Ownership & Invent and Simplify).",
    skills: ["Cloud Architecture", "Leadership Principles", "Scalability", "Cost Optimization"],
  },
};

export function MissionControlClient() {
  const { openCommandPalette } = useDashboard();
  const [selectedAction, setSelectedAction] = useState<SelectedAction | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("week");
  const [pipelineData, setPipelineData] = useState<{
    applied: number;
    saved: number;
    interviewing: number;
    offers: number;
    weeklySubmitted: number;
    atsScore: number;
  }>({
    applied: 12,
    saved: 6,
    interviewing: 3,
    offers: 1,
    weeklySubmitted: 4,
    atsScore: 92,
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/dashboard/metrics");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && isMounted) {
          setPipelineData({
            applied: data.pipeline?.applied ?? 12,
            saved: data.pipeline?.saved ?? 6,
            interviewing: data.pipeline?.interviewing ?? 3,
            offers: data.pipeline?.offers ?? 1,
            weeklySubmitted: data.velocity?.applicationsThisWeek ?? 4,
            atsScore: data.primaryResume?.atsScore ?? 92,
          });
        }
      } catch {
        // Fall back gracefully to baseline metrics
      }
    }
    fetchMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = [
    {
      label: "Applications sent",
      value: String(pipelineData.applied),
      detail: `${pipelineData.weeklySubmitted} submitted this week`,
    },
    {
      label: "Avg. ATS match",
      value: `${pipelineData.atsScore}%`,
      detail: "Across tailored packs",
    },
    {
      label: "Interview conversion",
      value:
        pipelineData.applied > 0
          ? `${Math.round((pipelineData.interviewing / Math.max(pipelineData.applied, 1)) * 100)}%`
          : "21%",
      detail: "Of applications sent",
    },
    {
      label: "First-mover speed",
      value: "38m",
      detail: "Average time to apply",
    },
  ];

  const stages = [
    { name: "Saved / Radar", count: pipelineData.saved, color: "#c9d8e3" },
    { name: "Tailored & Ready", count: 3, color: "#94b4ca" },
    { name: "Applied", count: pipelineData.applied, color: "#2d5f8a" },
    { name: "Interviewing", count: pipelineData.interviewing, color: "#16213a" },
    { name: "Offer / Closed", count: pipelineData.offers, color: "#b7e4c7" },
  ];

  const handleQueueTailor = (action: SelectedAction) => {
    toast.success("Tailored Application Pack Queued", {
      description: `Bespoke resume & cover letter generation initiated for ${action.company}.`,
    });
    setSelectedAction(null);
  };

  const handleCopyPitch = (action: SelectedAction) => {
    navigator.clipboard?.writeText(
      `Hi ${action.contactName?.split(" ")[0] || "there"}, noticed the ${action.role} role at ${action.company}. Given my background in ${action.skills.slice(0, 2).join(" and ")}, I've put together a tailored overview: https://huntdeck.com/p/candidate`
    );
    toast.success("Pitch Copied to Clipboard", {
      description: `Direct message template for ${action.company} is ready to paste.`,
    });
  };

  return (
    <div className={styles.content}>
      <div className={styles.demoNotice}>
        <strong>Mission Control</strong>
        <span>
          {" "}Interactive workspace active. Press <strong>⌘K</strong> anywhere to jump to opportunities or trigger tailored application drafts.
        </span>
      </div>

      <div className={styles.heading}>
        <div>
          <h1>Welcome to your search.</h1>
          <p>High-conviction pipeline and automated outreach radar.</p>
        </div>
        <button
          type="button"
          onClick={openCommandPalette}
          className={styles.primaryButton}
        >
          Quick Actions (⌘K) <ArrowRight size={16} />
        </button>
      </div>

        {/* Velocity Metrics Grid */}
        <section className={styles.metricGrid} aria-label="Search velocity metrics">
          {metrics.map((metric, i) => (
            <div
              className={`${styles.metric} ${i === 0 ? styles.metricFeatured : ""}`}
              key={metric.label}
            >
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </div>
          ))}
        </section>

        {/* Action Queue & Velocity Chart */}
        <div className={styles.columns}>
          {/* Priority Queue (Clicking opens BoardUI Drawer) */}
          <section className={`${styles.panel} ${styles.queue}`} aria-labelledby="next-title">
            <div className={styles.panelHeading}>
              <div>
                <h2 id="next-title">Your next moves</h2>
                <p>Click any priority item to inspect details and launch tailored packs.</p>
              </div>
              <span className={styles.chip}>3 PRIORITIES</span>
            </div>

            <div
              onClick={() => setSelectedAction(ACTION_DETAILS.stripe)}
              className={`${styles.action} ${styles.highlight} cursor-pointer hover:border-[#2D5F8A]/40 transition-all`}
            >
              <span className={styles.actionIcon}>
                <Briefcase size={20} />
              </span>
              <div>
                <strong>Tailor your application for Stripe</strong>
                <span>Staff Systems Engineer · 14m ago · 94% fit</span>
              </div>
              <span className={styles.newLabel}>NEW MATCH</span>
            </div>

            <div
              onClick={() => setSelectedAction(ACTION_DETAILS.vercel)}
              className={`${styles.action} cursor-pointer hover:border-[#2D5F8A]/40 transition-all`}
            >
              <span className={styles.actionIcon}>
                <EnvelopeSimple size={20} />
              </span>
              <div>
                <strong>Follow up with Sarah at Vercel</strong>
                <span>Senior Infrastructure & Edge · Due today</span>
              </div>
            </div>

            <div
              onClick={() => setSelectedAction(ACTION_DETAILS.amazon)}
              className={`${styles.action} cursor-pointer hover:border-[#2D5F8A]/40 transition-all`}
            >
              <span className={styles.actionIcon}>
                <Microphone size={20} />
              </span>
              <div>
                <strong>Prepare for AWS technical screen</strong>
                <span>Principal Solutions Architect · In 2 hours</span>
              </div>
            </div>
          </section>

          {/* Velocity Section */}
          <section className={`${styles.panel} ${styles.velocity}`} aria-labelledby="velocity-title">
            <div className={styles.panelHeading}>
              <div>
                <h2 id="velocity-title">Application velocity</h2>
                <p>Applications sent · last 6 weeks</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTimeframe("week")}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                    timeframe === "week"
                      ? "bg-[#16213A] text-white"
                      : "text-[#5B6478] hover:text-[#16213A]"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe("month")}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                    timeframe === "month"
                      ? "bg-[#16213A] text-white"
                      : "text-[#5B6478] hover:text-[#16213A]"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className={styles.weekStat}>
              <strong>4</strong>
              <span>of 7 weekly goal</span>
              <b>↑ 3 vs last week</b>
            </div>

            <div
              className={styles.chart}
              role="img"
              aria-label="Applications per week: 1, 2, 2, 3, 1, and 4."
            >
              {[1, 2, 2, 3, 1, 4].map((n, i) => (
                <div className={styles.barColumn} key={i}>
                  <span>{n}</span>
                  <div
                    className={i === 5 ? styles.currentBar : styles.bar}
                    style={{ height: `${n * 16}px` }}
                  />
                  <small>W{i + 1}</small>
                </div>
              ))}
            </div>

            <div className={styles.chartFoot}>
              3 more to reach your weekly threshold <ChartBar size={16} />
            </div>
          </section>
        </div>

        {/* Radar & Pipeline Snapshot */}
        <div className={styles.columns}>
          <JobRadar />

          <section className={styles.panel} aria-labelledby="pipeline-title">
            <div className={styles.panelHeading}>
              <div>
                <h2 id="pipeline-title">Pipeline snapshot</h2>
                <p>25 active opportunities tracked</p>
              </div>
            </div>
            <div className={styles.segments} aria-hidden="true">
              {stages.map((stage) => (
                <span
                  key={stage.name}
                  style={{ flex: stage.count, background: stage.color }}
                />
              ))}
            </div>
            <ul className={styles.stageList}>
              {stages.map((stage) => (
                <li key={stage.name}>
                  <span className={styles.dot} style={{ background: stage.color }} />
                  <span>{stage.name}</span>
                  <strong>{stage.count}</strong>
                </li>
              ))}
            </ul>
            <div className={styles.followUp}>2 follow-ups awaiting employer reply</div>
          </section>
        </div>

      {/* BoardUI Inspector Drawer */}
      <Drawer
        placement="end"
        size="md"
        isOpen={selectedAction !== null}
        onOpenChange={(open) => !open && setSelectedAction(null)}
      >
        {selectedAction && (
          <>
            <DrawerHeader
              title={selectedAction.role}
              description={`${selectedAction.company} · ${selectedAction.fitScore}% ATS Match`}
            />
            <DrawerBody>
              <div className="flex flex-col gap-5 pt-2">
                {/* Fit Score Badge */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-background-secondary-default border border-border-button-default">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-[#2D5F8A]/10 text-[#2D5F8A] font-bold text-sm flex items-center justify-center font-mono">
                      {selectedAction.fitScore}%
                    </div>
                    <div>
                      <div className="text-body-medium text-text-primary font-semibold">
                        ATS Rank Match
                      </div>
                      <div className="text-caption-1-regular text-text-tertiary">
                        Verified against {selectedAction.skills.length} core keywords
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    High Signal
                  </span>
                </div>

                {/* Summary Box */}
                <div className="space-y-1.5">
                  <span className="text-caption-1-semibold text-text-tertiary uppercase tracking-wider">
                    Position Intelligence
                  </span>
                  <p className="text-body-regular text-text-secondary leading-relaxed text-sm">
                    {selectedAction.summary}
                  </p>
                </div>

                {/* Key Skills Checklist */}
                <div className="space-y-2">
                  <span className="text-caption-1-semibold text-text-tertiary uppercase tracking-wider">
                    Matched Skills Cloud
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAction.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-background-secondary-default border border-border-button-default text-text-primary font-medium"
                      >
                        <CheckCircle size={12} weight="fill" className="text-[#2D5F8A]" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key Contact Discovery */}
                {selectedAction.contactName && (
                  <div className="p-3 rounded-xl border border-border-button-default bg-background-primary-default space-y-2">
                    <span className="text-caption-1-semibold text-text-tertiary uppercase tracking-wider">
                      Hiring Intelligence
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-[#2D5F8A]" />
                        <span className="text-sm font-medium text-text-primary">
                          {selectedAction.contactName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPitch(selectedAction)}
                        className="text-xs text-[#2D5F8A] hover:underline flex items-center gap-1 font-medium"
                      >
                        <Copy size={12} />
                        <span>Copy Pitch</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </DrawerBody>

            <DrawerFooter>
              <Button
                variant="secondary"
                onClick={() => handleCopyPitch(selectedAction)}
              >
                Copy DM Pitch
              </Button>
              <Button
                onClick={() => handleQueueTailor(selectedAction)}
              >
                Queue Tailored Pack &rarr;
              </Button>
            </DrawerFooter>
          </>
        )}
      </Drawer>
    </div>
  );
}
