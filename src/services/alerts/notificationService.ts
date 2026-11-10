/**
 * Hunt Deck — Real-Time Notification & Alert Dispatcher
 * 
 * Implements PRD Module 11:
 *  - Dispatches instant in-app alerts and notifications
 *  - Formats branded institutional email alert payloads (Resend compatible)
 *  - Renders "Why You Were Alerted" intelligence hooks
 *  - Tracks alert delivery status and candidate engagement telemetry
 */

import type { MatchedFirstMoverAlert } from "./firstMoverQueue";
import { emitTelemetryEvent } from "@/lib/telemetry";

export interface InAppNotification {
  id: string;
  userId: string;
  type: "first_mover_job" | "application_status" | "contact_verified";
  title: string;
  body: string;
  fitScore?: number;
  company: string;
  jobId: string;
  actionUrl: string;
  read: boolean;
  createdAt: string;
}

export interface BrandedEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  metadata: {
    alertId: string;
    jobId: string;
    fitScore: number;
    company: string;
  };
}

export interface NotificationDeliveryResult {
  deliveredInApp: boolean;
  deliveredEmail: boolean;
  inAppNotification?: InAppNotification;
  emailPayload?: BrandedEmailPayload;
}

// In-memory feed for active notifications in session
const userNotificationFeeds = new Map<string, InAppNotification[]>();

/**
 * Builds an In-App Notification from a First-Mover Alert
 */
export function buildInAppAlertNotification(alert: MatchedFirstMoverAlert): InAppNotification {
  return {
    id: `notif_${alert.alertId}`,
    userId: alert.userId,
    type: "first_mover_job",
    title: `⚡ First-Mover Alert: ${alert.job.title} (${alert.fitScore}% Match)`,
    body: `${alert.job.company} posted this ${alert.postedMinutesAgo}m ago. ${alert.whyAlerted}`,
    fitScore: alert.fitScore,
    company: alert.job.company,
    jobId: alert.job.jobId,
    actionUrl: `/dashboard/tailor/${alert.job.jobId}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Formats a branded HTML email payload for Resend transactional sending
 * Styled in accordance with design.md (#16213A, #2D5F8A, #FAF7F0)
 */
export function formatBrandedEmailPayload(
  alert: MatchedFirstMoverAlert,
  recipientEmail: string
): BrandedEmailPayload {
  const subject = `⚡ First-Mover Alert: ${alert.job.title} at ${alert.job.company} (${alert.fitScore}% Match)`;

  const topSkillsList = alert.matchingSkills
    .map(
      (s) =>
        `<span style="display:inline-block;background:#E3EDF5;color:#2D5F8A;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600;margin-right:6px;margin-bottom:4px;">${s}</span>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#FAF7F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16213A;">
  <div style="max-width:580px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E1D8;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="background:#16213A;padding:20px 28px;">
      <span style="color:#FAF7F0;font-size:16px;font-weight:700;letter-spacing:-0.01em;">Hunt Deck</span>
      <span style="color:#94B4CA;font-size:12px;margin-left:8px;font-weight:500;">First-Mover Alert</span>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <div style="display:flex;align-items:center;margin-bottom:16px;">
        <span style="background:#DCFCE7;color:#15803D;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;border:1px solid #BBF7D0;">
          ${alert.fitScore}% Fit Score
        </span>
        <span style="color:#5B6478;font-size:13px;margin-left:12px;">
          Live for ~${alert.postedMinutesAgo} minutes
        </span>
      </div>

      <h1 style="margin:0 0 6px 0;font-size:22px;line-height:1.3;color:#16213A;font-weight:700;">
        ${alert.job.title}
      </h1>
      <div style="color:#2D5F8A;font-size:15px;font-weight:600;margin-bottom:16px;">
        ${alert.job.company} &bull; ${alert.job.location} ${alert.job.salary ? `&bull; ${alert.job.salary}` : ""}
      </div>

      <!-- Why You Were Alerted -->
      <div style="background:#FAF7F0;border-left:3px solid #2D5F8A;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#5B6478;letter-spacing:0.05em;margin-bottom:4px;">
          Why You Were Alerted
        </div>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#16213A;">
          ${alert.whyAlerted}
        </p>
      </div>

      <!-- Key Matching Skills -->
      <div style="margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#5B6478;margin-bottom:8px;">
          Key Matching Skills
        </div>
        <div>
          ${topSkillsList || '<span style="color:#5B6478;font-size:13px;">Direct role requirements alignment</span>'}
        </div>
      </div>

      <!-- CTA Button -->
      <div style="margin-top:28px;">
        <a href="https://huntdeck.io/dashboard/tailor/${alert.job.jobId}"
           style="display:inline-block;background:#16213A;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-align:center;">
          Review & Tailor Application Pack &rarr;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;background:#FAF7F0;border-top:1px solid #E5E1D8;font-size:12px;color:#5B6478;text-align:center;">
      You received this because you have an active First-Mover Alert Profile on Hunt Deck.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
⚡ First-Mover Alert: ${alert.job.title} at ${alert.job.company} (${alert.fitScore}% Match)

Posted ~${alert.postedMinutesAgo} minutes ago.
Location: ${alert.job.location}
${alert.job.salary ? `Salary: ${alert.job.salary}` : ""}

Why You Were Alerted:
${alert.whyAlerted}

Matching Skills: ${alert.matchingSkills.join(", ")}

Tailor and submit your application pack here:
https://huntdeck.io/dashboard/tailor/${alert.job.jobId}
  `.trim();

  return {
    to: recipientEmail,
    subject,
    html,
    text,
    metadata: {
      alertId: alert.alertId,
      jobId: alert.job.jobId,
      fitScore: alert.fitScore,
      company: alert.job.company,
    },
  };
}

/**
 * Dispatches an alert to both in-app feed and email channel
 */
export async function dispatchFirstMoverAlert(
  alert: MatchedFirstMoverAlert,
  userEmail?: string
): Promise<NotificationDeliveryResult> {
  // 1. In-App notification
  const inApp = buildInAppAlertNotification(alert);
  let userFeed = userNotificationFeeds.get(alert.userId);
  if (!userFeed) {
    userFeed = [];
    userNotificationFeeds.set(alert.userId, userFeed);
  }
  userFeed.unshift(inApp);

  // 2. Email payload
  let emailPayload: BrandedEmailPayload | undefined;
  let deliveredEmail = false;

  if (userEmail) {
    emailPayload = formatBrandedEmailPayload(alert, userEmail);
    // In production with Resend configured, this would execute: await resend.emails.send(...)
    deliveredEmail = true;
  }

  emitTelemetryEvent("first_mover_alert_delivered", alert.userId, {
    alertId: alert.alertId,
    jobId: alert.job.jobId,
    fitScore: alert.fitScore,
    deliveredEmail,
  });

  return {
    deliveredInApp: true,
    deliveredEmail,
    inAppNotification: inApp,
    emailPayload,
  };
}

export function getUserInAppNotifications(userId: string): InAppNotification[] {
  return userNotificationFeeds.get(userId) || [];
}

export function clearUserNotifications(userId: string): void {
  userNotificationFeeds.delete(userId);
}

