
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_FULL_ACCESS_API_KEY || process.env.RESEND_API_KEY);

export async function getLatestEmail(toEmail: string) {
    const isLocal = process.env.NEXT_PUBLIC_CONVEX_URL?.includes('127.0.0.1') || process.env.NEXT_PUBLIC_CONVEX_URL?.includes('localhost');

    // Wait a bit for email to arrive
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds total
    const delayMs = 1000;

    while (attempts < maxAttempts) {
        try {
            if (isLocal) {
                // Fetch from Mailpit API
                const response = await fetch('http://localhost:8025/api/v1/messages');
                if (!response.ok) throw new Error('Failed to fetch from Mailpit');

                const data = await response.json();
                const messages = data.messages || [];

                // Find matching email
                const match = messages.find((m: any) =>
                    m.To.some((t: any) => t.Address.includes(toEmail))
                );

                if (match) {
                    // Fetch full message content
                    const msgResponse = await fetch(`http://localhost:8025/api/v1/message/${match.ID}`);
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

    throw new Error(`Time out waiting for email to ${toEmail} (isLocal=${isLocal})`);
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
