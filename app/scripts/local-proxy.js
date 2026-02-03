const http = require('http');
const httpProxy = require('http-proxy');

const fs = require('fs');
const path = require('path');

const proxy = httpProxy.createProxyServer({});
const PORT = process.env.PORT || 80; // Default to 80 (requires setcap or sudo)

// Load Configuration
const configPath = path.join(__dirname, '../proxy-config.json');
let config = {};

function loadConfig() {
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(data);
        console.log('🔄 Loaded Proxy Config:', Object.keys(config).join(', '));
    } catch (err) {
        console.warn('⚠️  Could not load proxy-config.json, using defaults.');
        config = {
            "default": { "appPort": 3000, "apiPort": 3211 }
        };
    }
}

// Reload config every 5 seconds to allow hot updates without restarting proxy
setInterval(loadConfig, 5000);
loadConfig();

// Helper to determine target
function getTarget(host) {
    if (!host) return null;

    // Strip port if present (e.g. "mark.loc:8080" -> "mark.loc")
    const hostname = host.split(':')[0];

    // Check for specific tokens in the host
    // e.g. "mark.loc" -> agent="mark"
    // e.g. "api.mark.loc" -> agent="mark", isApi=true

    // 1. Identify core host (without potential service prefixes)
    let coreHost = hostname;
    // This variable will hold the agent name derived from the core host
    let agent = 'default';

    // Handle "localhost" fallback
    if (coreHost.includes('localhost')) return config['default'];

    // Special case for default domain
    if (coreHost === 'ar.loc' || coreHost.startsWith('api.ar.loc') ||
        coreHost.startsWith('mailpit.ar.loc') || coreHost.startsWith('novu.ar.loc') ||
        coreHost.startsWith('convex.ar.loc')) {
        agent = 'default';
    } else {
        // e.g. "mark.loc" -> agent = "mark"
        // e.g. "api.mark.loc" -> agent = "mark"
        // e.g. "mailpit.mark.loc" -> agent = "mark"
        const parts = coreHost.split('.');
        if (parts.length >= 2) {
            // Check if the first part is a known service prefix
            if (['api', 'mailpit', 'novu', 'novu-console', 'convex'].includes(parts[0])) {
                // If it is, the agent is the second part (e.g., "api.mark.loc" -> "mark")
                if (parts.length >= 3) {
                    agent = parts[1];
                }
            } else {
                // Otherwise, the agent is the first part (e.g., "mark.loc" -> "mark")
                agent = parts[0];
            }
        }
    }

    // 3. Determine Service Target
    const agentConfig = config[agent] || config['default'];

    if (hostname.startsWith('api.')) { // Use original hostname to check for service prefixes
        return `http://localhost:${agentConfig.apiPort}`;

    } else if (hostname.startsWith('mailpit.')) {
        return `http://localhost:${agentConfig.mailpitPort || 8025}`;

    } else if (hostname.startsWith('novu-console.')) {
        return `http://localhost:${agentConfig.novuConsolePort || 4200}`;

    } else if (hostname.startsWith('novu.')) {
        return `http://localhost:${agentConfig.novuPort || 2022}`;

    } else if (hostname.startsWith('convex.')) {
        return `http://localhost:${agentConfig.convexDashboardPort || 6791}`;

    } else {
        // Main App
        return `http://localhost:${agentConfig.appPort}`;
    }
}

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
    const target = getTarget(host);

    if (target) {
        // console.log(`[Proxy] ${host}${req.url} -> ${target}`);
        proxy.web(req, res, { target: target, changeOrigin: false });
    } else {
        res.writeHead(404);
        res.end("Unknown Host");
    }
});

console.log(`
🚀 Local Proxy Running on Port ${PORT}
   - ar.loc           -> Default App (${config.default.appPort})
   - [agent].loc      -> Agent App (Dynamic)
   - api.[agent].loc  -> Agent API (Dynamic)

⚠️  NOTE: Ensure /etc/hosts has entries for:
   127.0.0.1 ar.loc api.ar.loc mark.loc ...
`);

server.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error("Failed to bind to port " + PORT + ". Ensure you have run 'sudo setcap' or use sudo.");
        process.exit(1);
    }
});
