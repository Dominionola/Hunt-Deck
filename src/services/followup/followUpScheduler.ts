/**
 * Hunt Deck — Application Follow-Up Cadence & Trigger Engine
 * 
 * Implements PRD Module 13.3.1:
 * Automatically schedules and determines readiness for follow-up cadences:
 *  - Follow-Up #1: 6 business days post-application (status check + value add)
 *  - Follow-Up #2: 10 business days post-Follow-Up #1 (graceful final touch)
 *  - Post-Interview Thank-You: 24 hours after logged interview
 *  - Pre-Screen Prep: 2 days before scheduled screening loop
 */

export type FollowUpType =
  | "FOLLOW_UP_1"
  | "FOLLOW_UP_2"
  | "POST_INTERVIEW_THANK_YOU"
  | "PRE_SCREEN_PREP";

export type FollowUpStatus =
  | "PENDING"
  | "DUE_TODAY"
  | "OVERDUE"
  | "SENT"
  | "DISMISSED";

export interface FollowUpScheduleItem {
  id: string;
  applicationId: string;
  companyName: string;
  roleTitle: string;
  type: FollowUpType;
  targetContactName?: string;
  targetContactEmail?: string;
  targetContactLinkedIn?: string;
  scheduledDate: string; // YYYY-MM-DD
  status: FollowUpStatus;
  daysRemainingOrOverdue: number; // positive = days until due, negative = days overdue, 0 = due today
  recommendedChannel: "email" | "linkedin_inmail" | "portal";
}

/**
 * Adds business days to a given date, skipping Saturdays and Sundays
 */
export function addBusinessDays(startDate: Date, businessDaysToAdd: number): Date {
  const result = new Date(startDate);
  let added = 0;

  while (added < businessDaysToAdd) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    // 0 is Sunday, 6 is Saturday
    if (day !== 0 && day !== 6) {
      added++;
    }
  }

  return result;
}

/**
 * Formats a Date to YYYY-MM-DD string
 */
export function formatDateIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Computes calendar day difference between date and now
 */
export function computeDaysDifference(targetDateStr: string, now: Date = new Date()): number {
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);

  const current = new Date(now);
  current.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - current.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Derives follow-up status from days remaining
 */
export function deriveFollowUpStatus(daysDifference: number, alreadySent = false): FollowUpStatus {
  if (alreadySent) return "SENT";
  if (daysDifference > 0) return "PENDING";
  if (daysDifference === 0) return "DUE_TODAY";
  return "OVERDUE";
}

/**
 * Generates the full follow-up schedule for an active application
 */
export function generateApplicationFollowUpSchedule(
  application: {
    id: string;
    company: string;
    role: string;
    appliedDate?: string;
    interviewDate?: string;
    contact?: { name: string; email?: string; linkedInUrl?: string };
  },
  now: Date = new Date()
): FollowUpScheduleItem[] {
  const items: FollowUpScheduleItem[] = [];
  const contact = application.contact;

  // 1. Follow-Up #1: 6 business days after appliedDate
  if (application.appliedDate) {
    const applied = new Date(application.appliedDate);
    const fu1Date = addBusinessDays(applied, 6);
    const fu1DateStr = formatDateIso(fu1Date);
    const fu1Diff = computeDaysDifference(fu1DateStr, now);

    items.push({
      id: `fu1_${application.id}`,
      applicationId: application.id,
      companyName: application.company,
      roleTitle: application.role,
      type: "FOLLOW_UP_1",
      targetContactName: contact?.name,
      targetContactEmail: contact?.email,
      targetContactLinkedIn: contact?.linkedInUrl,
      scheduledDate: fu1DateStr,
      status: deriveFollowUpStatus(fu1Diff),
      daysRemainingOrOverdue: fu1Diff,
      recommendedChannel: contact?.email ? "email" : contact?.linkedInUrl ? "linkedin_inmail" : "portal",
    });

    // 2. Follow-Up #2: 10 business days after Follow-Up #1
    const fu2Date = addBusinessDays(fu1Date, 10);
    const fu2DateStr = formatDateIso(fu2Date);
    const fu2Diff = computeDaysDifference(fu2DateStr, now);

    items.push({
      id: `fu2_${application.id}`,
      applicationId: application.id,
      companyName: application.company,
      roleTitle: application.role,
      type: "FOLLOW_UP_2",
      targetContactName: contact?.name,
      targetContactEmail: contact?.email,
      targetContactLinkedIn: contact?.linkedInUrl,
      scheduledDate: fu2DateStr,
      status: deriveFollowUpStatus(fu2Diff),
      daysRemainingOrOverdue: fu2Diff,
      recommendedChannel: contact?.email ? "email" : contact?.linkedInUrl ? "linkedin_inmail" : "portal",
    });
  }

  // 3. Post-Interview Thank-You: 24 hours after interview date
  if (application.interviewDate) {
    const interview = new Date(application.interviewDate);
    const thankYouDate = new Date(interview.getTime() + 24 * 60 * 60 * 1000);
    const tyDateStr = formatDateIso(thankYouDate);
    const tyDiff = computeDaysDifference(tyDateStr, now);

    items.push({
      id: `ty_${application.id}`,
      applicationId: application.id,
      companyName: application.company,
      roleTitle: application.role,
      type: "POST_INTERVIEW_THANK_YOU",
      targetContactName: contact?.name,
      targetContactEmail: contact?.email,
      targetContactLinkedIn: contact?.linkedInUrl,
      scheduledDate: tyDateStr,
      status: deriveFollowUpStatus(tyDiff),
      daysRemainingOrOverdue: tyDiff,
      recommendedChannel: contact?.email ? "email" : "linkedin_inmail",
    });
  }

  return items;
}

/**
 * Filters a collection of follow-up items for items that need attention today or are overdue
 */
export function getActionableFollowUps(items: FollowUpScheduleItem[]): FollowUpScheduleItem[] {
  return items
    .filter((item) => item.status === "DUE_TODAY" || item.status === "OVERDUE")
    .sort((a, b) => a.daysRemainingOrOverdue - b.daysRemainingOrOverdue); // most overdue first
}

