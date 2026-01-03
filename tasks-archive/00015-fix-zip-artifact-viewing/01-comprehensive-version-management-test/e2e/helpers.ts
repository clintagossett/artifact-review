/**
 * E2E Test Helpers for Real Backend API Testing
 *
 * These helpers make REAL HTTP requests to the Convex backend
 * (no mocks, no test doubles - actual API calls).
 */

import { APIRequestContext } from '@playwright/test';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../app/convex/_generated/api';

/**
 * Sample file paths (relative to project root)
 */
const SAMPLES_DIR = join(__dirname, '../../../samples');

export const SAMPLE_PATHS = {
  charting: {
    v1: join(SAMPLES_DIR, '01-valid/zip/charting/v1.zip'),
    v2: join(SAMPLES_DIR, '01-valid/zip/charting/v2.zip'),
    v3: join(SAMPLES_DIR, '01-valid/zip/charting/v3.zip'),
    v4: join(SAMPLES_DIR, '01-valid/zip/charting/v4.zip'),
    v5: join(SAMPLES_DIR, '01-valid/zip/charting/v5.zip'),
  },
};

/**
 * Get Convex deployment URL from environment
 */
export function getConvexUrl(): string {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      'CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required for E2E tests'
    );
  }
  return url;
}

/**
 * Create a Convex HTTP client for making API calls
 */
export function createConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(getConvexUrl());
}

/**
 * Create a test user via Convex API
 *
 * Returns: { userId, token }
 */
export async function createTestUser(
  email = `test-${Date.now()}@example.com`
): Promise<{ userId: string; token: string | null }> {
  const client = createConvexClient();

  try {
    // For E2E tests, we need a real user creation flow
    // Since we're testing with real backend, we'll use the test auth helper
    // This will require the testAuth.ts helper to be available

    // For now, we'll create a simplified approach:
    // We can't easily create auth tokens in E2E without going through the full auth flow
    // So we'll note this limitation and use unauthenticated calls where possible

    console.warn(
      'E2E tests: User creation requires full auth flow. Tests may need manual user setup.'
    );

    return {
      userId: 'test-user-id',
      token: null,
    };
  } finally {
    client.close();
  }
}

/**
 * Upload a ZIP artifact (full E2E flow)
 *
 * Steps:
 * 1. Call createArtifactWithZip mutation → get uploadUrl
 * 2. Upload ZIP file to uploadUrl
 * 3. Call triggerZipProcessing action
 * 4. Poll until processing complete
 *
 * Returns: { artifactId, versionId, versionNumber, shareToken }
 */
export async function uploadZipArtifact(
  request: APIRequestContext,
  samplePath: string,
  title = 'Test Artifact',
  authToken?: string
): Promise<{
  artifactId: string;
  versionId: string;
  versionNumber: number;
  shareToken: string;
}> {
  const client = createConvexClient();

  try {
    // Load sample ZIP file
    const zipBuffer = await readFile(samplePath);
    const fileSize = zipBuffer.length;

    // Step 1: Create artifact with ZIP type
    const createResult = (await client.mutation(api.zipUpload.createArtifactWithZip, {
      title,
      description: 'E2E test artifact',
      fileSize,
      entryPoint: 'index.html',
    })) as {
      uploadUrl: string;
      artifactId: string;
      versionId: string;
      shareToken: string;
    };

    const { uploadUrl, artifactId, versionId, shareToken } = createResult;

    // Step 2: Upload ZIP file to storage
    const uploadResponse = await request.post(uploadUrl, {
      data: zipBuffer,
      headers: {
        'Content-Type': 'application/zip',
      },
    });

    if (!uploadResponse.ok()) {
      throw new Error(`Upload failed: ${uploadResponse.status()}`);
    }

    const uploadData = await uploadResponse.json();
    const storageId = uploadData.storageId;

    // Step 3: Trigger ZIP processing
    await client.action(api.zipUpload.triggerZipProcessing, {
      versionId,
      storageId,
    });

    // Step 4: Wait for processing to complete
    // Poll until files are extracted
    await waitForFilesExtracted(client, versionId, { maxAttempts: 20, delayMs: 500 });

    return {
      artifactId,
      versionId,
      versionNumber: 1,
      shareToken,
    };
  } finally {
    client.close();
  }
}

/**
 * Upload a new version to an existing artifact
 */
