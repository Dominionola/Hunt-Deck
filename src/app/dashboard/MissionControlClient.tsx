"use client";

import { RiArrowRightLine, RiRefreshLine } from "@remixicon/react";
import { Focusable } from "react-aria-components";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Meter } from "@/components/base/meter/meter";
import { Skeleton, SkeletonText } from "@/components/base/skeleton/skeleton";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { cx } from "@/utils/cx";
import { JobRadar } from "./JobRadar";

const panel = "min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6";
const labels = { SAVED: "Saved", APPLIED: "Applied", INTERVIEWING: "Interviewing", OFFER: "Offer", REJECTED: "Rejected" };
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value));

export function MissionControlClient() {
  const { metrics, refreshMetrics } = useDashboard();
  const data = metrics.status === "ready" ? metrics.data : null;
  const stages = data ? [
    { label: "Saved", value: data.pipeline.saved }, { label: "Applied", value: data.pipeline.applied },
    { label: "Interviewing", value: data.pipeline.interviewing }, { label: "Offers", value: data.pipeline.offers },
    { label: "Rejected", value: data.pipeline.rejected },
  ] : [];
  const cards = data ? [
    { label: "Active applications", value: data.pipeline.total, note: "Saved, applied, interviews and offers" },
    { label: "Submitted this week", value: data.velocity.applicationsThisWeek, note: "Recorded submission dates · UTC" },
    { label: "Interviewing", value: data.pipeline.interviewing, note: "Applications currently in interviews" },
    { label: "Offers", value: data.pipeline.offers, note: "Applications currently at offer stage" },
  ] : [];
  const maxCount = Math.max(1, ...(data?.velocity.weeks.map((w) => w.count) ?? []));

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-5 p-4 text-text-primary sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-title-1-medium">Mission Control</h1><p className="mt-2 text-body-regular text-text-secondary">Your saved profile, applications and next steps.</p></div>
        <ButtonLink href="/dashboard/jobs" className="min-h-11" trailingIcon={RiArrowRightLine}>Find opportunities</ButtonLink>
      </div>
      {metrics.status === "loading" && (
        <div role="status" aria-label="Loading your dashboard" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={cx(panel, "space-y-4")}>
              <Skeleton shape="text" className="h-3.5 w-2/3" />
              <Skeleton shape="rect" className="h-8 w-1/3" />
              <SkeletonText lines={1} lineClassName="h-3" />
            </div>
          ))}
        </div>
      )}
      {metrics.status === "error" && (
        <section role="alert" className={cx(panel, "flex flex-wrap items-center justify-between gap-4")}>
          <div><h2 className="text-headline-medium">Dashboard unavailable</h2><p className="mt-2 text-body-regular text-text-secondary">{metrics.message}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" className="min-h-11" leadingIcon={RiRefreshLine} onClick={refreshMetrics}>Retry</Button><ButtonLink href="/login" variant="ghost" className="min-h-11">Sign in</ButtonLink></div>
        </section>
      )}
      {data && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => <section key={card.label} className={cx(panel, "flex flex-col gap-3")}><h2 className="text-body-medium text-text-secondary">{card.label}</h2><strong className="text-title-1-medium tabular-nums">{card.value.toLocaleString()}</strong><p className="text-caption-1-regular text-text-tertiary">{card.note}</p></section>)}
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <section className={cx(panel, "lg:col-span-2")}>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-title-3-semibold">Recent applications</h2><ButtonLink href="/dashboard/applications" variant="ghost" className="min-h-11" trailingIcon={RiArrowRightLine}>View pipeline</ButtonLink></div>
            {data.recentApplications.length === 0 ? <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl bg-background-secondary-default p-5"><h3 className="text-headline-medium">Your pipeline starts here</h3><p className="text-body-regular text-text-secondary">Save a role or add an application to track your progress.</p><ButtonLink href="/dashboard/applications" variant="secondary" className="min-h-11">Add an application</ButtonLink></div> :
              <ul className="mt-3 divide-y divide-separator-border">{data.recentApplications.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><h3 className="break-words text-body-medium">{item.title}</h3><p className="mt-1 text-body-2-regular text-text-secondary">{item.company} · {labels[item.status]}</p>{item.followUpDate && <p className="mt-1 text-caption-1-regular text-text-tertiary">Follow-up: {dateLabel(item.followUpDate)} UTC</p>}</div><ButtonLink href="/dashboard/applications" variant="secondary" className="min-h-11" aria-label={`Review ${item.title} at ${item.company}`}>Review</ButtonLink></li>)}</ul>}
          </section>
          <section className={panel}>
            <h2 className="text-title-3-semibold">Submission activity</h2><p className="mt-2 text-body-2-regular text-text-secondary">Six weeks, starting Monday · UTC</p>
            <div className="mt-5 flex h-40 items-end gap-2" role="group" aria-label={data.velocity.weeks.map((w) => `Week of ${dateLabel(w.start)}: ${w.count} submissions`).join("; ")}>
              {data.velocity.weeks.map((week, i) => (
                <TooltipTrigger key={week.start} delay={0}>
                  <Focusable>
                    <button
                      type="button"
                      aria-label={`Week of ${dateLabel(week.start)}: ${week.count} ${week.count === 1 ? "submission" : "submissions"}`}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                    >
                      <span className="text-caption-1-semibold tabular-nums">{week.count}</span>
                      <div
                        className={cx("w-6 shrink-0 rounded-t-lg transition-colors", i === 5 ? "bg-chart-1-active" : "bg-chart-1 hover:bg-chart-1-active")}
                        style={{ height: week.count === 0 ? 2 : Math.round((week.count / maxCount) * 100) }}
                      />
                      <span className="whitespace-nowrap text-caption-1-regular text-text-tertiary">{dateLabel(week.start)}</span>
                    </button>
                  </Focusable>
                  <Tooltip>
                    {week.count} {week.count === 1 ? "submission" : "submissions"} · Week of {dateLabel(week.start)}
                  </Tooltip>
                </TooltipTrigger>
              ))}
            </div>
            <p className="mt-5 text-caption-1-regular text-text-tertiary">Only applications with a recorded submission date appear here.</p>
          </section>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2"><JobRadar /></div>
          <section className={panel}>
            <h2 className="text-title-3-semibold">Pipeline overview</h2>
            <ul className="mt-4 space-y-3">
              {stages.map((stage) => (
                <li key={stage.label}>
                  <Meter
                    label={stage.label}
                    value={stage.value}
                    maxValue={Math.max(1, data.pipeline.total)}
                    valueLabel={stage.value.toLocaleString()}
                    tone={stage.label === "Offers" ? "success" : stage.label === "Rejected" ? "warning" : "accent"}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-separator-border pt-5"><h3 className="text-headline-medium">Master profile</h3><p className="mt-2 break-words text-body-regular text-text-secondary">{data.primaryResume?.title ?? "No primary resume saved"}</p><p className="mt-2 break-words text-body-2-regular text-text-tertiary">{data.targetTitles.length ? data.targetTitles.join(" · ") : "Add your target roles to guide your search."}</p><ButtonLink href="/dashboard/resume" variant="ghost" className="mt-3 min-h-11" trailingIcon={RiArrowRightLine}>Review profile</ButtonLink></div>
          </section>
        </div>
      </>}
    </div>
  );
}
