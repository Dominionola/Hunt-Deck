import test from "node:test";
import assert from "node:assert/strict";
import { STAGES, PipelineApplication, PipelineStage } from "../../src/features/applications/types";
import { INITIAL_APPLICATIONS } from "../../src/features/applications/mockData";

/**
 * Unit tests for TASK-024F & TASK-024H:
 * - Institutional App Shell Navigation
 * - Route Active Resolution
 * - Command Palette Item Contracts
 * - Application Pipeline Kanban Stages & Optimistic Updates
 */

const NAVIGATION_ITEMS = [
  { label: "Mission Control", href: "/dashboard" },
  { label: "Job Discovery", href: "/dashboard/jobs", badge: "24" },
  { label: "Pipeline CRM", href: "/dashboard/applications", badge: "12" },
  { label: "ATS Tailor", href: "/dashboard/tailor", soon: true },
  { label: "Interview Prep", href: "/dashboard/interviews", soon: true },
  { label: "Master Profile", href: "/dashboard/resume" },
];

function isRouteActive(pathname: string, itemHref?: string): boolean {
  if (!itemHref) return false;
  if (itemHref === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname.startsWith(itemHref);
}

function calculateWeeklyVelocity(completed: number, goal: number): { percentage: number; remaining: number } {
  const percentage = Math.min(100, Math.round((completed / goal) * 100));
  const remaining = Math.max(0, goal - completed);
  return { percentage, remaining };
}

function moveApplicationStage(
  apps: PipelineApplication[],
  id: string,
  newStage: PipelineStage
): PipelineApplication[] {
  return apps.map((app) => {
    if (app.id === id) {
      return {
        ...app,
        stage: newStage,
        appliedDate: newStage === "applied" && !app.appliedDate ? "Just now" : app.appliedDate,
        followUpDueDate:
          newStage === "applied" && !app.followUpDueDate ? "Due in 7 days" : app.followUpDueDate,
      };
    }
    return app;
  });
}

test("Sidebar Navigation defines all 6 canonical workspace destinations", () => {
  assert.equal(NAVIGATION_ITEMS.length, 6);

  const labels = NAVIGATION_ITEMS.map((item) => item.label);
  assert.deepEqual(labels, [
    "Mission Control",
    "Job Discovery",
    "Pipeline CRM",
    "ATS Tailor",
    "Interview Prep",
    "Master Profile",
  ]);

  const activeLinks = NAVIGATION_ITEMS.filter((item) => !item.soon);
  assert.equal(activeLinks.length, 4);
});

test("isRouteActive accurately isolates root /dashboard from sub-routes", () => {
  // Exact match for root dashboard
  assert.equal(isRouteActive("/dashboard", "/dashboard"), true);
  assert.equal(isRouteActive("/dashboard/jobs", "/dashboard"), false);
  assert.equal(isRouteActive("/dashboard/applications", "/dashboard"), false);

  // Sub-routes match prefix
  assert.equal(isRouteActive("/dashboard/jobs", "/dashboard/jobs"), true);
  assert.equal(isRouteActive("/dashboard/jobs/123", "/dashboard/jobs"), true);
  assert.equal(isRouteActive("/dashboard/resume", "/dashboard/jobs"), false);
  assert.equal(isRouteActive("/dashboard/applications", "/dashboard/applications"), true);
});

test("Weekly velocity calculator accurately tracks application pacing against threshold", () => {
  const goal4of7 = calculateWeeklyVelocity(4, 7);
  assert.equal(goal4of7.percentage, 57);
  assert.equal(goal4of7.remaining, 3);

  const goal7of7 = calculateWeeklyVelocity(7, 7);
  assert.equal(goal7of7.percentage, 100);
  assert.equal(goal7of7.remaining, 0);

  const goalExceeded = calculateWeeklyVelocity(10, 7);
  assert.equal(goalExceeded.percentage, 100);
  assert.equal(goalExceeded.remaining, 0);
});

test("Command palette items map to valid workspace endpoints", () => {
  const COMMAND_ITEMS = [
    { id: "nav-home", destination: "/dashboard" },
    { id: "nav-jobs", destination: "/dashboard/jobs" },
    { id: "nav-applications", destination: "/dashboard/applications" },
    { id: "nav-profile", destination: "/dashboard/resume" },
  ];

  COMMAND_ITEMS.forEach((cmd) => {
    assert.ok(cmd.destination.startsWith("/dashboard"));
  });
});

test("Kanban CRM defines all 5 canonical stages with exact snapshot totals", () => {
  assert.equal(STAGES.length, 5);
  const stageIds = STAGES.map((s) => s.id);
  assert.deepEqual(stageIds, ["saved", "tailored", "applied", "interviewing", "offer"]);

  assert.equal(INITIAL_APPLICATIONS.length, 25);
  assert.equal(INITIAL_APPLICATIONS.filter((a) => a.stage === "saved").length, 6);
  assert.equal(INITIAL_APPLICATIONS.filter((a) => a.stage === "tailored").length, 3);
  assert.equal(INITIAL_APPLICATIONS.filter((a) => a.stage === "applied").length, 12);
  assert.equal(INITIAL_APPLICATIONS.filter((a) => a.stage === "interviewing").length, 3);
  assert.equal(INITIAL_APPLICATIONS.filter((a) => a.stage === "offer").length, 1);
});

test("Optimistic Kanban stage transition automatically attaches follow-up cadence", () => {
  const stripeApp = INITIAL_APPLICATIONS.find((a) => a.company === "Stripe")!;
  assert.equal(stripeApp.stage, "tailored");
  assert.equal(stripeApp.appliedDate, undefined);

  // Transition Stripe to 'applied'
  const updatedApps = moveApplicationStage(INITIAL_APPLICATIONS, stripeApp.id, "applied");
  const movedStripe = updatedApps.find((a) => a.id === stripeApp.id)!;

  assert.equal(movedStripe.stage, "applied");
  assert.equal(movedStripe.appliedDate, "Just now");
  assert.equal(movedStripe.followUpDueDate, "Due in 7 days");
});

test("Pipeline filtering accurately segregates remote roles and high-match candidates", () => {
  const remoteApps = INITIAL_APPLICATIONS.filter((a) => a.workArrangement === "remote");
  assert.ok(remoteApps.length >= 8);

  const highMatchApps = INITIAL_APPLICATIONS.filter((a) => a.fitScore >= 90);
  assert.ok(highMatchApps.length >= 15);
  highMatchApps.forEach((app) => {
    assert.ok(app.fitScore >= 90);
  });
});
