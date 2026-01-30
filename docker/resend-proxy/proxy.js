/**
 * Resend-to-Mailpit Proxy
 *
 * Intercepts Resend API calls from the Convex backend and translates them
 * to Mailpit format for local development.
 *
 * Listens on HTTPS 443 with self-signed cert.
 * Translates: POST /emails/batch (Resend) → POST /api/v1/send (Mailpit)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MAILPIT_HOST = process.env.MAILPIT_HOST || 'mailpit';
const MAILPIT_PORT = process.env.MAILPIT_PORT || 8025;
const PROXY_PORT = 443;

// Load self-signed cert (generated at container start)
const options = {
  key: fs.readFileSync('/certs/key.pem'),
  cert: fs.readFileSync('/certs/cert.pem'),
};

/**
 * Translate Resend batch format to Mailpit format and send each email
 */
async function translateAndSend(resendEmails) {
  const results = [];

  for (const email of resendEmails) {
    // Parse "Name <email>" format
    let fromEmail = email.from;
    let fromName = '';
    const fromMatch = email.from.match(/^(.*)<(.*)>$/);
    if (fromMatch) {
      fromName = fromMatch[1].trim();
      fromEmail = fromMatch[2].trim();
    }

    // Build Mailpit payload
    const mailpitPayload = {
      From: { Email: fromEmail, Name: fromName },
      To: (Array.isArray(email.to) ? email.to : [email.to]).map(addr => ({ Email: addr })),
      Subject: email.subject || '(no subject)',
      HTML: email.html || '',
      Text: email.text || '',
    };

    // Add CC if present
    if (email.cc) {
      mailpitPayload.Cc = (Array.isArray(email.cc) ? email.cc : [email.cc]).map(addr => ({ Email: addr }));
    }

    // Add BCC if present
    if (email.bcc) {
      mailpitPayload.Bcc = (Array.isArray(email.bcc) ? email.bcc : [email.bcc]).map(addr => ({ Email: addr }));
    }

    try {
      const mailpitResponse = await sendToMailpit(mailpitPayload);
      // Generate a fake Resend ID for the response
      const fakeId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      results.push({ id: fakeId });
      console.log(`[resend-proxy] Email sent to ${email.to} via Mailpit`);
    } catch (err) {
      console.error(`[resend-proxy] Failed to send to Mailpit:`, err.message);
      throw err;
    }
  }

  return results;
}

/**
 * Send email to Mailpit
 */
function sendToMailpit(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);

    const req = http.request({
      hostname: MAILPIT_HOST,
      port: MAILPIT_PORT,
      path: '/api/v1/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`Mailpit returned ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Create HTTPS server
const server = https.createServer(options, async (req, res) => {
  console.log(`[resend-proxy] ${req.method} ${req.url}`);

  // Handle Resend batch endpoint
  if (req.method === 'POST' && req.url === '/emails/batch') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const emails = JSON.parse(body);
        const results = await translateAndSend(emails);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: results }));
      } catch (err) {
        console.error('[resend-proxy] Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Handle single email endpoint (used by sendEmailManually)
  if (req.method === 'POST' && req.url === '/emails') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const email = JSON.parse(body);
        const results = await translateAndSend([email]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results[0]));
      } catch (err) {
        console.error('[resend-proxy] Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'resend-proxy' }));
    return;
  }

  // Unknown endpoint
  console.log(`[resend-proxy] Unknown endpoint: ${req.method} ${req.url}`);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[resend-proxy] Listening on https://0.0.0.0:${PROXY_PORT}`);
  console.log(`[resend-proxy] Forwarding to http://${MAILPIT_HOST}:${MAILPIT_PORT}`);
});
