#!/bin/bash
set -euo pipefail

TEST_DIR=$(mktemp -d)
TEST_PROJECT_DIR="${TEST_DIR}/artifact-review-james"
mkdir -p "${TEST_PROJECT_DIR}/scripts/lib"
mkdir -p "${TEST_PROJECT_DIR}/app"

MOCK_ORCHESTRATOR_DIR="${TEST_DIR}/orchestrator-artifact-review"
mkdir -p "${MOCK_ORCHESTRATOR_DIR}"

cat > "${MOCK_ORCHESTRATOR_DIR}/config.json" << 'EOF'
{
  "agents": {
    "james": {
      "appPort": 3100,
      "convexCloudPort": 3700,
      "convexSitePort": 3800,
      "subnet": "172.30.0.0/24"
    }
  }
}
EOF

# Copy the actual script
cp ../../../../../../scripts/agent-init.sh "${TEST_PROJECT_DIR}/scripts/"

# Create minimal lib stubs that just return success
for lib in parse-config.sh generate-env-docker.sh generate-env-nextjs.sh wait-for-healthy.sh smoke-test.sh; do
    echo '#!/bin/bash' > "${TEST_PROJECT_DIR}/scripts/lib/${lib}"
    echo 'true' >> "${TEST_PROJECT_DIR}/scripts/lib/${lib}"
done

# Make generate-env-docker.sh actually work minimally
cat > "${TEST_PROJECT_DIR}/scripts/lib/generate-env-docker.sh" << 'EOF'
generate_env_docker() {
    local agent_name="$1"
    local output_file="$2"
    echo "AGENT_NAME=${agent_name}" > "$output_file"
}
EOF

# Make generate-env-nextjs.sh work minimally
cat > "${TEST_PROJECT_DIR}/scripts/lib/generate-env-nextjs.sh" << 'EOF'
generate_env_nextjs() {
    local agent_name="$1"
    local output_file="$2"
    echo "NEXTJS_CONFIG=true" > "$output_file"
}
EOF

cd "${TEST_PROJECT_DIR}"

# Create existing env files
echo "AGENT_NAME=old-agent" > ".env.docker.local"
echo "OLD_CONFIG=true" > "app/.env.nextjs.local"

echo "=== Before running script ==="
ls -la .env.docker.local app/.env.nextjs.local 2>&1 || true

echo "=== Running script (first few seconds) ==="
timeout 1 bash -x scripts/agent-init.sh 2>&1 | head -50 || true

echo "=== After running script ==="
ls -la .env.docker.local* app/.env.nextjs.local* 2>&1 || true
cat .env.docker.local.backup 2>&1 || echo "No backup found"

cd /
rm -rf "${TEST_DIR}"
