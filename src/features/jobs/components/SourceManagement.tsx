"use client";

import { useEffect, useState } from "react";
import { RiExternalLinkLine } from "@remixicon/react";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import { ScheduledSources } from "./ScheduledSources";
import { FreehireImporter } from "./FreehireImporter";
import { ingestionRequestSchema, ingestionCountsSchema, ingestionSourceSchema, type IngestionSource } from "@/lib/validations/jobIngestion";
import { z } from "zod";

const statusSchema = z.object({ status: z.string(), progress: z.number(), result: ingestionCountsSchema.optional() });
const startupLeadSchema = ingestionSourceSchema.extend({
  companyName: z.string(),
  stage: z.string(),
  focus: z.string(),
  boardUrl: z.string().url(),
});
type StartupLead = z.infer<typeof startupLeadSchema>;
const probeMatchSchema = ingestionSourceSchema.extend({
  jobCount: z.number().int().nonnegative(),
  boardUrl: z.string().url(),
});
type ProbeMatch = z.infer<typeof probeMatchSchema>;

const panel = "rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6";

function boardReviewUrl(source: IngestionSource): string {
  const board = encodeURIComponent(source.board);
  if (source.platform === "ASHBY") return `https://jobs.ashbyhq.com/${board}`;
  if (source.platform === "GREENHOUSE") return `https://job-boards.greenhouse.io/${board}`;
  return `https://jobs.lever.co/${board}`;
}

