import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { verifySameOrigin } from "../../src/lib/security/originCheck";
import { DELETE as deleteAccount } from "../../src/app/api/account/route";
import { PUT as updateResume } from "../../src/app/api/resumes/route";
import { POST as exportTailoredResume } from "../../src/app/api/tailor/export/route";
import { hnSaveJobSchema } from "../../src/lib/validations/hackerNews";

describe("Security Audit Hardening Regression Tests", () => {
  it("verifySameOrigin blocks cross-site Origin and Sec-Fetch-Site headers", () => {
    const crossOriginReq = new Request("https://hunt-deck.example/api/account", {
      method: "DELETE",
      headers: { origin: "https://evil.invalid" },
    });
    const res1 = verifySameOrigin(crossOriginReq);
    assert.ok(res1 !== null);
    assert.equal(res1.status, 403);

    const crossSiteFetchReq = new Request("https://hunt-deck.example/api/account", {
      method: "DELETE",
      headers: { "sec-fetch-site": "cross-site" },
    });
    const res2 = verifySameOrigin(crossSiteFetchReq);
    assert.ok(res2 !== null);
    assert.equal(res2.status, 403);

    const sameOriginReq = new Request("https://hunt-deck.example/api/account", {
      method: "DELETE",
      headers: {
        origin: "https://hunt-deck.example",
        "sec-fetch-site": "same-origin",
      },
    });
    assert.equal(verifySameOrigin(sameOriginReq), null);
  });

  it("blocks cross-origin DELETE /api/account, PUT /api/resumes, and POST /api/tailor/export", async () => {
    const accountRes = await deleteAccount(
      new Request("http://localhost:3000/api/account", {
        method: "DELETE",
        headers: { origin: "https://attacker.invalid" },
      })
    );
    assert.equal(accountRes.status, 403);

    const resumeRes = await updateResume(
      new Request("http://localhost:3000/api/resumes", {
        method: "PUT",
        headers: { "sec-fetch-site": "cross-site" },
        body: "{}",
      })
    );
    assert.equal(resumeRes.status, 403);

    const exportRes = await exportTailoredResume(
      new Request("http://localhost:3000/api/tailor/export", {
        method: "POST",
        headers: { origin: "https://attacker.invalid" },
        body: "{}",
      })
    );
    assert.equal(exportRes.status, 403);
  });

  it("rejects unsafe URL schemes in hnSaveJobSchema", () => {
    const badJs = hnSaveJobSchema.safeParse({
      externalJobId: "hn-1",
      company: "Acme",
      title: "Engineer",
      description: "At least ten chars description.",
      applicationUrl: "javascript:alert(document.cookie)",
    });
    assert.equal(badJs.success, false);

    const badData = hnSaveJobSchema.safeParse({
      externalJobId: "hn-2",
      company: "Acme",
      title: "Engineer",
      description: "At least ten chars description.",
      applicationUrl: "data:text/html,<script>alert(1)</script>",
    });
    assert.equal(badData.success, false);

    const goodHttps = hnSaveJobSchema.safeParse({
      externalJobId: "hn-3",
      company: "Acme",
      title: "Engineer",
      description: "At least ten chars description.",
      applicationUrl: "https://acme.com/jobs/1",
    });
    assert.equal(goodHttps.success, true);

    const goodMailto = hnSaveJobSchema.safeParse({
      externalJobId: "hn-4",
      company: "Acme",
      title: "Engineer",
      description: "At least ten chars description.",
      applicationUrl: "mailto:founder@acme.com",
    });
    assert.equal(goodMailto.success, true);
  });
});
