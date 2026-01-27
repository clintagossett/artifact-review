#!/usr/bin/env node
/**
 * Set JWT Keys for Convex Auth
 *
 * This script properly sets JWT_PRIVATE_KEY and JWKS environment variables
 * by reading them from the environment or generating new ones.
 */

const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

// Read from .env.convex.local
const envFile = path.join(__dirname, '../.env.convex.local');
const content = readFileSync(envFile, 'utf-8');

// Extract JWT_PRIVATE_KEY and JWKS
let jwtPrivateKey = null;
let jwks = null;

content.split('\n').forEach(line => {
  if (line.startsWith('JWT_PRIVATE_KEY=')) {
    // Remove JWT_PRIVATE_KEY= and surrounding quotes
    jwtPrivateKey = line.substring('JWT_PRIVATE_KEY='.length).replace(/^"|"$/g, '');
  } else if (line.startsWith('JWKS=')) {
    // Remove JWKS= and surrounding quotes
    jwks = line.substring('JWKS='.length).replace(/^'|'$/g, '');
  }
});

if (!jwtPrivateKey || !jwks) {
  console.error('❌ JWT_PRIVATE_KEY or JWKS not found in .env.convex.local');
  console.error('Run: node generateKeys.mjs and add the output to .env.convex.local');
  process.exit(1);
}

console.log('Setting JWT keys in Convex...\n');

// Write to temp files and use -- separator to avoid option parsing issues
const fs = require('fs');
const tmpJwtFile = '/tmp/jwt_private_key.txt';
const tmpJwksFile = '/tmp/jwks.txt';

try {
  fs.writeFileSync(tmpJwtFile, jwtPrivateKey);
  execSync(`npx convex env set -- JWT_PRIVATE_KEY "$(cat ${tmpJwtFile})"`, {
    stdio: 'inherit',
    shell: '/bin/bash'
  });
  fs.unlinkSync(tmpJwtFile);
  console.log('✔ Successfully set JWT_PRIVATE_KEY\n');
} catch (error) {
  console.error('❌ Failed to set JWT_PRIVATE_KEY');
  if (fs.existsSync(tmpJwtFile)) fs.unlinkSync(tmpJwtFile);
  process.exit(1);
}

try {
  fs.writeFileSync(tmpJwksFile, jwks);
  execSync(`npx convex env set -- JWKS "$(cat ${tmpJwksFile})"`, {
    stdio: 'inherit',
    shell: '/bin/bash'
  });
  fs.unlinkSync(tmpJwksFile);
  console.log('✔ Successfully set JWKS\n');
} catch (error) {
  console.error('❌ Failed to set JWKS');
  if (fs.existsSync(tmpJwksFile)) fs.unlinkSync(tmpJwksFile);
  process.exit(1);
}

console.log('🎉 JWT keys successfully set in Convex!');
