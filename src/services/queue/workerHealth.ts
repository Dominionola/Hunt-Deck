export type WorkerQueueStatus = {
  queue: string;
  workers: number;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
};

type QueueProbe = {
  getWorkers: () => Promise<unknown[]>;
  getJobCounts: (...types: ("waiting" | "active" | "delayed" | "failed")[]) => Promise<Record<string, number>>;
};

/** Only aggregates leave this function; job payloads and error messages are never read. */
export async function inspectWorkerQueue(queue: string, probe: QueueProbe): Promise<WorkerQueueStatus> {
  const [workers, counts] = await Promise.all([
    probe.getWorkers(),
    probe.getJobCounts("waiting", "active", "delayed", "failed"),
  ]);
  return { queue, workers: workers.length, waiting: counts.waiting ?? 0, active: counts.active ?? 0,
    delayed: counts.delayed ?? 0, failed: counts.failed ?? 0 };
}

export function workerQueueHealthy(status: WorkerQueueStatus, maxWaiting: number): boolean {
  return status.workers > 0 && status.waiting <= maxWaiting;
}
