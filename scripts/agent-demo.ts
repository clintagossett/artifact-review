import { spawn } from "child_process";

// Targeting LOCAL DOCKER HTTP PORT (http.ts serves on 3211)
// Wait, Convex Docker default for http actions is 3211 usually? 
// docker-compose.yml says:
//      - CONVEX_SITE_ORIGIN=http://127.0.0.1:3211
// So HTTP Actions are on 3211.
const API_URL = "http://127.0.0.1:3211";

// The Deployment URL for "convex run" (admin/backend) is 3210
const DEPLOYMENT_URL = "http://127.0.0.1:3210";
const ADMIN_KEY = "artifact-review-local|01c54c6b7cfa68a0b3b152ef4c5adc7e8a36686d81f027d6cf2a224fee90bef056aeacf827";

// Helper to run step
async function runStep(name: string, fn: () => Promise<void>) {
    console.log(`\n🔹 ${name}...`);
    try {
        await fn();
        console.log(`✅ ${name} Passed`);
    } catch (e) {
        console.error(`❌ ${name} Failed:`, e);
        process.exit(1);
    }
}

async function main() {
    console.log("🚀 Starting Agent Workflow Verification");
    console.log(`Targeting URL: ${API_URL}`);
    console.log(`Admin URL: ${DEPLOYMENT_URL}`);

    // 1. Setup
    let apiKey = "";
    let userId = "";

    await runStep("Setup Agent & Key", async () => {
        // Call testSetup via CLI with explicit local URL
        // Pass --url to point to self-hosted instance
        const p = spawn("npx", ["convex", "run", "testSetup:setup", "--url", DEPLOYMENT_URL, "--admin-key", ADMIN_KEY], { stdio: ["ignore", "pipe", "inherit"] });
        let output = "";
        p.stdout.on("data", d => output += d.toString());
        await new Promise(r => p.on("close", r));

        // In piped mode, we might miss stdout if inherited? 
        // Wait, I set stdio: ["ignore", "pipe", "inherit"].
        // stdout is piped. stderr is inherited.
        // So we capture output.

        const jsonStr = output.match(/\{[\s\S]*\}/)?.[0]; // extract JSON object from logs
        if (!jsonStr) {
            // If manual run above succeeded, let's hardcode fallback for retry if needed?
            // No, must parse.
            throw new Error("Failed to parse setup output. Output was: " + output);
        }
        const res = JSON.parse(jsonStr);
        apiKey = res.key;
        userId = res.userId;
        console.log("   Key generated.");
    });

    let shareToken = "";
    let versionId = "";

    // 2. Post Artifact
    await runStep("Agent: Post Artifact", async () => {
        const res = await fetch(`${API_URL}/api/v1/artifacts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
            },
            body: JSON.stringify({
                name: "Agent Plan",
                description: "Test",
                fileType: "markdown",
                content: "# Agent Plan\n\nThis is a test plan.",
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Status ${res.status}: ${text}`);
        }
        const data = await res.json();
        shareToken = data.shareToken;
        versionId = data.latestVersionId;
        console.log(`   Artifact created: ${shareToken}`);
    });

    // 3. User Comment
    await runStep("User: Comment", async () => {
        // Use CLI to comment
        const commentP = spawn("npx", ["convex", "run", "testSetup:setupComment", "--url", DEPLOYMENT_URL, "--admin-key", ADMIN_KEY, JSON.stringify({
            userId,
            versionId,
            content: "Looks great, Agent!"
        })]);

        // Log output
        commentP.stdout.on("data", d => console.log("   [Comment Log]", d.toString()));
        commentP.stderr.on("data", d => console.error("   [Comment Error]", d.toString()));

        await new Promise((resolve, reject) => {
            commentP.on("close", (code) => code === 0 ? resolve(true) : reject("Comment failed with code " + code));
        });
        console.log("   Comment posted.");
    });

    // 4. Agent Read Comments
    await runStep("Agent: Read Comments", async () => {
        const res = await fetch(`${API_URL}/api/v1/artifacts/${shareToken}/comments`, {
            headers: { "X-API-Key": apiKey }
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Status ${res.status}: ${text}`);
        }
        const data = await res.json();
        if (data.comments.length !== 1) throw new Error("Expected 1 comment, got " + data.comments.length);
        if (data.comments[0].content !== "Looks great, Agent!") throw new Error("Content mismatch");
        console.log("   Comments verified.");
    });

    console.log("🎉 Verification Successful");
}

main().catch(console.error);
