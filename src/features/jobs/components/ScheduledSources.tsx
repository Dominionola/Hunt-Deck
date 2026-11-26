"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/base/buttons/button";
import { ingestionSourceSchema } from "@/lib/validations/jobIngestion";

const responseSchema = z.object({ schedules: z.array(z.object({ id: z.string().uuid(), platform: z.string(), board: z.string(), enabled: z.boolean(), nextRunAt: z.string(), intervalHours: z.number() })).max(100) });
type Schedule = z.infer<typeof responseSchema>["schedules"][number];

export function ScheduledSources({ platform, board }: { platform: "GREENHOUSE" | "LEVER" | "ASHBY"; board: string }) {
  const [items, setItems] = useState<Schedule[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/jobs/ingestion/schedules", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      setItems(responseSchema.parse(await response.json()).schedules); setLoaded(true); return true;
    } catch { setMessage("Schedules are unavailable. Check that scheduling is configured and try again."); return false; }
    finally { setBusy(false); }
  }
  async function change(method: "POST" | "DELETE", body: unknown) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/jobs/ingestion/schedules", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      if (await refresh()) setMessage(method === "POST" ? "Source approved for daily refresh." : "Scheduled refresh disabled.");
    } catch { setMessage("The schedule could not be updated. Check the source and try again."); }
    finally { setBusy(false); }
  }
  function approve() {
    const parsed = ingestionSourceSchema.safeParse({ platform, board });
    if (!parsed.success) { setMessage("Enter a valid board identifier first."); return; }
    void change("POST", { source: parsed.data, intervalHours: 24, termsReviewed: true });
  }
  return <div className="mt-5 border-t border-separator-border pt-4">
    <h3 className="text-headline-medium">Scheduled sources</h3>
    <p className="mt-2 text-body-2-regular text-text-secondary">Review the employer board and its terms before approving a daily refresh. Only administrators can manage schedules.</p>
    <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" className="min-h-11" disabled={busy} onClick={() => void refresh()}>View schedules</Button><Button variant="secondary" className="min-h-11" disabled={busy} onClick={approve}>I reviewed the terms — schedule this board</Button></div>
    {busy && <p role="status" className="mt-3 text-body-2-regular">Updating schedules…</p>}
    {message && <p role="status" className="mt-3 text-body-2-regular">{message}</p>}
    {loaded && items.length === 0 && <p className="mt-3 text-body-2-regular">No scheduled sources yet.</p>}
    {loaded && items.length > 0 && <ul className="mt-3 grid gap-2">{items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2"><span className="text-body-2-regular">{item.board} · {item.platform} · {item.enabled ? `Every ${item.intervalHours} hours` : "Disabled"}</span>{item.enabled && <Button variant="secondary" className="min-h-11" disabled={busy} onClick={() => void change("DELETE", { scheduleId: item.id })}>Disable<span className="sr-only"> {item.board}</span></Button>}</li>)}</ul>}
  </div>;
}
