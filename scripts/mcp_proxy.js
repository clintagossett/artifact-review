const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const logFile = '/tmp/mcp_traffic.log';
// Overwrite log file on start
fs.writeFileSync(logFile, `[${new Date().toISOString()}] Proxy Starting...\n`);

function log(prefix, data) {
    fs.appendFileSync(logFile, `[${prefix}] ${data.toString()}\n`);
}

// Path to the real convex binary
// Assuming we are in 'scripts' folder, so node_modules is in ../app/node_modules
const appDir = path.resolve(__dirname, '../app');
const convexBin = path.join(appDir, 'node_modules', '.bin', 'convex');

log('INFO', `App Dir: ${appDir}`);
log('INFO', `Binary: ${convexBin}`);

const env = { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' };

// Spawn the real MCP server
const child = spawn(convexBin, ['mcp', 'start'], {
    cwd: appDir,
    env: env
});

child.stdout.on('data', (data) => {
    log('SERVER_STDOUT', data);
    process.stdout.write(data);
});

child.stderr.on('data', (data) => {
    log('SERVER_STDERR', data);
    process.stderr.write(data);
});

process.stdin.on('data', (data) => {
    log('CLIENT_STDIN', data);
    child.stdin.write(data);
});

child.on('close', (code) => {
    log('INFO', `Child process exited with code ${code}`);
    process.exit(code);
});

child.on('error', (err) => {
    log('ERROR', `Failed to start child process: ${err}`);
});
