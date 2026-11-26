"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import { ingestionCountsSchema } from "@/lib/validations/jobIngestion";
import type {
  FreehireSourceFilter,
  FreehireWorkMode,
} from "@/lib/validations/freehire";
import { z } from "zod";

const statusSchema = z.object({
  status: z.string(),
  progress: z.number(),
  result: ingestionCountsSchema.optional(),
});

const panel = "rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6";

const FREEHIRE_PRESETS = [
  { label: "Remote Frontend & Fullstack", query: "Frontend Developer", workMode: "REMOTE_ONLY" as const },
  { label: "Remote AI & LLM Engineer", query: "AI Engineer", workMode: "REMOTE_ONLY" as const },
  { label: "IT Support & Helpdesk", query: "IT Support Officer", workMode: "ANY" as const },
  { label: "Workday Enterprise SWE", query: "Software Engineer", workMode: "ANY" as const },
];

export function FreehireImporter() {
  const [query, setQuery] = useState("Frontend Developer");
  const [workMode, setWorkMode] = useState<FreehireWorkMode>("REMOTE_ONLY");
  const [sourceFilter, setSourceFilter] = useState<FreehireSourceFilter>("ALL");
  const [limit, setLimit] = useState<15 | 25 | 50>(25);
  const [jobState, setJobState] = useState<{ jobId?: string; busy: boolean; message: string }>({
    busy: false,
    message: "",
  });

  useEffect(() => {
    if (!jobState.jobId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/ingestion/status?jobId=${jobState.jobId}`, {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (!response.ok) throw new Error();
        const result = statusSchema.parse(await response.json());
        if (controller.signal.aborted) return;

        if (result.status === "completed" && result.result) {
          const c = result.result;
          setJobState({
            busy: false,
            message: `Freehire import finished: ${c.fetched} fetched, ${c.selected} valid, ${c.saved} saved, ${c.embedded} newly embedded, ${c.failed} skipped/failed.`,
          });
          return;
        }
        if (result.status === "failed") {
          setJobState({ busy: false, message: "Freehire import failed. Adjust the query and retry." });
          return;
        }
        if (++polls >= 600) {
          setJobState({ busy: false, message: "Import still running in background. Refresh job discovery later." });
          return;
        }
        setJobState((prev) => ({
          ...prev,
          message: `Processing Freehire jobs (${result.progress}%)…`,
        }));
        timer = setTimeout(poll, 3000);
      } catch {
        if (!controller.signal.aborted) {
          setJobState({ busy: false, message: "Could not read import status. Worker may still be running." });
        }
      }
    };

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [jobState.jobId]);

  const queueFreehire = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setJobState({ busy: false, message: "Enter at least 2 characters for the search query." });
      return;
    }
    setJobState({ busy: true, message: "Queueing Freehire import…" });
    try {
      const response = await fetch("/api/jobs/ingestion/freehire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, workMode, sourceFilter, limit }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      const data = z.object({ jobId: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await response.json());
      setJobState({
        busy: true,
        jobId: data.jobId,
        message: "Queued on worker:jobs. Fetching and embedding matching roles…",
      });
    } catch {
      setJobState({ busy: false, message: "Could not enqueue Freehire import. Check worker and connection." });
    }
  };

  return (
    <section className={panel}>
      <h2 className="text-headline-medium">Import from Freehire (4.7M+ Live Jobs)</h2>
      <p className="mt-2 text-body-2-regular text-text-secondary">
        Batch-import roles across 160+ ATS platforms (Workday, Greenhouse, Lever, Ashby, iCIMS) and global job feeds directly into your ranked vector database.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FREEHIRE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="secondary"
            className="min-h-11"
            disabled={jobState.busy}
            onClick={() => {
              setQuery(preset.query);
              setWorkMode(preset.workMode);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void queueFreehire();
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Role or keyword query"
            placeholder="e.g. Frontend Developer, IT Support, Product Designer"
            value={query}
            onChange={setQuery}
            isDisabled={jobState.busy}
            fieldClassName="min-h-11"
          />
          <Button type="submit" disabled={jobState.busy} className="min-h-11">
            {jobState.busy ? "Importing…" : "Queue Freehire import"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption-1-semibold text-text-secondary">Work mode:</span>
            <SegmentedControl
              aria-label="Freehire work mode filter"
              selectedKeys={[workMode]}
              onSelectionChange={(keys) => {
                const selected = [...keys][0] as FreehireWorkMode | undefined;
                if (selected) setWorkMode(selected);
              }}
            >
              <SegmentedControlItem id="ANY" className="min-h-9">Any</SegmentedControlItem>
              <SegmentedControlItem id="REMOTE_ONLY" className="min-h-9">Remote</SegmentedControlItem>
              <SegmentedControlItem id="HYBRID" className="min-h-9">Hybrid</SegmentedControlItem>
              <SegmentedControlItem id="ONSITE" className="min-h-9">On-site</SegmentedControlItem>
            </SegmentedControl>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption-1-semibold text-text-secondary">Source:</span>
            <SegmentedControl
              aria-label="Freehire ATS source filter"
              selectedKeys={[sourceFilter]}
              onSelectionChange={(keys) => {
                const selected = [...keys][0] as FreehireSourceFilter | undefined;
                if (selected) setSourceFilter(selected);
              }}
            >
              <SegmentedControlItem id="ALL" className="min-h-9">All</SegmentedControlItem>
              <SegmentedControlItem id="ATS_ONLY" className="min-h-9">ATS only</SegmentedControlItem>
              <SegmentedControlItem id="WORKDAY" className="min-h-9">Workday</SegmentedControlItem>
              <SegmentedControlItem id="ASHBY" className="min-h-9">Ashby</SegmentedControlItem>
              <SegmentedControlItem id="GREENHOUSE" className="min-h-9">Greenhouse</SegmentedControlItem>
            </SegmentedControl>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption-1-semibold text-text-secondary">Batch:</span>
            <SegmentedControl
              aria-label="Freehire batch limit"
              selectedKeys={[String(limit)]}
              onSelectionChange={(keys) => {
                const selected = Number([...keys][0]);
                if (selected === 15 || selected === 25 || selected === 50) setLimit(selected);
              }}
            >
              <SegmentedControlItem id="15" className="min-h-9">15</SegmentedControlItem>
              <SegmentedControlItem id="25" className="min-h-9">25</SegmentedControlItem>
              <SegmentedControlItem id="50" className="min-h-9">50</SegmentedControlItem>
            </SegmentedControl>
          </div>
        </div>
      </form>

      {jobState.message && (
        <p role="status" className="mt-3 text-body-regular text-text-secondary">
          {jobState.message}
        </p>
      )}
    </section>
  );
}
