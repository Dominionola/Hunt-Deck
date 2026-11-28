"use client";

import { useQuery } from "@tanstack/react-query";
import { RiArrowRightLine, RiExternalLinkLine, RiRefreshLine } from "@remixicon/react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Chip } from "@/components/base/badges/chip";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Skeleton, SkeletonText } from "@/components/base/skeleton/skeleton";
import { radarResponseSchema, type RadarJob } from "@/lib/validations/dashboard-radar";

function formatArrangement(remoteType: RadarJob["remoteType"]): string | null {
  switch (remoteType) {
    case "REMOTE_ONLY":
      return "Remote";
    case "HYBRID":
      return "Hybrid";
    case "ONSITE":
      return "On-site";
    default:
      return null;
  }
}

async function fetchRadarJobs({ signal }: { signal: AbortSignal }): Promise<RadarJob[]> {
  const response = await fetch("/api/jobs?limit=3&page=1", { signal });
  if (!response.ok) throw new Error("Job listings unavailable");
  const data = radarResponseSchema.parse(await response.json());
  return data.items;
}

export function JobRadar() {
  const { data: jobs = [], isPending, isError, refetch } = useQuery({
    queryKey: ["dashboard", "radar"],
    queryFn: fetchRadarJobs,
    staleTime: 2 * 60_000,
  });

  const status = isPending ? "loading" : isError ? "error" : "ready";

  return (
    <section
      className="min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6"
      aria-labelledby="radar-title"
      aria-busy={status === "loading"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="radar-title" className="text-title-3-semibold text-text-primary">
            Recent opportunities
          </h2>
          <p className="mt-1 text-body-2-regular text-text-secondary">
            Recent listings from Job Discovery. Open Job Discovery for personalized similarity ranking.
          </p>
        </div>
        <ButtonLink href="/dashboard/jobs" variant="ghost" className="min-h-11" trailingIcon={RiArrowRightLine}>
          View jobs
        </ButtonLink>
      </div>

      {status === "loading" && (
        <div role="status" aria-label="Loading recent opportunities" className="mt-5 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton shape="circle" className="size-8 shrink-0" />
                <Skeleton shape="text" className="h-3.5 w-24" />
              </div>
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-5"
        >
          <strong className="text-headline-medium text-text-primary">
            We couldn&apos;t load recent opportunities.
          </strong>
          <p className="text-body-2-regular text-text-secondary">
            Check your connection and try again.
          </p>
          <Button
            type="button"
            variant="secondary"
            leadingIcon={RiRefreshLine}
            className="min-h-11"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      )}

      {status === "ready" && jobs.length === 0 && (
        <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-5">
          <strong className="text-headline-medium text-text-primary">
            No opportunities available yet.
          </strong>
          <p className="text-body-2-regular text-text-secondary">
            Visit Job Discovery to explore available listings.
          </p>
          <ButtonLink href="/dashboard/jobs" variant="secondary" className="min-h-11" trailingIcon={RiArrowRightLine}>
            Explore jobs
          </ButtonLink>
        </div>
      )}

      {status === "ready" && jobs.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {jobs.map((job) => {
            const arrangement = formatArrangement(job.remoteType);
            const postedLabel = new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(job.postedAt));

            return (
              <article
                key={job.id}
                className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar size="md" color="neutral" initials={job.company[0]?.toUpperCase() ?? "J"} aria-hidden="true" />
                    <strong className="min-w-0 truncate text-body-2-medium text-text-primary">
                      {job.company}
                    </strong>
                  </div>
                  <h3 className="break-words text-body-medium text-text-primary">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip variant="caption" color="gray">
                      {job.location || "Location not listed"}
                    </Chip>
                    {arrangement ? (
                      <Chip variant="caption" color="soft">
                        {arrangement}
                      </Chip>
                    ) : null}
                  </div>
                  <p className="text-caption-1-regular text-text-tertiary">
                    Posted <time dateTime={job.postedAt}>{postedLabel}</time>
                  </p>
                </div>

                <ButtonLink
                  href={job.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="small"
                  trailingIcon={RiExternalLinkLine}
                  className="min-h-11 w-full justify-between"
                >
                  <span>
                    View posting<span className="sr-only"> (opens in a new tab)</span>
                  </span>
                </ButtonLink>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
