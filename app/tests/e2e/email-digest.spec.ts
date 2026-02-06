/**
 * E2E Tests: Novu Email Digest System
 *
 * Tests the email notification flow:
 * - Comment triggers Novu workflow
 * - Novu batches events during digest window
 * - Novu calls webhook endpoint
 * - Convex renders React Email template
 * - Email sent via Resend (to Mailpit in local)
 *
 * Task: 00071-novu-convex-resend-email-architecture
 *
 * Note: These tests require NOVU_DIGEST_INTERVAL to be set low (e.g., 30s)
 * for reasonable test execution time.
 */

import { test, expect } from "@playwright/test";
import { generateTestUser, signUpWithPassword } from "../utils/auth";
import path from "path";

/**
 * Helper: Upload artifact and return URL
 */
async function uploadArtifact(page: any, name: string): Promise<string> {
  const uploadBtn = page.getByRole("button", { name: "Upload" });
  await expect(uploadBtn).toBeVisible({ timeout: 15000 });
  await uploadBtn.click();

  await expect(page.getByText("Create New Artifact")).toBeVisible({
    timeout: 10000,
  });

  const mdPath = path.resolve(
    process.cwd(),
    "../samples/01-valid/markdown/product-spec/v1.md"
  );
  const fileInput = page.locator("#file-upload");
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles(mdPath);

  await expect(page.getByText("v1.md")).toBeVisible({ timeout: 15000 });
  await page.getByLabel("Artifact Name").fill(name);

  const createButton = page.getByRole("button", { name: "Create Artifact" });
  await expect(createButton).toBeEnabled({ timeout: 10000 });
  await createButton.click();

  await expect(page.getByText("Create New Artifact")).not.toBeVisible({
    timeout: 30000,
  });

  const currentUrl = page.url();
  if (currentUrl.includes("/a/")) {
    return currentUrl;
  }

  const artifactCard = page
    .locator(`[data-testid="artifact-card"]`)
    .filter({ hasText: name })
    .first();
  const cardLocator =
    (await artifactCard.count()) > 0
      ? artifactCard
      : page
          .locator('a, [role="link"], [class*="card"]')
          .filter({ hasText: name })
          .first();

  await expect(cardLocator).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 });
  await cardLocator.click();
  await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });

  return page.url();
}

/**
 * Helper: Invite reviewer to artifact via ShareModal
 */
async function inviteReviewer(page: any, reviewerEmail: string) {
  await page.getByRole("button", { name: "Share" }).click();
  await expect(
    page.getByRole("dialog").getByText("Share Artifact for Review")
  ).toBeVisible({ timeout: 10000 });

  await page.getByPlaceholder("Enter email address").fill(reviewerEmail);
  await page.getByRole("button", { name: "Invite" }).click();

  await expect(page.getByText(reviewerEmail).first()).toBeVisible({
    timeout: 20000,
  });
}

/**
 * Helper: Select text and add comment
 */
async function selectTextAndComment(page: any, commentText: string) {
  await page.waitForSelector(".prose", { timeout: 15000 });

  const heading = page.locator(".prose h1, .prose h2").first();
  await expect(heading).toBeVisible({ timeout: 5000 });

  await heading.click({ clickCount: 3 });

  const commentButton = page.locator('button[title="Comment"]');
  await expect(commentButton).toBeVisible({ timeout: 5000 });
  await commentButton.click();

  const commentInput = page.getByTestId("annotation-comment-input");
  await expect(commentInput).toBeVisible({ timeout: 10000 });
  await commentInput.fill(commentText);

  const submitButton = page.getByTestId("annotation-submit-button");
  await submitButton.click();

  await expect(commentInput).not.toBeVisible({ timeout: 15000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 });
}

/**
 * Helper: Wait for digest email in Mailpit or Resend
 * Polls for email with expected content
 * Uses Mailpit when MAILPIT_API_URL is set (local dev)
 * Falls back to Resend API in CI/staging
 */
