"""Executor Agent - Implements code to pass failing tests.

Agent selection based on task type:
- dx-engineer: Infrastructure (bash, Docker, env files)
- tdd-developer: Application code (TypeScript, React, Convex)

GREEN Phase Verification:
After implementing, this agent MUST verify that tests pass.
This ensures the implementation actually satisfies the test criteria.
"""

import re
import subprocess
from pathlib import Path
from typing import Any

from agents.base import BaseAgent


# Task type to agent mapping
TASK_TYPE_AGENTS = {
    "infrastructure": "dx-engineer",
    "app": "tdd-developer",
}


class ExecutorAgent(BaseAgent):
    """Executor Agent for implementing code to pass tests.

    Role: Write minimal code to make failing tests pass.
    Lifecycle: Runs once per subtask, after TDD agent.

    Inputs:
    - Subtask definition
    - Failing tests from TDD agent
    - Access to codebase (read/write via Claude CLI tools)

    Outputs:
    - Implementation code (written directly to codebase)
    - implementation-notes.md: Summary of changes made

    Agent selection:
    - task_type="infrastructure" → dx-engineer (bash, Docker, env)
    - task_type="app" → tdd-developer (TypeScript, React, Convex)

    GREEN Phase Verification:
    After implementation, tests MUST be executed to verify they pass.
    Status will be "green_verified" if tests pass, or
    "green_not_verified" if tests still fail (indicating incomplete implementation).
    """

    AGENT_FILE = "tdd-developer"  # Default, can be overridden
    TEST_TIMEOUT_SECONDS = 120  # 2 minutes for test execution

    def __init__(
        self,
        artifact_dir: Path | str,
        project_root: Path | str,
        task_type: str = "app",
        tdd_artifact_dir: Path | str | None = None,
    ):
        self.task_type = task_type
        self.tdd_artifact_dir = Path(tdd_artifact_dir) if tdd_artifact_dir else None
        # Select agent based on task type
        self.AGENT_FILE = TASK_TYPE_AGENTS.get(task_type, "tdd-developer")
        super().__init__(artifact_dir, project_root, model_override="sonnet")

    # Artifact size limits
    MAX_NOTES_LINES = 50  # implementation-notes.md should be brief

    def _extract_artifacts(self, output: str) -> None:
        """Extract artifacts from <artifact> tags in output."""
        artifact_pattern = r'<artifact name="([^"]+)">\s*(.*?)\s*</artifact>'
        matches = re.findall(artifact_pattern, output, re.DOTALL)

        for name, content in matches:
            self.add_artifact(name, content.strip())

        # If no artifacts found, save the whole output
        if not self.artifacts:
            self.add_artifact("implementation-notes.md", output)

        # Enforce size limits
        self._enforce_size_limits()

    def _enforce_size_limits(self) -> None:
        """Enforce artifact size limits to prevent bloat."""
        if "implementation-notes.md" in self.artifacts:
            notes = self.artifacts["implementation-notes.md"]
            line_count = len(notes.split("\n"))
            if line_count > self.MAX_NOTES_LINES:
                self.log(
                    f"WARNING: implementation-notes.md has {line_count} lines "
                    f"(max {self.MAX_NOTES_LINES}). Truncating."
                )
                lines = notes.split("\n")[:self.MAX_NOTES_LINES]
                lines.append("")
                lines.append(f"[TRUNCATED: Original was {line_count} lines.]")
                self.artifacts["implementation-notes.md"] = "\n".join(lines)

    def _format_reference_files(self, subtask: dict[str, Any]) -> str:
        """Format reference files section for prompt."""
        ref_files = subtask.get("reference_files", [])
        if not ref_files:
            return ""

        lines = ["## Reference Files (READ THESE FIRST)", ""]
        lines.append("Follow patterns from these files:")
        lines.append("")
        for ref in ref_files:
            if isinstance(ref, dict):
                path = ref.get("path", "")
                reason = ref.get("reason", "")
                lines.append(f"- `{path}` - {reason}")
            else:
                lines.append(f"- `{ref}`")
        lines.append("")
        return "\n".join(lines)

    def run(self, subtask: dict[str, Any], test_spec: str) -> dict[str, Any]:
        """Run the executor agent to implement code for a subtask.

        Args:
            subtask: Subtask dict with number, title, description, files, reference_files
            test_spec: Test specification from TDD agent

        Returns:
            Dict with status, output text, and artifacts dict.
            Status will be:
            - "green_verified": Implementation passes tests
            - "green_not_verified": Implementation written but tests not verified
            - "complete": Implementation done but verification not possible
            - "timeout"/"error": Agent failed
        """
        reference_section = self._format_reference_files(subtask)

        input_context = f"""# Subtask to Implement

**Subtask {subtask.get('number', '?')}:** {subtask.get('title', 'Unknown')}

## Description
{subtask.get('description', 'No description provided')}

## Files to Create/Modify
{chr(10).join('- ' + f for f in subtask.get('files', []))}

{reference_section}
## Test Specification
{test_spec}

---

## YOUR TASK: Make Tests Pass (GREEN Phase)

Implement the MINIMAL code needed to make the tests pass.
Follow TDD principles: just enough code, no more.

## CRITICAL RULES

1. **MINIMAL IMPLEMENTATION**
   - Only write code needed to pass tests
   - Don't add features not covered by tests
   - Don't refactor existing code unless tests require it

2. **FOLLOW EXISTING PATTERNS**
   - Read the reference files listed above
   - Match their style exactly
   - Don't introduce new patterns

3. **BRIEF NOTES** (max {self.MAX_NOTES_LINES} lines)
   - Just list files modified
   - Note any blockers or issues
   - No verbose explanations

4. **RUN TESTS**
   - After implementing, run the tests
   - Report pass/fail status

## Output Format

<artifact name="implementation-notes.md">
Files modified:
- path/to/file.ts - brief change description

Test results: PASS/FAIL
</artifact>
"""

        result = super().run(input_context)
        self.log(f"Artifacts produced: {list(result['artifacts'].keys())}")

        # If agent succeeded, verify GREEN phase
        if result.get("status") not in ("timeout", "error"):
            green_result = self._verify_green_phase(subtask)
            if green_result["verified"]:
                result["status"] = "green_verified"
                self.log("GREEN phase verified - tests pass")
            elif green_result.get("skipped"):
                result["status"] = "complete"
                result["green_verification"] = "skipped"
                self.log(f"GREEN verification skipped: {green_result.get('reason', 'unknown')}")
            else:
                result["status"] = "green_not_verified"
                result["green_verification"] = green_result
                self.log("WARNING: GREEN phase NOT verified - tests may still fail!")

        return result

    def _verify_green_phase(self, subtask: dict[str, Any]) -> dict[str, Any]:
        """Run tests to verify they pass (GREEN phase).

        Returns:
            Dict with:
            - verified: True if tests pass
            - skipped: True if tests couldn't be run
            - reason: Explanation of result
        """
        self.log("Verifying GREEN phase (tests should pass)...")

        # Look for test files in the TDD artifact directory
        tdd_dir = self.artifact_dir.parent / "tdd"
        test_files = list(tdd_dir.glob("tests/**/*.test.*")) if tdd_dir.exists() else []

        if not test_files:
            return {
                "verified": False,
                "skipped": True,
                "reason": "No test files found"
            }

        # Determine test command based on task type
        if self.task_type == "app":
            test_cmd = ["npx", "vitest", "run", "--reporter=verbose"]
            test_cwd = self.project_root / "app"
        else:
            test_cmd = ["bash"]
            test_cwd = tdd_dir

        # Run tests
        all_passed = True
        test_results = []

        for test_file in test_files[:5]:
            try:
                if self.task_type == "app":
                    cmd = test_cmd + [str(test_file)]
                else:
                    cmd = test_cmd + [str(test_file)]

                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=self.TEST_TIMEOUT_SECONDS,
                    cwd=str(test_cwd)
                )

                test_results.append({
                    "file": str(test_file),
                    "exit_code": result.returncode,
                    "passed": result.returncode == 0
                })

                if result.returncode != 0:
                    all_passed = False
                    self.log(f"Test failed: {test_file.name}")

            except subprocess.TimeoutExpired:
                test_results.append({"file": str(test_file), "timeout": True})
                all_passed = False
            except Exception as e:
                test_results.append({"file": str(test_file), "error": str(e)})

        return {
            "verified": all_passed,
            "skipped": False,
            "test_results": test_results,
            "reason": "All tests pass" if all_passed else "Some tests failed"
        }
