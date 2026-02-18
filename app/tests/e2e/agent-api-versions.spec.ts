import { test, expect } from '@playwright/test';
import { generateTestUser, signUpWithPassword } from '../utils/auth';
import path from 'path';

/**
 * Agent API Version Management E2E Tests
 *
 * Verifies full lifecycle of version management via the Agent API:
 * 1. List versions (GET /api/v1/artifacts/:shareToken/versions)
 * 2. Publish new version (POST /api/v1/artifacts/:shareToken/versions)
 * 3. Rename version (PATCH /api/v1/artifacts/:shareToken/versions/:n)
 * 4. Soft-delete version (DELETE /api/v1/artifacts/:shareToken/versions/:n)
 * 5. Restore version (POST /api/v1/artifacts/:shareToken/versions/:n/restore)
 */

test.describe('Agent API Version Management', () => {
    let user: { name: string; email: string; password: string };
    let shareToken: string;
    let apiKey: string;
    let baseUrl: string;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(90000);
        user = generateTestUser('version-tester');

        const context = await browser.newContext();
        const page = await context.newPage();

        // 1. Sign up
        await signUpWithPassword(page, user);

        // 2. Create Artifact
        const uploadBtn = page.getByRole('button', { name: 'Upload' });
        await expect(uploadBtn).toBeVisible({ timeout: 30000 });
        await uploadBtn.click();

        await expect(page.getByText('Create New Artifact')).toBeVisible({ timeout: 30000 });
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        const fileInput = page.locator('#file-upload');
        await expect(fileInput).toBeAttached({ timeout: 30000 });
        await fileInput.setInputFiles(zipPath);
        await expect(page.getByText('mixed-media-sample.zip')).toBeVisible({ timeout: 30000 });
        await page.getByLabel('Artifact Name').fill('Version Test Artifact');
        const createBtn = page.getByRole('button', { name: 'Create Artifact' });
        await expect(createBtn).toBeEnabled({ timeout: 30000 });
        await createBtn.click();

        await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });
        const urlParts = page.url().split('/');
        shareToken = urlParts[urlParts.length - 1];

        // 3. Generate API Key
        await page.goto('/settings');
        await page.waitForLoadState('domcontentloaded');

        const developerTab = page.getByRole('link', { name: 'Developer' });
        await expect(developerTab).toBeVisible({ timeout: 30000 });
        await developerTab.click();

        const generateBtn = page.getByRole('button', { name: 'Generate Key' });
        await expect(generateBtn).toBeVisible({ timeout: 30000 });
        await generateBtn.click();
        await page.getByLabel('Key Name').fill('Version Test Key');
        const generateDialogBtn = page.getByRole('button', { name: 'Generate' });
        await expect(generateDialogBtn).toBeEnabled({ timeout: 30000 });
        await generateDialogBtn.click();

        await expect(page.getByText('Key Generated Successfully')).toBeVisible({ timeout: 30000 });
        const keyInput = page.locator('input[readonly]').last();
        apiKey = await keyInput.inputValue();
        expect(apiKey).toBeTruthy();

        baseUrl = process.env.NEXT_PUBLIC_CONVEX_HTTP_URL || 'https://james.convex.site.loc';

        await context.close();
    });

    test('Full version lifecycle: list, publish, rename, delete, restore', async ({ request }) => {
        test.setTimeout(60000);
        const headers = { 'X-API-Key': apiKey };

        // 1. List versions - should have v1 from artifact creation
        const listRes1 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, { headers });
        expect(listRes1.status()).toBe(200);
        const listJson1 = await listRes1.json();
        expect(listJson1.versions).toHaveLength(1);
        expect(listJson1.versions[0].number).toBe(1);
        expect(listJson1.versions[0].isLatest).toBe(true);
        expect(listJson1.versions[0].fileType).toBeTruthy();

        // 2. Publish v2
        const v2Res = await request.post(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, {
            headers,
            data: {
                fileType: "html",
                content: "<h1>Version 2</h1>",
                name: "Second draft",
            }
        });
        expect(v2Res.status()).toBe(201);
        const v2Json = await v2Res.json();
        expect(v2Json.number).toBe(2);
        expect(v2Json.versionId).toBeTruthy();

        // 3. Publish v3
        const v3Res = await request.post(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, {
            headers,
            data: {
                fileType: "html",
                content: "<h1>Version 3</h1>",
            }
        });
        expect(v3Res.status()).toBe(201);
        expect((await v3Res.json()).number).toBe(3);

        // 4. List all - should have 3 versions
        const listRes2 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, { headers });
        const listJson2 = await listRes2.json();
        expect(listJson2.versions).toHaveLength(3);
        expect(listJson2.versions[2].isLatest).toBe(true);
        expect(listJson2.versions[0].isLatest).toBe(false);

        // 5. Rename v3
        const renameRes = await request.patch(`${baseUrl}/api/v1/artifacts/${shareToken}/versions/3`, {
            headers,
            data: { name: "Final Version" }
        });
        expect(renameRes.status()).toBe(200);

        // Verify rename
        const listRes3 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, { headers });
        const v3After = (await listRes3.json()).versions.find((v: any) => v.number === 3);
        expect(v3After.name).toBe("Final Version");

        // 6. Soft-delete v2
        const deleteRes = await request.delete(`${baseUrl}/api/v1/artifacts/${shareToken}/versions/2`, { headers });
        expect(deleteRes.status()).toBe(200);

        // Verify v2 is excluded from list
        const listRes4 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, { headers });
        const listJson4 = await listRes4.json();
        expect(listJson4.versions).toHaveLength(2);
        expect(listJson4.versions.find((v: any) => v.number === 2)).toBeUndefined();

        // 7. Restore v2
        const restoreRes = await request.post(`${baseUrl}/api/v1/artifacts/${shareToken}/versions/2/restore`, {
            headers,
        });
        expect(restoreRes.status()).toBe(200);

        // Verify v2 is back
        const listRes5 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, { headers });
        const listJson5 = await listRes5.json();
        expect(listJson5.versions).toHaveLength(3);
        expect(listJson5.versions.find((v: any) => v.number === 2)).toBeDefined();

        // 8. Last-version protection: try deleting both v2 and v3, then v1
        await request.delete(`${baseUrl}/api/v1/artifacts/${shareToken}/versions/2`, { headers });
        await request.delete(`${baseUrl}/api/v1/artifacts/${shareToken}/versions/3`, { headers });

        const lastDeleteRes = await request.delete(`${baseUrl}/api/v1/artifacts/${shareToken}/versions/1`, { headers });
        expect(lastDeleteRes.status()).toBe(400);
        const lastDeleteJson = await lastDeleteRes.json();
        expect(lastDeleteJson.error).toContain("last active version");
    });

    test('Authorization: requires valid API key', async ({ request }) => {
        // No key
        const noKeyRes = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`);
        expect(noKeyRes.status()).toBe(401);

        // Invalid key
        const badKeyRes = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, {
            headers: { 'X-API-Key': 'ar_live_invalid_key_12345' }
        });
        expect(badKeyRes.status()).toBe(401);
    });

    test('Validation: rejects invalid inputs', async ({ request }) => {
        const headers = { 'X-API-Key': apiKey };

        // Invalid version number in rename
        const badVersionRes = await request.patch(`${baseUrl}/api/v1/artifacts/${shareToken}/versions/0`, {
            headers,
            data: { name: "Bad" }
        });
        expect(badVersionRes.status()).toBe(400);

        // Non-existent version in delete
        const notFoundRes = await request.delete(`${baseUrl}/api/v1/artifacts/${shareToken}/versions/999`, { headers });
        expect(notFoundRes.status()).toBe(400);

        // Missing required fields in create
        const missingFieldsRes = await request.post(`${baseUrl}/api/v1/artifacts/${shareToken}/versions`, {
            headers,
            data: { fileType: "html" } // Missing content
        });
        expect(missingFieldsRes.status()).toBe(400);
    });
});
