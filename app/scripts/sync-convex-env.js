#!/usr/bin/env node

/**
 * Sync Convex Environment Variables
 *
 * Reads environment variables from .env.convex.local and syncs them
 * to the Convex backend using `npx convex env set`.
 *
 * Usage:
 *   node scripts/sync-convex-env.js
 *   npm run sync-convex-env
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENV_FILE = path.join(__dirname, '../.env.convex.local');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${filePath} not found`);
    console.error(`\nCreate it from the example file:`);
    console.error(`  cp .env.convex.local.example .env.convex.local`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = {};

  content.split('\n').forEach((line, index) => {
    // Skip comments and empty lines
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    // Parse KEY=VALUE
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      vars[key] = cleanValue;
    } else if (line.includes('=')) {
      console.warn(`⚠️  Warning: Skipping malformed line ${index + 1}: ${line}`);
    }
  });

  return vars;
}

function setConvexEnv(key, value) {
  try {
    // Use -- separator to prevent option parsing issues (values starting with -- like JWT keys)
    // Quote the value to handle spaces and special characters
    const quotedValue = value.includes(' ') || value.includes('<') ? `"${value}"` : value;
    execSync(`npx convex env set -- ${key} ${quotedValue}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    return true;
  } catch (error) {
    console.error(`❌ Failed to set ${key}`);
    return false;
  }
}

function main() {
  console.log('🔄 Syncing Convex environment variables...\n');

  const vars = parseEnvFile(ENV_FILE);
  const keys = Object.keys(vars);

  if (keys.length === 0) {
    console.log('⚠️  No environment variables found in .env.convex.local');
    process.exit(0);
  }

  console.log(`Found ${keys.length} variable(s) to sync:\n`);
  keys.forEach(key => {
    const preview = vars[key].length > 50
      ? vars[key].substring(0, 50) + '...'
      : vars[key];
    console.log(`  • ${key}=${preview}`);
  });
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const [key, value] of Object.entries(vars)) {
    if (setConvexEnv(key, value)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('');
  console.log('─'.repeat(50));
  console.log(`✅ Successfully set: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}`);
    process.exit(1);
  }
  console.log('─'.repeat(50));
  console.log('');
  console.log('🎉 All environment variables synced to Convex!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Restart your dev server if it was running');
  console.log('  2. Or run: npx convex dev --once');
}

main();