export function SourceManagement() {
  const [board, setBoard] = useState("");
  const [platform, setPlatform] = useState<"GREENHOUSE" | "LEVER" | "ASHBY">("GREENHOUSE");
  const [ingestion, setIngestion] = useState<{ jobId?: string; busy: boolean; message: string }>({ busy: false, message: "" });
  const [leads, setLeads] = useState<{ status: "idle" | "loading" | "ready" | "error"; items: IngestionSource[]; page: number }>({ status: "idle", items: [], page: 0 });
  const [startups, setStartups] = useState<{ status: "idle" | "loading" | "ready" | "error"; items: StartupLead[]; page: number }>({ status: "idle", items: [], page: 0 });
  const [probeSlug, setProbeSlug] = useState("");
  const [probe, setProbe] = useState<{ status: "idle" | "loading" | "ready" | "error"; matches: ProbeMatch[]; message?: string }>({ status: "idle", matches: [] });

  useEffect(() => {
    if (!ingestion.jobId) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/ingestion/status?jobId=${ingestion.jobId}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error();
        const result = statusSchema.parse(await response.json());
        if (controller.signal.aborted) return;
        if (result.status === "completed" && result.result) {
          const counts = result.result;
          setIngestion({ busy: false, message: `Finished: ${counts.fetched} fetched, ${counts.selected} selected, ${counts.saved} saved, ${counts.embedded} embedded, ${counts.failed} records failed, ${counts.sourcesFailed} sources failed. ${counts.incompleteSources === undefined ? "Source coverage is unknown for this older run." : counts.incompleteSources ? `${counts.incompleteSources} sources had incomplete or unverified coverage.` : "No sources were reported incomplete."}` });
          return;
        }
        if (result.status === "failed") { setIngestion({ busy: false, message: "Ingestion failed after its bounded attempts. Review the source and retry later." }); return; }
        if (++polls >= 600) { setIngestion({ busy: false, message: "The job is still pending. Refresh its status later; no additional job was submitted." }); return; }
        timer = setTimeout(poll, 3000);
      } catch { if (!controller.signal.aborted) setIngestion({ busy: false, message: "Could not load ingestion status. The queued job may still run; no additional job was submitted." }); }
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [ingestion.jobId]);

  const discoverSources = async () => {
    setLeads({ status: "loading", items: [], page: 0 });
    try {
      const response = await fetch("/api/jobs/ingestion/github-sources", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      const data = z.object({ sources: z.array(ingestionSourceSchema).max(100) }).parse(await response.json());
      setLeads({ status: "ready", items: data.sources, page: 0 });
    } catch { setLeads({ status: "error", items: [], page: 0 }); }
  };

  const discoverStartups = async () => {
    setStartups({ status: "loading", items: [], page: 0 });
    try {
      const response = await fetch("/api/jobs/ingestion/startup-sources", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      const data = z.object({ startups: z.array(startupLeadSchema).max(100) }).parse(await response.json());
      setStartups({ status: "ready", items: data.startups, page: 0 });
    } catch { setStartups({ status: "error", items: [], page: 0 }); }
  };

  const probeStartupAts = async () => {
    const slug = probeSlug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(slug)) {
      setProbe({ status: "error", matches: [], message: "Enter a lowercase company slug (e.g. linear, cursor, resend)." });
      return;
    }
    setProbe({ status: "loading", matches: [] });
    try {
      const response = await fetch("/api/jobs/ingestion/startup-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      const data = z.object({ found: z.boolean(), matches: z.array(probeMatchSchema) }).parse(await response.json());
      setProbe({
        status: "ready",
        matches: data.matches,
        message: data.found ? undefined : `No public Ashby, Greenhouse, or Lever board found for "${slug}".`,
      });
    } catch {
      setProbe({ status: "error", matches: [], message: "Could not probe startup ATS endpoints. Try again." });
    }
  };

  const ingest = async () => {
    const parsed = ingestionRequestSchema.safeParse({ sources: [{ platform, board }] });
    if (!parsed.success) { setIngestion({ busy: false, message: "Enter a board identifier, such as the final name in its public board URL." }); return; }
    setIngestion({ busy: true, message: "Submitting ingestion…" });
    try {
      const response = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      const result = z.object({ jobId: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await response.json());
      setIngestion({ busy: true, jobId: result.jobId, message: "Queued. Waiting for the job ingestion worker; progress appears when it finishes." });
    } catch { setIngestion({ busy: false, message: "Could not confirm an ingestion job. Check the source and service configuration before retrying." }); }
  };

  return <div className="space-y-5">
    <section className={panel}>
      <h2 className="text-headline-medium">Import a public ATS board</h2>
      <p className="mt-2 text-body-2-regular text-text-secondary">Explicit source only; up to 1,000 records per source per run. Requires a running job ingestion worker. Identical source requests within ten minutes reuse one job.</p>
      <div className="mt-4 flex flex-wrap gap-2">{(["GREENHOUSE", "LEVER", "ASHBY"] as const).map((item) => <Button key={item} variant={platform === item ? "primary" : "secondary"} aria-pressed={platform === item} className="min-h-11" disabled={ingestion.busy} onClick={() => setPlatform(item)}>{item === "GREENHOUSE" ? "Greenhouse" : item === "LEVER" ? "Lever" : "Ashby"}</Button>)}</div>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void ingest(); }}><Input label="Board identifier" value={board} onChange={setBoard} isDisabled={ingestion.busy} fieldClassName="min-h-11" /><Button type="submit" disabled={ingestion.busy} className="min-h-11">{ingestion.busy ? "Ingestion pending…" : "Queue ingestion"}</Button></form>
      {ingestion.message && <p role="status" className="mt-3 text-body-regular text-text-secondary">{ingestion.message}</p>}

      <div className="mt-5 border-t border-separator-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-body-medium">Funded Startups &amp; YC Companies</h3>
            <p className="mt-1 text-body-2-regular text-text-secondary">Verified VC-backed startups on Ashby &amp; Greenhouse with active hiring budgets.</p>
          </div>
          <Button variant="secondary" className="min-h-11" disabled={startups.status === "loading" || ingestion.busy} onClick={() => void discoverStartups()}>
            {startups.status === "loading" ? "Loading startups…" : "Discover Funded Startups"}
          </Button>
        </div>

        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void probeStartupAts(); }}>
          <Input label="Auto-detect startup ATS by slug" placeholder="e.g. linear, cursor, resend" value={probeSlug} onChange={setProbeSlug} isDisabled={probe.status === "loading" || ingestion.busy} fieldClassName="min-h-11" />
          <Button type="submit" variant="secondary" disabled={probe.status === "loading" || ingestion.busy} className="min-h-11">{probe.status === "loading" ? "Probing…" : "Probe ATS"}</Button>
        </form>
        {probe.status === "error" && probe.message && <p role="alert" className="mt-2 text-body-2-regular text-text-error-primary">{probe.message}</p>}
        {probe.status === "ready" && probe.message && <p role="status" className="mt-2 text-body-2-regular text-text-secondary">{probe.message}</p>}
        {probe.status === "ready" && probe.matches.length > 0 && (
          <ul className="mt-3 grid gap-2">
            {probe.matches.map((match) => (
              <li key={`${match.platform}:${match.board}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-separator-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-2-medium">{match.board} · {match.platform}</span>
                  <Chip variant="caption" color="soft">{match.jobCount} open roles</Chip>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={match.boardUrl} target="_blank" rel="noopener noreferrer" variant="secondary" className="min-h-11" trailingIcon={RiExternalLinkLine}>Review board<span className="sr-only"> (opens in a new tab)</span></ButtonLink>
                  <Button variant="secondary" className="min-h-11" disabled={ingestion.busy} onClick={() => { setBoard(match.board); setPlatform(match.platform); }}>Select board</Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {startups.status === "error" && <p role="alert" className="mt-2 text-body-2-regular text-text-error-primary">Could not load curated startups. Try again.</p>}
        {startups.status === "ready" && (
          <>
            <ul className="mt-3 grid gap-2">
              {startups.items.slice(startups.page * 5, startups.page * 5 + 5).map((startup) => (
                <li key={`${startup.platform}:${startup.board}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-separator-border p-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body-2-medium">{startup.companyName}</span>
                      <Chip variant="caption" color="soft">{startup.stage}</Chip>
                      <span className="text-caption-1-regular text-text-tertiary">{startup.platform}</span>
                    </div>
                    <p className="mt-1 text-caption-1-regular text-text-secondary">{startup.focus}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={startup.boardUrl} target="_blank" rel="noopener noreferrer" variant="secondary" className="min-h-11" trailingIcon={RiExternalLinkLine}>Review board<span className="sr-only"> (opens in a new tab)</span></ButtonLink>
                    <Button variant="secondary" className="min-h-11" disabled={ingestion.busy} onClick={() => { setBoard(startup.board); setPlatform(startup.platform); }}>Select board</Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="secondary" className="min-h-11" disabled={startups.page === 0} onClick={() => setStartups((value) => ({ ...value, page: value.page - 1 }))}>Previous</Button>
              <span className="text-body-2-regular">{startups.page + 1} / {Math.ceil(startups.items.length / 5)}</span>
              <Button variant="secondary" className="min-h-11" disabled={(startups.page + 1) * 5 >= startups.items.length} onClick={() => setStartups((value) => ({ ...value, page: value.page + 1 }))}>Next</Button>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 border-t border-separator-border pt-4"><Button variant="secondary" className="min-h-11" disabled={leads.status === "loading" || ingestion.busy} onClick={() => void discoverSources()}>{leads.status === "loading" ? "Finding boards…" : "Find boards on GitHub"}</Button><p className="mt-2 text-body-2-regular text-text-secondary">These leads come from an internship list. Review the company board and its terms before importing.</p>
        {leads.status === "loading" && <p role="status" className="mt-2 text-body-2-regular">Finding sources…</p>}
        {leads.status === "error" && <p role="alert" className="mt-2 text-body-2-regular">Could not load sources. Try again.</p>}
        {leads.status === "ready" && (leads.items.length === 0 ? <p className="mt-2 text-body-2-regular">No supported boards found.</p> : <><ul className="mt-3 grid gap-2">{leads.items.slice(leads.page * 5, leads.page * 5 + 5).map((lead) => <li key={`${lead.platform}:${lead.board}`} className="flex flex-wrap items-center justify-between gap-2"><span className="text-body-2-regular">{lead.board} · {lead.platform}</span><div className="flex flex-wrap gap-2"><ButtonLink href={boardReviewUrl(lead)} target="_blank" rel="noopener noreferrer" variant="secondary" className="min-h-11" trailingIcon={RiExternalLinkLine}>Review board<span className="sr-only"> (opens in a new tab)</span></ButtonLink><Button variant="secondary" className="min-h-11" disabled={ingestion.busy} onClick={() => { setBoard(lead.board); setPlatform(lead.platform); }}>Select board</Button></div></li>)}</ul><div className="mt-3 flex items-center gap-2"><Button variant="secondary" className="min-h-11" disabled={leads.page === 0} onClick={() => setLeads((value) => ({ ...value, page: value.page - 1 }))}>Previous</Button><span className="text-body-2-regular">{leads.page + 1} / {Math.ceil(leads.items.length / 5)}</span><Button variant="secondary" className="min-h-11" disabled={(leads.page + 1) * 5 >= leads.items.length} onClick={() => setLeads((value) => ({ ...value, page: value.page + 1 }))}>Next</Button></div></>)}
      </div><ScheduledSources platform={platform} board={board} /></section>
    <FreehireImporter />
  </div>;
}
