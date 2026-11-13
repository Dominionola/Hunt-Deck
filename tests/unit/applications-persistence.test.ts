import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapStageToStatus, toPipelineApplication } from "../../src/services/db/applicationService";
import { GET as getApplications, POST as createApplicationRoute } from "../../src/app/api/applications/route";
import { PATCH as patchApplicationRoute, DELETE as deleteApplicationRoute } from "../../src/app/api/applications/[id]/route";
import { GET as getResumesRoute, PUT as putResumesRoute } from "../../src/app/api/resumes/route";
import { ApplicationStatus, RemotePreference, AtsPlatform } from "@prisma/client";

describe("Live Database Persistence Slice (Applications & Resumes)", () => {
  describe("1. Kanban Stage to Prisma Status Mapping", () => {
    it("maps UI pipeline stages accurately to Prisma ApplicationStatus enum", () => {
      assert.equal(mapStageToStatus("saved"), ApplicationStatus.SAVED);
      assert.equal(mapStageToStatus("tailored"), ApplicationStatus.SAVED);
      assert.equal(mapStageToStatus("applied"), ApplicationStatus.APPLIED);
      assert.equal(mapStageToStatus("interviewing"), ApplicationStatus.INTERVIEWING);
      assert.equal(mapStageToStatus("offer"), ApplicationStatus.OFFER);
    });
  });

  describe("2. Database Record to PipelineApplication Transformation", () => {
    it("accurately converts database records and deserializes metadata", () => {
      const mockRecord = {
        id: "app-123",
        status: ApplicationStatus.INTERVIEWING,
        appliedAt: new Date("2026-11-01T12:00:00Z"),
        interviewNotes: JSON.stringify({
          stage: "interviewing",
          fitScore: 94,
          salary: "$210,000 - $240,000",
          workArrangement: "remote",
          notes: ["Technical screen completed.", "System design scheduled."],
          tags: ["Staff Level", "Distributed Systems"],
          contact: {
            name: "David Chen",
            role: "Platform Lead",
            email: "david@stripe.com",
          },
          portalUrl: "https://stripe.com/jobs/123",
          source: "greenhouse",
        }),
        job: {
          id: "job-123",
          company: "Stripe",
          title: "Staff Systems Engineer",
          location: "Remote US",
          remoteType: RemotePreference.REMOTE_ONLY,
          applicationUrl: "https://stripe.com/jobs/123",
          atsPlatform: AtsPlatform.GREENHOUSE,
        },
      };

      const result = toPipelineApplication(mockRecord);

      assert.equal(result.id, "app-123");
      assert.equal(result.company, "Stripe");
      assert.equal(result.role, "Staff Systems Engineer");
      assert.equal(result.stage, "interviewing");
      assert.equal(result.fitScore, 94);
      assert.equal(result.salary, "$210,000 - $240,000");
      assert.equal(result.workArrangement, "remote");
      assert.equal(result.notes.length, 2);
      assert.equal(result.contact?.name, "David Chen");
      assert.equal(result.source, "greenhouse");
    });

    it("falls back gracefully when metadata is raw text or missing", () => {
      const mockRecordRaw = {
        id: "app-456",
        status: ApplicationStatus.SAVED,
        appliedAt: null,
        interviewNotes: "Legacy plain note",
        job: {
          id: "job-456",
          company: "Linear",
          title: "Senior Product Engineer",
          location: "San Francisco, CA",
          remoteType: RemotePreference.HYBRID,
          applicationUrl: "https://linear.app/careers",
          atsPlatform: AtsPlatform.ASHBY,
        },
      };

      const result = toPipelineApplication(mockRecordRaw);

      assert.equal(result.company, "Linear");
      assert.equal(result.role, "Senior Product Engineer");
      assert.equal(result.stage, "saved");
      assert.equal(result.workArrangement, "hybrid");
      assert.equal(result.notes[0], "Legacy plain note");
      assert.equal(result.source, "ashby");
    });
  });

  describe("3. Server Authentication Enforcement on Application Routes", () => {
    it("rejects unauthenticated GET /api/applications with 401 Unauthorized", async () => {
      const res = await getApplications();
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.error, "Authentication required.");
    });

    it("rejects unauthenticated POST /api/applications with 401 Unauthorized", async () => {
      const req = new Request("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "Stripe", role: "Staff Engineer" }),
      });
      const res = await createApplicationRoute(req);
      assert.equal(res.status, 401);
    });

    it("rejects unauthenticated PATCH /api/applications/[id] with 401 Unauthorized", async () => {
      const req = new Request("http://localhost:3000/api/applications/app-1", {
        method: "PATCH",
        body: JSON.stringify({ stage: "applied" }),
      });
      const res = await patchApplicationRoute(req, {
        params: Promise.resolve({ id: "app-1" }),
      });
      assert.equal(res.status, 401);
    });

    it("rejects unauthenticated DELETE /api/applications/[id] with 401 Unauthorized", async () => {
      const req = new Request("http://localhost:3000/api/applications/app-1", {
        method: "DELETE",
      });
      const res = await deleteApplicationRoute(req, {
        params: Promise.resolve({ id: "app-1" }),
      });
      assert.equal(res.status, 401);
    });
  });

  describe("4. Server Authentication Enforcement on Resume Routes", () => {
    it("rejects unauthenticated GET /api/resumes with 401 Unauthorized", async () => {
      const res = await getResumesRoute();
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.error, "Authentication required.");
    });

    it("rejects unauthenticated PUT /api/resumes with 401 Unauthorized", async () => {
      const req = new Request("http://localhost:3000/api/resumes", {
        method: "PUT",
        body: JSON.stringify({ parsedData: { skills: ["TypeScript"] } }),
      });
      const res = await putResumesRoute(req);
      assert.equal(res.status, 401);
    });
  });
});