export async function uploadZipVersion(
  request: APIRequestContext,
  artifactId: string,
  samplePath: string,
  authToken?: string
): Promise<{
  versionId: string;
  versionNumber: number;
}> {
  const client = createConvexClient();

  try {
    // Load sample ZIP file
    const zipBuffer = await readFile(samplePath);
    const fileSize = zipBuffer.length;

    // Add new version
    const addVersionResult = (await client.mutation(api.artifacts.addVersion, {
      artifactId,
      fileType: 'zip',
      entryPoint: 'index.html',
      fileSize,
    })) as {
      versionId: string;
      versionNumber: number;
      uploadUrl: string;
    };

    const { versionId, versionNumber, uploadUrl } = addVersionResult;

    // Upload ZIP to storage
    const uploadResponse = await request.post(uploadUrl, {
      data: zipBuffer,
      headers: {
        'Content-Type': 'application/zip',
      },
    });

    if (!uploadResponse.ok()) {
      throw new Error(`Upload failed: ${uploadResponse.status()}`);
    }

    const uploadData = await uploadResponse.json();
    const storageId = uploadData.storageId;

    // Trigger processing
    await client.action(api.zipUpload.triggerZipProcessing, {
      versionId,
      storageId,
    });

    // Wait for processing
    await waitForFilesExtracted(client, versionId, { maxAttempts: 20, delayMs: 500 });

    return {
      versionId,
      versionNumber,
    };
  } finally {
    client.close();
  }
}

/**
 * Get artifact by ID
 */
export async function getArtifact(artifactId: string): Promise<any> {
  const client = createConvexClient();
  try {
    return await client.query(api.artifacts.get, { id: artifactId });
  } finally {
    client.close();
  }
}

/**
 * Get artifact by share token
 */
export async function getArtifactByShareToken(shareToken: string): Promise<any> {
  const client = createConvexClient();
  try {
    return await client.query(api.artifacts.getByShareToken, { shareToken });
  } finally {
    client.close();
  }
}

/**
 * Get version by ID
 */
export async function getVersion(versionId: string): Promise<any> {
  const client = createConvexClient();
  try {
    return await client.query(api.artifacts.getVersion, { versionId });
  } finally {
    client.close();
  }
}

/**
 * Get all versions for an artifact
 */
export async function getVersions(artifactId: string): Promise<any[]> {
  const client = createConvexClient();
  try {
    return await client.query(api.artifacts.getVersions, { artifactId });
  } finally {
    client.close();
  }
}

/**
 * Get files for a version
 */
export async function getFilesByVersion(versionId: string): Promise<any[]> {
  const client = createConvexClient();
  try {
    return await client.query(api.artifacts.getFilesByVersion, { versionId });
  } finally {
    client.close();
  }
}

/**
 * Soft delete a version
 */
export async function softDeleteVersion(
  versionId: string,
  authToken?: string
): Promise<void> {
  const client = createConvexClient();
  try {
    await client.mutation(api.artifacts.softDeleteVersion, { versionId });
  } finally {
    client.close();
  }
}

/**
 * Soft delete an artifact
 */
export async function softDeleteArtifact(
  artifactId: string,
  authToken?: string
): Promise<void> {
  const client = createConvexClient();
  try {
    await client.mutation(api.artifacts.softDelete, { id: artifactId });
  } finally {
    client.close();
  }
}

/**
 * Wait for files to be extracted from ZIP
 */
async function waitForFilesExtracted(
  client: ConvexHttpClient,
  versionId: string,
  options: { maxAttempts: number; delayMs: number }
): Promise<void> {
  for (let i = 0; i < options.maxAttempts; i++) {
    const files = (await client.query(api.artifacts.getFilesByVersion, {
      versionId,
    })) as any[];

    if (files.length > 0) {
      // Files have been extracted
      return;
    }

    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, options.delayMs));
  }

  throw new Error(
    `Timeout waiting for files to be extracted for version ${versionId}`
  );
}

/**
 * Make HTTP request to artifact file endpoint
 *
 * GET /artifact/{shareToken}/v{version}/{filePath}
 */
export async function getArtifactFile(
  request: APIRequestContext,
  shareToken: string,
  versionNumber: number,
  filePath: string
): Promise<{
  status: number;
  contentType: string | null;
  body: Buffer;
}> {
  // Construct URL: http://localhost:3000/artifact/{shareToken}/v{version}/{filePath}
  const baseUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/artifact/${shareToken}/v${versionNumber}/${filePath}`;

  const response = await request.get(url);

  return {
    status: response.status(),
    contentType: response.headers()['content-type'],
    body: await response.body(),
  };
}

/**
 * List all HTML files for a version
 */
export async function listHtmlFiles(versionId: string): Promise<any[]> {
  const client = createConvexClient();
  try {
    return await client.query(api.artifacts.listHtmlFiles, { versionId });
  } finally {
    client.close();
  }
}
