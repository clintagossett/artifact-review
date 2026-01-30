
import { Resend } from 'resend';

/**
 * Resend client for email retrieval in tests.
 * - Local dev: Uses dummy key from .env (emails fetched from Mailpit instead)
 * - Hosted: Uses real Resend API key for email verification
 */
const resend = new Resend(process.env.RESEND_FULL_ACCESS_API_KEY || process.env.RESEND_API_KEY);

/**
 * Mailpit API URL from environment.
 * Set MAILPIT_API_URL in .env.local for local development:
 *   - DNS routing: http://{agent}.mailpit.loc/api/v1
 *   - Direct port: http://localhost:8025/api/v1
 * Leave unset for hosted environments (uses Resend API instead).
 */
const MAILPIT_API_URL = process.env.MAILPIT_API_URL;

export async function getLatestEmail(toEmail: string, subjectFilter?: string) {
    // Use Mailpit if MAILPIT_API_URL is explicitly set (local dev)
    // Otherwise use Resend API (hosted environments)
    const useMailpit = !!MAILPIT_API_URL;

    // Wait a bit for email to arrive
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds total
    const delayMs = 1000;

    while (attempts < maxAttempts) {
        try {
            if (useMailpit && MAILPIT_API_URL) {
                // Fetch from Mailpit API
                const response = await fetch(`${MAILPIT_API_URL}/messages`);
                if (!response.ok) throw new Error('Failed to fetch from Mailpit');

                const data = await response.json();
                const messages = data.messages || [];

                // Find matching email
                const match = messages.find((m: any) =>
                    m.To.some((t: any) => t.Address.includes(toEmail)) &&
                    (!subjectFilter || m.Subject.includes(subjectFilter))
                );

                if (match) {
                    // Fetch full message content
                    const msgResponse = await fetch(`${MAILPIT_API_URL}/message/${match.ID}`);
                    const msgData = await msgResponse.json();
                    return {
                        html: msgData.HTML,
                        subject: msgData.Subject,
                        from: msgData.From.Address,
                        to: msgData.To[0].Address,
                    };
                }
            } else {
                // Fetch from Resend API
                const response = await resend.emails.list({
                    limit: 10,
                });

                if (!response.data) {
                    throw new Error('No data in resend response');
                }

                const recentEmail = response.data.data.find((email) =>
                    email.to.includes(toEmail) &&
                    (!subjectFilter || email.subject.includes(subjectFilter)) &&
                    new Date(email.created_at).getTime() > Date.now() - 60000 // Within last minute
                );

                if (recentEmail) {
                    const emailContent = await resend.emails.get(recentEmail.id);
                    return emailContent.data;
                }
            }
        } catch (e) {
            console.log('Error fetching emails, retrying...', e);
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
    }

    throw new Error(`Timeout waiting for email to ${toEmail} (source=${useMailpit ? 'Mailpit' : 'Resend'})`);
}

export function extractMagicLink(htmlContent: string): string | null {
    // Look for the magic link pattern (adjust based on your actual email template)
    // The template has: <a href="${url}" ...>Sign in to Artifact Review</a>
    // And also a raw link

    // Regex to find the href inside the specific anchor or just the raw URL
    // The raw URL is also present in the text body usually, but we have HTML here.

    // Let's try to match the href in the anchor tag
    const linkMatch = htmlContent.match(/href="([^"]*verify[^"]*)"/);
    // Wait, the convex auth magic link usually looks like .../verify?token=... or similar?
    // Looking at auth.ts: <a href="${url}"
    // The url comes from convex auth. 

    // Let's just look for any http link that looks like our app url + verify? or similar
    // OR just find the link in the "Sign in to Artifact Review" button

    const match = htmlContent.match(/href="([^"]+)"[^>]*>\s*Sign in to Artifact Review/);
    if (match && match[1]) {
        return match[1];
    }

    // Fallback: look for the raw link printed in the email
    // <a href="${url}" style="color: #666;">${url}</a>
    const rawMatch = htmlContent.match(/>(http[^<]+)<\/a>/);
    if (rawMatch && rawMatch[1]) {
        return rawMatch[1];
    }

    return null;
}
