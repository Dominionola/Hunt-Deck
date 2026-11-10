import test from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_SOCIAL_POSTS } from "../../src/features/jobs/data/socialHiringPosts";
import { SocialHiringPost } from "../../src/features/jobs/types/socialHiring";

/**
 * Unit tests for TASK-024I: Social Hiring Post Ingestion,
 * Card Contracts, and 1-Click Clipboard Pitch Generator.
 */

test("Social Hiring Posts define all required founder & recruiter fields", () => {
  assert.ok(SAMPLE_SOCIAL_POSTS.length >= 4);

  SAMPLE_SOCIAL_POSTS.forEach((post: SocialHiringPost) => {
    assert.ok(post.id);
    assert.ok(post.authorName);
    assert.ok(post.authorRole);
    assert.ok(post.authorCompany);
    assert.ok(post.platform === "linkedin" || post.platform === "x");
    assert.ok(post.targetRole);
    assert.ok(post.fitScore >= 80);
    assert.ok(post.postContent.length > 20);
    assert.ok(post.highlightedKeywords.length >= 2);
  });
});

test("Every Social Hiring Post provides a concise, tailored outreach pitch", () => {
  SAMPLE_SOCIAL_POSTS.forEach((post: SocialHiringPost) => {
    assert.ok(post.tailoredPitch.length > 40);
    // Pitch should greet the author by first name
    const firstName = post.authorName.split(" ")[0];
    assert.ok(
      post.tailoredPitch.includes(firstName),
      `Expected pitch to mention ${firstName}`
    );
  });
});

test("Original post URLs point to canonical social platforms", () => {
  SAMPLE_SOCIAL_POSTS.forEach((post: SocialHiringPost) => {
    if (post.platform === "linkedin") {
      assert.ok(post.originalPostUrl.startsWith("https://linkedin.com/"));
    } else if (post.platform === "x") {
      assert.ok(post.originalPostUrl.startsWith("https://x.com/"));
    }
  });
});

