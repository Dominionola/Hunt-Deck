/**
 * Hunt Deck — Durable Queue & Background Worker Types
 * 
 * Implements TASK-BE-005:
 *  - Moves slow operations (> 2.5s) off request handlers
 *  - Enforces server-side authentication and ownership
 *  - Bounded retries for transient errors
 *  - Idempotency & rate limiting
 *  - Truthful progress and failure states
 */

export type QueueName = "resume-processing" | "tailoring-processing" | "job-embedding";

export type JobStatus = "waiting" | "active" | "completed" | "failed";

export interface QueueJob<TData = unknown, TResult = unknown> {
  id: string;
  queueName: QueueName;
  jobType: string;
  userId: string;
  idempotencyKey: string;
  data: TData;
  status: JobStatus;
  progress: number; // 0 - 100
  currentStep: string;
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: TResult;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
}

export interface EnqueueJobOptions {
  maxAttempts?: number;
  idempotencyKey?: string;
}

export interface ResumeProcessingJobData {
  resumeId: string;
  userId: string;
  originalFileName: string;
  fileBufferBase64?: string;
  storageUrl: string;
  storageKey: string;
}

export interface ResumeProcessingJobResult {
  resumeId: string;
  fullName: string;
  skillsCount: number;
  hasEmbedding: boolean;
  contentHash: string;
}
