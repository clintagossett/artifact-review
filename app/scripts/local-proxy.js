const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});
const PORT = 80; // Standard HTTP port

// Target Ports
const APP_PORT = 3000;
const API_PORT = 3211;

// Error handling
proxy.on('error', (err, req, res) => {
    console.error('Proxy Error:', err.message);
    if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Proxy Error: Is the target server running?');
});

const server = http.createServer((req, res) => {
    const host = req.headers.host;

    // Default to App
    let target = `http://localhost:${APP_PORT}`;

    // Routing Logic
    if (host && host.startsWith('api.ar.local.com')) {
        target = `http://localhost:${API_PORT}`;
        console.log(`[Proxy] ${host}${req.url} -> API (${API_PORT})`);
    } else {
        console.log(`[Proxy] ${host}${req.url} -> APP (${APP_PORT})`);
    }

    // Proxy the request
    proxy.web(req, res, { target: target, changeOrigin: false });
});

console.log(`
🚀 Local Proxy Running on Port ${PORT}
   - http://ar.local.com     -> localhost:${APP_PORT} (Next.js)
   - http://api.ar.local.com -> localhost:${API_PORT} (Convex)

⚠️  NOTE: You must add these domains to your /etc/hosts file:
   127.0.0.1 ar.local.com api.ar.local.com
`);

server.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error("Failed to bind to port 80. You probably need sudo.");
        process.exit(1);
    }
});
