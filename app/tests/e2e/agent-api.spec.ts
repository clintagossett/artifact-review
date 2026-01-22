import { test, expect } from '@playwright/test';
import { getLatestEmail, extractMagicLink } from '../utils/resend';
import path from 'path';

/**
 * Agent API E2E Tests
 * 
 * Verifies the full lifecycle of an Agent interacting with the platform:
 * 1. User creates an artifact.
 * 2. User generates an API Key.
 * 3. Agent (via script) uses API Key to:
 *    - Discover API via /api/v1/openapi.yaml
 *    - Post a comment.
 *    - Read comments (verify versioning).
 *    - Post a reply.
 *    - Update comment status.
 *    - Delete comment.
 */

const generateUser = (prefix = 'dev') => {
    const timestamp = Date.now();
    return {
        name: `${prefix}-${timestamp}`,
        email: `${prefix}+${timestamp}@tolauante.resend.app`,
    };
};

test.describe('Agent API Integration', () => {
    let user: { name: string; email: string };
    let shareToken: string;
    let apiKey: string;
    let artifactUrl: string;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(90000); // Setup is heavy
        user = generateUser('agent-tester');

        const context = await browser.newContext();
        const page = await context.newPage();

        // 1. Login
        console.log('Logging in...');
        await page.goto('/login');
        await page.getByRole('button', { name: 'Magic Link' }).click();
        await page.getByLabel('Email address').fill(user.email);
        await page.getByRole('button', { name: 'Send Magic Link' }).click();

        const email = await getLatestEmail(user.email);
        expect(email).not.toBeNull();
        const magicLink = extractMagicLink(email!.html);
        await page.goto(magicLink!);
        await expect(page).toHaveURL(/\/dashboard/);

        // 2. Create Artifact
        console.log('Creating artifact...');
        await page.getByRole('button', { name: /Artifact/ }).first().click();
        const zipPath = path.resolve(process.cwd(), '../samples/01-valid/mixed/mixed-media-sample/mixed-media-sample.zip');
        await page.setInputFiles('input[type="file"]', zipPath);
        await page.getByLabel('Artifact Name').fill('Agent Test Artifact');
        await page.getByRole('button', { name: 'Create Artifact' }).click();

        await expect(page).toHaveURL(/\/a\//, { timeout: 30000 });
        artifactUrl = page.url();
        const urlParts = artifactUrl.split('/');
        shareToken = urlParts[urlParts.length - 1]; // /a/:token
        console.log(`Artifact created. Token: ${shareToken}`);

        // 3. Generate API Key
        console.log('Generating API Key...');
        await page.goto('/settings');

        // Switch to Developer tab
        // Use exact text match or look for the button within the sidebar
        await page.getByRole('button', { name: 'Developer' }).click();

        await page.getByRole('button', { name: 'Generate Key' }).click();
        await page.getByLabel('Key Name').fill('E2E Test Key');
        await page.getByRole('button', { name: 'Generate' }).click();

        // Wait for success dialog and copy key
        await expect(page.getByText('Key Generated Successfully')).toBeVisible();
        const keyInput = page.locator('input[readonly]').last(); // The one in the dialog
        apiKey = await keyInput.inputValue();
        expect(apiKey).toBeTruthy();
        console.log('API Key captured.');

        await context.close();
    });

    test('Full CRUD Lifecycle via API', async ({ request }) => {
        const headers = { 'X-API-Key': apiKey };
        const baseUrl = 'http://api.ar.local.com';

        console.log(`Using API Base URL: ${baseUrl}`);

        // 1. Verify Protected Spec Access
        const specParams = await request.get(`${baseUrl}/api/v1/openapi.yaml`, { headers });
        expect(specParams.status()).toBe(200);
        const specText = await specParams.text();
        expect(specText).toContain('Artifact Review Agent API');

        // 2. Post Comment
        const commentData = {
            content: "Hello from Agent",
            target: {
                source: "index.html",
                selector: {
                    type: "TextQuoteSelector",
                    exact: "Integration Test"
                }
            }
        };
        const postRes = await request.post(`${baseUrl}/api/v1/artifacts/${shareToken}/comments`, {
            headers,
            data: commentData
        });
        expect(postRes.status()).toBe(201);
        const postJson = await postRes.json();
        const commentId = postJson.id;
        expect(commentId).toBeTruthy();

        // 3. Get Comments (Verify creation + Version info)
        const getRes = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/comments`, { headers });
        expect(getRes.status()).toBe(200);
        const getJson = await getRes.json();

        expect(getJson.version).toMatch(/^v\d+$/); // Should have version info
        expect(getJson.comments.length).toBeGreaterThan(0);
        const myComment = getJson.comments.find((c: any) => c.id === commentId);
        expect(myComment).toBeDefined();
        expect(myComment.content).toBe("Hello from Agent");

        // 4. Update Comment (Content)
        const patchRes = await request.patch(`${baseUrl}/api/v1/comments/${commentId}`, {
            headers,
            data: { content: "Updated Content" }
        });
        expect(patchRes.status()).toBe(200);

        // Verify Update
        const getRes2 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/comments`, { headers });
        const updatedComment = (await getRes2.json()).comments.find((c: any) => c.id === commentId);
        expect(updatedComment.content).toBe("Updated Content");

        // 5. Reply to Comment
        const replyRes = await request.post(`${baseUrl}/api/v1/comments/${commentId}/replies`, {
            headers,
            data: { content: "This is a reply" }
        });
        expect(replyRes.status()).toBe(201);
        const replyId = (await replyRes.json()).id;

        // Verify Reply
        const getRes3 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/comments`, { headers });
        const parentComment = (await getRes3.json()).comments.find((c: any) => c.id === commentId);
        expect(parentComment.replies).toHaveLength(1);
        expect(parentComment.replies[0].content).toBe("This is a reply");

        // 6. Update Status (Resolve)
        const statusRes = await request.patch(`${baseUrl}/api/v1/comments/${commentId}`, {
            headers,
            data: { resolved: true }
        });
        expect(statusRes.status()).toBe(200);
        // Verify (Fetching again)
        const getRes4 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/comments`, { headers });
        const resolvedComment = (await getRes4.json()).comments.find((c: any) => c.id === commentId);
        expect(resolvedComment.resolved).toBe(true);

        // 7. Delete Reply
        const deleteReplyRes = await request.delete(`${baseUrl}/api/v1/replies/${replyId}`, { headers });
        expect(deleteReplyRes.status()).toBe(200);
        // Verify gone
        const getRes5 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/comments`, { headers });
        const parentCommentAfter = (await getRes5.json()).comments.find((c: any) => c.id === commentId);
        expect(parentCommentAfter.replies).toHaveLength(0); // Should filter out deleted? Or show as deleted?
        // Implementation check: getComments usually filters out deleted.

        // 8. Delete Comment
        const deleteCommentRes = await request.delete(`${baseUrl}/api/v1/comments/${commentId}`, { headers });
        expect(deleteCommentRes.status()).toBe(200);
        // Verify gone
        const getRes6 = await request.get(`${baseUrl}/api/v1/artifacts/${shareToken}/comments`, { headers });
        const deletedComment = (await getRes6.json()).comments.find((c: any) => c.id === commentId);
        expect(deletedComment).toBeUndefined();
    });
});
