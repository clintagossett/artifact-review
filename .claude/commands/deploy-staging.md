# /deploy-staging - Deploy to Staging with Monitoring

Deploy the current staging branch and monitor the deployment pipeline.

## What This Skill Does

1. **Push to staging** (if there are unpushed commits)
2. **Start deployment monitor** tmux session (`staging-monitor`)
3. **Watch both Vercel and GitHub Actions** until complete
4. **Report results** (pass/fail with details)

## Usage

```
/deploy-staging           # Push and monitor
/deploy-staging --watch   # Just watch existing deployment
```

## Instructions

### Step 1: Check for unpushed commits

```bash
git log origin/staging..staging --oneline
```

If commits exist, push them:
```bash
git push origin staging
```

### Step 2: Start or attach to monitoring session

Check if `staging-monitor` tmux session exists:
```bash
tmux has-session -t staging-monitor 2>/dev/null && echo "EXISTS" || echo "NOT_RUNNING"
```

If NOT_RUNNING, create it:
```bash
tmux new-session -d -s staging-monitor -n deploy "watch -n 15 -c 'echo \"=== VERCEL ===\"; curl -s -H \"Authorization: Bearer \$VERCEL_TOKEN\" \"https://api.vercel.com/v6/deployments?projectId=prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5&teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS&limit=3\" 2>/dev/null | python3 -c \"import json,sys; d=json.load(sys.stdin); [print(f\\\"{dep.get(\\\"state\\\"):12} {dep.get(\\\"meta\\\",{}).get(\\\"githubCommitMessage\\\",\\\"\\\")[:50]}\\\") for dep in d.get(\\\"deployments\\\",[])]\" 2>/dev/null || echo \"API error\"; echo \"\"; echo \"=== GITHUB ACTIONS ===\"; gh run list --repo clintagossett/artifact-review --workflow=staging-e2e.yml --limit 3 2>/dev/null || echo \"gh CLI error\"'"
```

Set VERCEL_TOKEN in the session:
```bash
tmux send-keys -t staging-monitor "export VERCEL_TOKEN=bGwnZSIIarPThaqFOv0nes5i" Enter
```

### Step 3: Monitor until complete

Poll for completion:
```bash
# Check Vercel status
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5&teamId=team_dD61vKrjrHtvbXe8o2ZmgjUS&limit=1" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('deployments',[{}])[0].get('state','unknown'))"

# Check GitHub Actions status
gh run list --repo clintagossett/artifact-review --workflow=staging-e2e.yml --limit=1 --json status,conclusion -q '.[0] | "\(.status) \(.conclusion)"'
```

Wait until:
- Vercel: `READY` or `ERROR`
- GitHub Actions: `completed`

### Step 4: Report results

Get E2E test summary:
```bash
gh run view <run-id> --repo clintagossett/artifact-review --log 2>/dev/null | grep -E "passed|failed|skipped" | tail -5
```

Report:
- ✅ All passed → "Staging deployment successful"
- ⚠️ Some failed → "Deployment complete but X tests failed" + list failures
- ❌ Vercel error → "Deployment failed" + error details

## Tmux Session Info

**Session name:** `staging-monitor`

To attach manually:
```bash
tmux attach -t staging-monitor
```

To kill:
```bash
tmux kill-session -t staging-monitor
```

## Environment Requirements

- `VERCEL_TOKEN` from `../.env.dev.local`
- `gh` CLI authenticated
- Project ID: `prj_GDXlzDtEcclLAgP1RoY0Agnjvtr5`
- Team ID: `team_dD61vKrjrHtvbXe8o2ZmgjUS`
