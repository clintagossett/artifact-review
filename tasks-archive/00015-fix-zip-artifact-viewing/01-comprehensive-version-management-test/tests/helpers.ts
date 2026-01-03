/**
 * Test Helpers for Backend Integration Tests
 *
 * These helpers provide reusable utilities for testing backend APIs
 * using Convex Test and sample data from /samples/.
 */

import { convexTest } from "convex-test";
import { readFile } from "fs/promises";
import { join } from "path";
import { expect } from "vitest";
import schema from "../../../app/convex/schema";
import { api } from "../../../app/convex/_generated/api";
import { internal } from "../../../app/convex/_generated/api";
import type { Id } from "../../../app/convex/_generated/dataModel";

/**
 * Sample paths relative to project root
 */
const SAMPLES_DIR = join(__dirname, "../../../../samples");

export const SAMPLE_PATHS = {
  charting: {
    v1: join(SAMPLES_DIR, "01-valid/zip/charting/v1.zip"),
    v2: join(SAMPLES_DIR, "01-valid/zip/charting/v2.zip"),
    v3: join(SAMPLES_DIR, "01-valid/zip/charting/v3.zip"),
    v4: join(SAMPLES_DIR, "01-valid/zip/charting/v4.zip"),
    v5: join(SAMPLES_DIR, "01-valid/zip/charting/v5.zip"),
  },
  html: {
    v1: join(SAMPLES_DIR, "01-valid/html/simple-html/v1/index.html"),
    v2: join(SAMPLES_DIR, "01-valid/html/simple-html/v2/index.html"),
  },
  markdown: {
    v1: join(SAMPLES_DIR, "01-valid/markdown/product-spec/v1.md"),
  },
};

/**
 * Load a sample file as a Blob
 */
export async function loadSample(path: string): Promise<Blob> {
  const buffer = await readFile(path);
  // Determine MIME type from extension
  let mimeType = "application/octet-stream";
  if (path.endsWith(".zip")) {
    mimeType = "application/zip";
  } else if (path.endsWith(".html")) {
    mimeType = "text/html";
  } else if (path.endsWith(".md")) {
    mimeType = "text/markdown";
  }

  return new Blob([buffer], { type: mimeType });
}

/**
 * Create a test user
 * Returns the user ID
 */
export async function createTestUser(t: any, email = "test@example.com"): Promise<Id<"users">> {
  // Use the simpler approach: insert user directly
  const userId = await t.run(async (ctx: any) => {
    return await ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      name: "Test User",
      username: email.split("@")[0],
    });
  });

  return userId;
}

/**
 * Upload a ZIP artifact (full flow)
 *
 * This simulates the full upload flow:
 * 1. Create artifact with createArtifactWithZip
 * 2. Upload ZIP to storage
 * 3. Trigger ZIP processing
 * 4. Wait for processing to complete
 */
export async function uploadZipArtifact(
  t: any,
  userId: Id<"users">,
  samplePath: string,
  title = "Test Artifact"
): Promise<{
  artifactId: Id<"artifacts">;
  versionId: Id<"artifactVersions">;
  versionNumber: number;
  shareToken: string;
}> {
  // Load sample file
  const zipBlob = await loadSample(samplePath);
  const fileSize = zipBlob.size;

  // Step 1: Create artifact with ZIP type
  const { uploadUrl, artifactId, versionId, shareToken } = await t.mutation(
    api.zipUpload.createArtifactWithZip,
    {
      title,
      description: "Test description",
      fileSize,
      entryPoint: "index.html",
    },
    { asUser: userId }
  );

  // Step 2: Upload ZIP to storage (simulate storage upload)
  // In real tests, we would use the uploadUrl, but for convex-test we can directly insert to storage
  const storageId = await t.run(async (ctx: any) => {
    return await ctx.storage.store(zipBlob);
  });

  // Step 3: Trigger ZIP processing
  await t.action(
    api.zipUpload.triggerZipProcessing,
    {
      versionId,
      storageId,
    },
    { asUser: userId }
  );

  // Step 4: Wait for processing to complete
  // In real implementation, this would poll or wait for status change
  // For now, we'll assume synchronous processing in tests

  return {
    artifactId,
    versionId,
    versionNumber: 1,
    shareToken,
  };
}

/**
 * Upload a new version to an existing artifact
 */
export async function uploadZipVersion(
  t: any,
  userId: Id<"users">,
  artifactId: Id<"artifacts">,
  samplePath: string
): Promise<{
  versionId: Id<"artifactVersions">;
  versionNumber: number;
}> {
  // Load sample file
  const zipBlob = await loadSample(samplePath);
  const fileSize = zipBlob.size;

  // Add new version
  const { versionId, versionNumber } = await t.mutation(
    api.artifacts.addVersion,
    {
      artifactId,
      fileType: "zip",
      entryPoint: "index.html",
      fileSize,
    },
    { asUser: userId }
  );

  // Upload to storage
  const storageId = await t.run(async (ctx: any) => {
    return await ctx.storage.store(zipBlob);
  });

  // Trigger processing
  await t.action(
    api.zipUpload.triggerZipProcessing,
    {
      versionId,
      storageId,
    },
    { asUser: userId }
  );

  return {
    versionId,
    versionNumber,
  };
}

/**
 * Validate version state
 */
export async function validateVersion(
  t: any,
  versionId: Id<"artifactVersions">,
  expected: {
    versionNumber?: number;
    isDeleted?: boolean;
    fileType?: "zip" | "html" | "markdown";
  }
) {
  const version = await t.query(api.artifacts.getVersion, { versionId });

  if (expected.versionNumber !== undefined) {
    expect(version?.versionNumber).toBe(expected.versionNumber);
  }

  if (expected.isDeleted !== undefined) {
    expect(version?.isDeleted).toBe(expected.isDeleted);
  }

  if (expected.fileType !== undefined) {
    expect(version?.fileType).toBe(expected.fileType);
  }

  return version;
}

/**
 * Validate file count for a version
 */
export async function validateFileCount(
  t: any,
  versionId: Id<"artifactVersions">,
  expectedCount: number
) {
  const files = await t.query(api.artifacts.getFilesByVersion, { versionId });
  expect(files).toHaveLength(expectedCount);
  return files;
}

/**
 * Get artifact by ID (for tests)
 */
export async function getArtifact(
  t: any,
  artifactId: Id<"artifacts">
) {
  return await t.query(api.artifacts.get, { id: artifactId });
}

/**
 * Get all versions for an artifact
 */
export async function getVersions(
  t: any,
  artifactId: Id<"artifacts">
) {
  return await t.query(api.artifacts.getVersions, { artifactId });
}

/**
 * Create Convex test instance
 */
export function createTestContext() {
  return convexTest(schema);
}
