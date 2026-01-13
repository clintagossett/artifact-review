
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_FULL_ACCESS_API_KEY || process.env.RESEND_API_KEY);

export async function getLatestEmail(toEmail: string) {
    // Wait a bit for email to arrive
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds total
    const delayMs = 1000;

    while (attempts < maxAttempts) {
        try {
            const response = await resend.emails.list({
                limit: 10,
            });

            if (!response.data) {
                throw new Error('No data in resend response');
            }

            // Filter for the specific email
            // Note: In a real test env, we might want to be more specific with subject/time
            const recentEmail = response.data.data.find((email) =>
                email.to.includes(toEmail) &&
                new Date(email.created_at).getTime() > Date.now() - 60000 // Within last minute
            );

            if (recentEmail) {
                // Fetch the email content
                const emailContent = await resend.emails.get(recentEmail.id);
                return emailContent.data;
            }
        } catch (e) {
            console.log('Error fetching emails, retrying...', e);
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
    }

    throw new Error(`Time out waiting for email to ${toEmail}`);
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
