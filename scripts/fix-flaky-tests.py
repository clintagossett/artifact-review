#!/usr/bin/env python3
"""
E2E Test Fix Orchestrator

Orchestrates the fix → test local → commit → deploy → test staging cycle
for flaky E2E tests. Spawns fresh agents for each test file to avoid context bloat.

Usage:
    ./scripts/fix-flaky-tests.py [--test-file FILE] [--dry-run]

Options:
    --test-file FILE  Fix specific test file only (default: all flaky tests)
    --dry-run         Show what would be done without making changes
"""

import subprocess
import json
import time
import sys
import argparse
from pathlib import Path

# Test files that are flaky (fail on first try, pass on retry)
FLAKY_TESTS = [
    "agent-api.spec.ts",
    "artifact-workflow.spec.ts",
    "notification.spec.ts",
    "stripe-subscription.spec.ts",
]

def run_command(cmd, cwd=None, capture=True):
    """Run shell command and return output"""
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        capture_output=capture,
        text=True
    )
    return result

def spawn_fix_agent(test_file):
    """Spawn a Task agent to analyze and fix a flaky test file"""
    prompt = f"""
Analyze and fix timing issues in E2E test: app/tests/e2e/{test_file}

Your task:
1. Read the test file and identify timing/race condition issues
2. Look for assertions that might fire before elements are ready
3. Check for missing waits on API calls or async operations
4. Propose specific fixes (increased timeouts, better wait conditions)
5. Apply the fixes to the test file
6. Run tests locally to verify: cd app && npm run test:e2e -- {test_file}
7. Report results

Common flaky test patterns to fix:
- Change `waitForSelector` timeout from default to explicit (30s+)
- Use `waitForLoadState('networkidle')` after navigation
- Add `page.waitForResponse()` for API calls
- Use `toBeVisible({{ timeout: 30000 }})` for assertions
- Replace `page.click()` with `page.getByRole().click()` for reliability

DO NOT commit changes - just fix and test locally. Report what you fixed.
"""

    print(f"\n🤖 Spawning agent to fix {test_file}...")

    # Using subprocess to call Claude Code CLI with agent spawning
    # This keeps each agent in fresh context
    cmd = f'claude-dev task --type general-purpose --prompt "{prompt}"'
    result = run_command(cmd)

    return result.returncode == 0

def run_local_tests(test_file=None):
    """Run E2E tests locally"""
    print("\n🧪 Running local E2E tests...")

    test_cmd = "npm run test:e2e"
    if test_file:
        test_cmd += f" -- {test_file}"

    result = run_command(test_cmd, cwd="app", capture=False)
    return result.returncode == 0

def commit_changes(test_file, message=None):
    """Commit test fixes"""
    if not message:
        message = f"Fix timing issues in {test_file}\n\nMade test more resilient by adding proper waits and timeouts.\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

    print(f"\n📝 Committing fixes for {test_file}...")
    run_command(f"git add app/tests/e2e/{test_file}")
    run_command(f'git commit -m "{message}"')
    return True

def deploy_to_staging():
    """Push to staging branch"""
    print("\n🚀 Deploying to staging...")
    result = run_command("git push origin staging")
    return result.returncode == 0

def monitor_staging_tests():
    """Monitor GitHub Actions E2E test run"""
    print("\n👀 Monitoring staging tests...")

    # Wait for deployment to trigger
    time.sleep(10)

    # Get latest workflow run
    cmd = "gh run list --workflow=staging-e2e.yml --limit 1 --json databaseId,status,conclusion"
    result = run_command(cmd)

    if result.returncode != 0:
        print("❌ Failed to get workflow run status")
        return False

    run_data = json.loads(result.stdout)
    if not run_data:
        print("❌ No workflow runs found")
        return False

    run_id = run_data[0]['databaseId']
    print(f"📊 Watching run: https://github.com/clintagossett/artifact-review/actions/runs/{run_id}")

    # Watch the run
    watch_cmd = f"gh run watch {run_id} --exit-status"
    result = run_command(watch_cmd, capture=False)

    return result.returncode == 0

def main():
    parser = argparse.ArgumentParser(description="Fix flaky E2E tests iteratively")
    parser.add_argument("--test-file", help="Specific test file to fix")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without executing")
    args = parser.parse_args()

    tests_to_fix = [args.test_file] if args.test_file else FLAKY_TESTS

    print("🎯 E2E Test Fix Orchestrator")
    print(f"📋 Tests to fix: {', '.join(tests_to_fix)}")

    if args.dry_run:
        print("\n🔍 DRY RUN - showing plan:")
        for test_file in tests_to_fix:
            print(f"\n  1. Spawn agent to analyze and fix {test_file}")
            print(f"  2. Run local tests: npm run test:e2e -- {test_file}")
            print(f"  3. Commit changes")
            print(f"  4. Deploy to staging")
            print(f"  5. Monitor GitHub Actions test results")
            print(f"  6. If fail: iterate. If pass: move to next test")
        return 0

    for test_file in tests_to_fix:
        print(f"\n{'='*60}")
        print(f"🔧 Fixing: {test_file}")
        print(f"{'='*60}")

        # Step 1: Spawn agent to fix
        if not spawn_fix_agent(test_file):
            print(f"❌ Agent failed to fix {test_file}")
            response = input("Continue to next test? (y/n): ")
            if response.lower() != 'y':
                break
            continue

        # Step 2: Run local tests
        if not run_local_tests(test_file):
            print(f"❌ Local tests failed for {test_file}")
            response = input("Commit anyway? (y/n): ")
            if response.lower() != 'y':
                continue

        # Step 3: Commit
        commit_changes(test_file)

        # Step 4: Deploy
        if not deploy_to_staging():
            print("❌ Deploy failed")
            break

        # Step 5: Monitor staging tests
        if monitor_staging_tests():
            print(f"✅ {test_file} fixed and verified on staging!")
        else:
            print(f"❌ Staging tests failed for {test_file}")
            response = input("Continue to next test anyway? (y/n): ")
            if response.lower() != 'y':
                break

    print("\n✨ Fix orchestration complete!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
