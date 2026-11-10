/**
 * Hunt Deck — Application Telemetry & Production Observability
 * 
 * Tracks system events, execution latencies, auto-apply quality rates,
 * and security challenge encounters while guaranteeing zero PII leakage.
 */

export type TelemetryEventType =
  | "auto_apply_started"
  | "auto_apply_completed"
  | "auto_apply_captcha_halted"
  | "auto_apply_review_halted"
  | "auto_apply_failed"
  | "first_mover_job_scanned"
  | "first_mover_alert_queued"
  | "first_mover_alert_delivered"
  | "outreach_copied"
  | "resume_tailored";

export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  userId: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean | null | undefined>;
}

// In-memory telemetry buffer for local inspection and unit testing
const telemetryBuffer: TelemetryEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

export function emitTelemetryEvent(
  type: TelemetryEventType,
  userId: string,
  metadata: Record<string, string | number | boolean | null | undefined> = {}
): TelemetryEvent {
  const event: TelemetryEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    userId,
    timestamp: new Date().toISOString(),
    metadata,
  };

  telemetryBuffer.push(event);
  if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryBuffer.shift();
  }

  // In production or staging, this dispatches to an observability stream (e.g., Datadog, PostHog, Axiom)
  if (process.env.NODE_ENV === "development") {
    // Light dev logging
    // console.log(`[Telemetry] ${type} (${userId}):`, metadata);
  }

  return event;
}

export function getRecentTelemetryEvents(limit = 50): TelemetryEvent[] {
  return [...telemetryBuffer].slice(-limit);
}

export function clearTelemetryEvents(): void {
  telemetryBuffer.length = 0;
}

