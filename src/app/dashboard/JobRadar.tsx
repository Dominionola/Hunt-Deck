"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { radarResponseSchema, type RadarJob } from "@/lib/validations/dashboard-radar";
import styles from "./dashboard.module.css";

type RadarState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; jobs: RadarJob[] };

function locationLabel(job: RadarJob) {
  const remote = { REMOTE_ONLY: "Remote", HYBRID: "Hybrid", ONSITE: "On-site", ANY: "" }[job.remoteType];
  return [job.location, remote].filter(Boolean).join(" · ") || "Location not listed";
}

export function JobRadar() {
  const [state, setState] = useState<RadarState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs?limit=3&page=1", { signal: controller.signal });
        if (!response.ok) throw new Error("Job listings unavailable");
        const data = radarResponseSchema.parse(await response.json());
        if (!controller.signal.aborted) setState({ status: "ready", jobs: data.items });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }
    void loadJobs();
    return () => controller.abort();
  }, [attempt]);

  return (
    <section className={styles.panel} aria-labelledby="radar-title" aria-busy={state.status === "loading"}>
      <div className={styles.panelHeading}>
        <div><h2 id="radar-title">Recent opportunities</h2><p>Recent listings from Job Discovery. Personal matching is not connected yet.</p></div>
        <Link href="/dashboard/jobs">View jobs <ArrowRight size={14} /></Link>
      </div>
      {state.status === "loading" && <div className={styles.radarState} role="status"><div className={styles.skeleton} aria-hidden="true" /><p>Loading recent opportunities…</p></div>}
      {state.status === "error" && <div className={styles.radarState} role="alert"><strong>We couldn’t load recent opportunities.</strong><p>Check your connection and try again.</p><button type="button" className={styles.retryButton} onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>Try again</button></div>}
      {state.status === "ready" && state.jobs.length === 0 && <div className={styles.radarState}><strong>No opportunities available yet.</strong><p>Visit Job Discovery to explore available listings.</p><Link href="/dashboard/jobs" className={styles.radarLink}>Explore jobs <ArrowRight size={14} /></Link></div>}
      {state.status === "ready" && state.jobs.length > 0 && <div className={styles.jobGrid}>{state.jobs.map((job) => (
        <article className={styles.job} key={job.id}>
          <div className={styles.jobHead}><div><span className={styles.companyMark} aria-hidden="true">{job.company[0].toUpperCase()}</span><strong>{job.company}</strong></div></div>
          <h3>{job.title}</h3>
          <p>{locationLabel(job)}</p>
          <p>Posted <time dateTime={job.postedAt}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(job.postedAt))}</time></p>
          <a className={styles.jobExample} href={job.applicationUrl} target="_blank" rel="noopener noreferrer">View posting <span className="sr-only">(opens in a new tab)</span> ↗</a>
        </article>
      ))}</div>}
    </section>
  );
}