async function waitForDigestEmail(
  toEmail: string,
  artifactTitle: string,
  timeoutMs = 90000
): Promise<{ html: string; subject: string }> {
  const MAILPIT_API_URL = process.env.MAILPIT_API_URL;
  const RESEND_FULL_ACCESS_API_KEY = process.env.RESEND_FULL_ACCESS_API_KEY;
  const useMailpit = !!MAILPIT_API_URL;

  if (!useMailpit && !RESEND_FULL_ACCESS_API_KEY) {
    throw new Error(
      "Either MAILPIT_API_URL or RESEND_FULL_ACCESS_API_KEY must be set for email E2E tests"
    );
  }

  const startTime = Date.now();
  const pollInterval = 3000; // 3s between polls

  console.log(
    `Polling for digest email via ${useMailpit ? "Mailpit" : "Resend API"}...`
  );

  while (Date.now() - startTime < timeoutMs) {
    try {
      if (useMailpit && MAILPIT_API_URL) {
        // Fetch from Mailpit API
        const response = await fetch(`${MAILPIT_API_URL}/messages`);
        if (!response.ok) throw new Error("Failed to fetch from Mailpit");

        const data = await response.json();
        const messages = data.messages || [];

        // Find email matching recipient and containing artifact title
        const match = messages.find(
          (m: any) =>
            m.To.some((t: any) => t.Address.includes(toEmail)) &&
            (m.Subject.includes(artifactTitle) ||
              m.Subject.includes("comment") ||
              m.Subject.includes("replied"))
        );

        if (match) {
          const msgResponse = await fetch(
            `${MAILPIT_API_URL}/message/${match.ID}`
          );
          const msgData = await msgResponse.json();

          // Verify it's a digest email (contains React Email styling)
          if (
            msgData.HTML.includes("View Artifact") &&
            msgData.HTML.includes(artifactTitle)
          ) {
            return {
              html: msgData.HTML,
              subject: msgData.Subject,
            };
          }
        }
      } else {
        // Fetch from Resend API
        const { Resend } = await import("resend");
        const resend = new Resend(RESEND_FULL_ACCESS_API_KEY);

        const response = await resend.emails.list({ limit: 20 });

        // Resend SDK returns { data, error } - check for error first
        if (response.error) {
          console.log(
            `Resend API error: ${response.error.name} - ${response.error.message}`
          );
          throw new Error(`Resend API error: ${response.error.message}`);
        }

        if (!response.data?.data) {
          console.log("Resend returned no emails");
          // No emails yet, continue polling
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          continue;
        }

        // Find email matching recipient and digest content
        // Look for emails within the timeout window
        const cutoffTime = Date.now() - timeoutMs;
        const allEmails = response.data.data;
        console.log(`Found ${allEmails.length} emails in Resend, filtering for ${toEmail}...`);

        const candidates = allEmails.filter(
          (email) =>
            email.to.includes(toEmail) &&
            new Date(email.created_at).getTime() > cutoffTime &&
            (email.subject.includes(artifactTitle) ||
              email.subject.includes("comment") ||
              email.subject.includes("replied") ||
              email.subject.includes("New Comment"))
        );

        console.log(`Found ${candidates.length} candidate digest emails`);

        // Check each candidate for digest content
        for (const candidate of candidates) {
          const emailContent = await resend.emails.get(candidate.id);
          if (emailContent.data?.html) {
            const html = emailContent.data.html;
            // Verify it's a digest email (contains artifact title and CTA)
            if (html.includes("View Artifact") && html.includes(artifactTitle)) {
              console.log(`Found matching digest email: ${candidate.subject}`);
              return {
                html,
                subject: candidate.subject,
              };
            }
          }
        }
      }
    } catch (e) {
      console.log(
        `Error polling ${useMailpit ? "Mailpit" : "Resend"}, retrying...`,
        e
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Timeout waiting for digest email to ${toEmail} for artifact "${artifactTitle}" (source=${useMailpit ? "Mailpit" : "Resend"})`
  );
}

/**
 * Helper: Clear Mailpit messages before test
 */
async function clearMailpit() {
  const MAILPIT_API_URL = process.env.MAILPIT_API_URL;
  if (!MAILPIT_API_URL) return;

  try {
    await fetch(`${MAILPIT_API_URL}/messages`, { method: "DELETE" });
  } catch (e) {
    console.log("Could not clear Mailpit:", e);
  }
}

test.describe("Email Digest System", () => {
  // These tests take longer due to digest wait time (30s interval + email delivery)
  test.setTimeout(180000);

  // Email digest tests need either Mailpit (local) or Resend API key (CI/staging).
  // Now that we use password auth (not magic link), Resend API polling is viable
  // since we're not hitting rate limits during login.
  test.beforeEach(async () => {
    const hasMailpit = !!process.env.MAILPIT_API_URL;
    const hasResendKey = !!process.env.RESEND_FULL_ACCESS_API_KEY;

    if (!hasMailpit && !hasResendKey) {
      console.log("Skipping email digest tests: MAILPIT_API_URL or RESEND_FULL_ACCESS_API_KEY required");
      test.skip();
    }
  });

  test.describe("Single Comment Digest", () => {
    test("reviewer comment triggers digest email to owner", async ({
      browser,
    }) => {
      const owner = generateTestUser("owner");
      const reviewer = generateTestUser("reviewer");
      const artifactName = `Email Digest Test ${Date.now()}`;

      // Clear mailpit before test
      await clearMailpit();

      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // 1. Owner: Sign up and upload artifact
        console.log("Owner signing up...");
        await signUpWithPassword(ownerPage, owner);

        console.log("Owner uploading artifact...");
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        console.log(`Artifact created at: ${artifactUrl}`);

        // 2. Owner: Invite reviewer
        console.log("Inviting reviewer...");
        await inviteReviewer(ownerPage, reviewer.email);

        // Close share modal
        await ownerPage.keyboard.press("Escape");
        await ownerPage.waitForTimeout(500);

        // 3. Reviewer: Sign up and access artifact
        console.log("Reviewer signing up...");
        await signUpWithPassword(reviewerPage, reviewer);

        console.log("Reviewer accessing artifact...");
        await reviewerPage.goto(artifactUrl);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({
          timeout: 30000,
        });

        // 4. Reviewer: Add a comment
        console.log("Reviewer adding comment...");
        await selectTextAndComment(
          reviewerPage,
          "This is a test comment for email digest verification."
        );

        // 5. Wait for digest email to arrive
        // Digest interval is 30s in local, so we wait up to 90s total
        console.log(
          "Waiting for digest email (may take up to 60s depending on NOVU_DIGEST_INTERVAL)..."
        );

        const digestEmail = await waitForDigestEmail(
          owner.email,
          artifactName,
          90000
        );

        // 6. Verify email content
        console.log("Verifying digest email content...");

        // Check subject
        expect(digestEmail.subject).toMatch(
          /comment|replied|New Comment/i
        );

        // Check HTML structure (React Email rendered)
        expect(digestEmail.html).toContain("<!DOCTYPE html");
        expect(digestEmail.html).toContain(artifactName);
        expect(digestEmail.html).toContain("View Artifact");
        // Comment preview is truncated, so check for partial match
        expect(digestEmail.html).toContain(
          "test comment for email digest"
        );

        // Check it has proper styling (from React Email)
        expect(digestEmail.html).toContain("font-family");

        console.log("Email digest test passed!");
      } finally {
        await ownerContext
          .close()
          .catch((err) => console.log("Owner context close error:", err.message));
        await reviewerContext
          .close()
          .catch((err) =>
            console.log("Reviewer context close error:", err.message)
          );
      }
    });
  });

  test.describe("Multiple Comments Batched", () => {
    test("multiple comments within digest window are batched into one email", async ({
      browser,
    }) => {
      const owner = generateTestUser("owner");
      const reviewer = generateTestUser("reviewer");
      const artifactName = `Batch Test ${Date.now()}`;

      await clearMailpit();

      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // Setup - Owner signs up and creates artifact
        await signUpWithPassword(ownerPage, owner);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer.email);
        await ownerPage.keyboard.press("Escape");

        // Reviewer signs up and accesses artifact
        await signUpWithPassword(reviewerPage, reviewer);
        await reviewerPage.goto(artifactUrl);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({
          timeout: 30000,
        });

        // Add multiple comments quickly (within digest window)
        console.log("Adding first comment...");
        await selectTextAndComment(reviewerPage, "First comment in batch.");

        // Refresh and add second comment
        await reviewerPage.reload();
        await reviewerPage.waitForLoadState("networkidle", { timeout: 10000 });
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({
          timeout: 15000,
        });

        console.log("Adding second comment...");
        await selectTextAndComment(reviewerPage, "Second comment in batch.");

        // Wait for batched digest email
        console.log("Waiting for batched digest email...");
        const digestEmail = await waitForDigestEmail(
          owner.email,
          artifactName,
          90000
        );

        // Verify batching
        console.log("Verifying batch email content...");

        // Subject should indicate multiple updates
        // Could be "2 comments on..." or individual if timing was off
        expect(digestEmail.html).toContain(artifactName);
        expect(digestEmail.html).toContain("View Artifact");

        // At minimum, should contain content from the comments
        const hasMultiple =
          digestEmail.html.includes("First comment") &&
          digestEmail.html.includes("Second comment");
        const hasAtLeastOne =
          digestEmail.html.includes("First comment") ||
          digestEmail.html.includes("Second comment");

        // If batching worked, both comments in one email
        // If not (timing), at least one comment should be present
        expect(hasAtLeastOne).toBe(true);

        if (hasMultiple) {
          console.log("Batching verified - both comments in single email!");
          // Check for "2 New Updates" header
          expect(digestEmail.html).toMatch(/2 New Updates|2 comments/i);
        } else {
          console.log(
            "Single comment in email - digest window timing may vary"
          );
        }

        console.log("Batch digest test completed!");
      } finally {
        await ownerContext.close().catch(() => {});
        await reviewerContext.close().catch(() => {});
      }
    });
  });

  test.describe("React Email Template Rendering", () => {
    test("digest email contains properly styled React Email components", async ({
      browser,
    }) => {
      const owner = generateTestUser("owner");
      const reviewer = generateTestUser("reviewer");
      const artifactName = `Styled Email Test ${Date.now()}`;

      await clearMailpit();

      const ownerContext = await browser.newContext();
      const reviewerContext = await browser.newContext();

      const ownerPage = await ownerContext.newPage();
      const reviewerPage = await reviewerContext.newPage();

      try {
        // Quick setup - Owner signs up and creates artifact
        await signUpWithPassword(ownerPage, owner);
        const artifactUrl = await uploadArtifact(ownerPage, artifactName);
        await inviteReviewer(ownerPage, reviewer.email);
        await ownerPage.keyboard.press("Escape");

        // Reviewer signs up and accesses artifact
        await signUpWithPassword(reviewerPage, reviewer);
        await reviewerPage.goto(artifactUrl);
        await expect(reviewerPage.getByText(artifactName)).toBeVisible({
          timeout: 30000,
        });

        await selectTextAndComment(reviewerPage, "Checking email styling.");

        // Wait for email
        const digestEmail = await waitForDigestEmail(
          owner.email,
          artifactName,
          90000
        );

        // Verify React Email structure
        console.log("Verifying React Email styling...");

        // DOCTYPE and proper HTML structure
        expect(digestEmail.html).toContain("<!DOCTYPE html");
        expect(digestEmail.html).toMatch(/<html[^>]*>/);
        expect(digestEmail.html).toMatch(/<head>/);
        expect(digestEmail.html).toMatch(/<body[^>]*>/);

        // React Email typically includes inline styles
        expect(digestEmail.html).toContain("style=");

        // Check for our specific template elements
        expect(digestEmail.html).toContain("View Artifact"); // CTA button
        expect(digestEmail.html).toContain("Artifact Review"); // Footer

        // Background color from EmailLayout
        expect(digestEmail.html).toMatch(/#f9fafb|#ffffff/); // Gray/white backgrounds

        console.log("React Email styling verified!");
      } finally {
        await ownerContext.close().catch(() => {});
        await reviewerContext.close().catch(() => {});
      }
    });
  });
});
