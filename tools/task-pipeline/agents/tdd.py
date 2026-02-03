"""TDD Agent - Writes failing tests for a subtask.

Agent selection based on task type:
- dx-engineer: Infrastructure (bash, Docker, env files)
- tdd-developer: Application code (TypeScript, React, Convex)

RED Phase Verification:
After writing tests, this agent MUST verify that tests fail.
This ensures we're actually testing new behavior, not existing code.
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


class TDDAgent(BaseAgent):
    """TDD Agent for writing failing tests.

    Role: Write failing tests that define the acceptance criteria for a subtask.
    Lifecycle: Runs once per subtask, before executor.

    Inputs:
    - Subtask definition (from planner's subtasks.json)
    - Reference files (from planner's exploration)
    - Access to codebase (read-only via Claude CLI tools)

    Outputs:
    - tests/: Executable test files (NOT inline in markdown!)
    - test-spec.md: Brief acceptance criteria (max 100 lines)

    Agent selection:
    - task_type="infrastructure" → dx-engineer (bash, Docker, env)
    - task_type="app" → tdd-developer (TypeScript, React, Convex)

    RED Phase Verification:
    After tests are written, they MUST be executed to verify they fail.
    Status will be "red_verified" if tests fail as expected, or
    "red_not_verified" if tests pass (indicating a problem).

    Artifact Limits:
    - test-spec.md: Max 100 lines (brief acceptance criteria only)
    - Code belongs in .test.sh or .test.ts files, NOT in markdown
    """

    AGENT_FILE = "tdd-developer"  # Default, can be overridden
    TEST_TIMEOUT_SECONDS = 120  # 2 minutes for test execution

    # Artifact size limits
    MAX_SPEC_LINES = 100  # test-spec.md should be brief

    def __init__(
        self,
        artifact_dir: Path | str,
        project_root: Path | str,
        task_type: str = "app",
    ):
        self.task_type = task_type
        # Select agent based on task type
        self.AGENT_FILE = TASK_TYPE_AGENTS.get(task_type, "tdd-developer")
        super().__init__(artifact_dir, project_root, model_override="sonnet")

    def _extract_artifacts(self, output: str) -> None:
        """Extract artifacts from <artifact> tags in output."""
        artifact_pattern = r'<artifact name="([^"]+)">\s*(.*?)\s*</artifact>'
        matches = re.findall(artifact_pattern, output, re.DOTALL)

        for name, content in matches:
            self.add_artifact(name, content.strip())

        # If no artifacts found, save the whole output
        if not self.artifacts:
            self.add_artifact("test-spec.md", output)

        # Enforce size limits
        self._enforce_size_limits()

    def _enforce_size_limits(self) -> None:
        """Enforce artifact size limits to prevent bloat."""
        warnings = []

        # Check test-spec.md size
        if "test-spec.md" in self.artifacts:
            spec_content = self.artifacts["test-spec.md"]
            line_count = len(spec_content.split("\n"))
            if line_count > self.MAX_SPEC_LINES:
                warnings.append(
                    f"test-spec.md has {line_count} lines (max {self.MAX_SPEC_LINES}). "
                    "Move code to test files, not markdown."
                )
                # Truncate with warning
                lines = spec_content.split("\n")[:self.MAX_SPEC_LINES]
                lines.append("")
                lines.append(f"[TRUNCATED: Original was {line_count} lines. Code belongs in test files, not here.]")
                self.artifacts["test-spec.md"] = "\n".join(lines)

        # Check for code in markdown (common anti-pattern)
        if "test-spec.md" in self.artifacts:
            spec = self.artifacts["test-spec.md"]
            # Count code blocks
            code_blocks = re.findall(r'```[\s\S]*?```', spec)
            if len(code_blocks) > 2:
                warnings.append(
                    f"test-spec.md contains {len(code_blocks)} code blocks. "
                    "Code should be in test files, not markdown."
                )

        for warning in warnings:
            self.log(f"WARNING: {warning}")

    def _format_reference_files(self, subtask: dict[str, Any]) -> str:
        """Format reference files section for prompt."""
        ref_files = subtask.get("reference_files", [])
        if not ref_files:
            return ""

        lines = ["## Reference Files (READ THESE FIRST)", ""]
        lines.append("These files were identified by the Planner. Read them before writing tests:")
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

    def run(self, subtask: dict[str, Any]) -> dict[str, Any]:
        """Run the TDD agent to write failing tests for a subtask.

        Args:
            subtask: Subtask dict with number, title, description, files, reference_files

        Returns:
            Dict with status, output text, and artifacts dict.
            Status will be:
            - "red_verified": Tests were written and verified to fail (expected)
            - "red_not_verified": Tests were written but didn't fail (problem!)
            - "complete": Tests written but verification not possible
            - "timeout"/"error": Agent failed
        """
        reference_section = self._format_reference_files(subtask)
        test_extension = ".test.sh" if self.task_type == "infrastructure" else ".test.ts"

        input_context = f"""# Subtask to Test

**Subtask {subtask.get('number', '?')}:** {subtask.get('title', 'Unknown')}

## Description
{subtask.get('description', 'No description provided')}

## Files to Create/Modify
{chr(10).join('- ' + f for f in subtask.get('files', []))}

{reference_section}
---

## YOUR TASK: Write Failing Tests

Write tests that define acceptance criteria for this subtask.
Tests should FAIL initially (RED phase of TDD).

## CRITICAL RULES - READ CAREFULLY

1. **CODE BELONGS IN CODE FILES**
   - Write executable test code in `tests/*{test_extension}` files
   - DO NOT put code blocks in test-spec.md
   - test-spec.md is for brief acceptance criteria ONLY

2. **test-spec.md MUST BE BRIEF** (max {self.MAX_SPEC_LINES} lines)
   - Just list what each test verifies
   - No code, no exhaustive documentation
   - Point to reference files instead of explaining patterns

3. **REFERENCE EXISTING CODE**
   - Read the reference files listed above
   - Follow their patterns exactly
   - Don't re-document what's already in code

4. **MINIMAL OUTPUT**
   - One test file per concern
   - Tests should be runnable: `bash tests/foo{test_extension}`
   - No verbose comments - code should be self-documenting

## Output Format

<artifact name="test-spec.md">
Brief acceptance criteria (max {self.MAX_SPEC_LINES} lines):
- Test 1: What it verifies
- Test 2: What it verifies
</artifact>

<artifact name="tests/subtask-{subtask.get('number', '0'):02d}{test_extension}">
# Executable test code here
</artifact>

After writing tests, RUN THEM to verify they fail.
"""

        result = super().run(input_context)
        self.log(f"Artifacts produced: {list(result['artifacts'].keys())}")

        # If agent failed, return as-is
        if result.get("status") in ("timeout", "error"):
            return result

        # Verify RED phase - run the tests to confirm they fail
        red_result = self._verify_red_phase()
        if red_result["verified"]:
            result["status"] = "red_verified"
            self.log("RED phase verified - tests fail as expected")
        elif red_result.get("skipped"):
            # Tests couldn't be run (no test runner, etc.)
            result["status"] = "complete"
            result["red_verification"] = "skipped"
            self.log(f"RED verification skipped: {red_result.get('reason', 'unknown')}")
        else:
            result["status"] = "red_not_verified"
            result["red_verification"] = red_result
            self.log("WARNING: RED phase NOT verified - tests may already pass!")

        return result

    def _verify_red_phase(self) -> dict[str, Any]:
        """Run tests to verify they fail (RED phase).

        Returns:
            Dict with:
            - verified: True if tests fail as expected
            - skipped: True if tests couldn't be run
            - reason: Explanation of result
        """
        self.log("Verifying RED phase (tests should fail)...")

        # Find test files in artifact directory
        test_files = list(self.artifact_dir.glob("tests/**/*.test.*"))
        if not test_files:
            test_files = list(self.artifact_dir.glob("tests/**/*.test.sh"))

        if not test_files:
            return {
                "verified": False,
                "skipped": True,
                "reason": "No test files found in artifacts"
            }

        # Determine test command based on task type
        if self.task_type == "app":
            # TypeScript tests - need to run from app directory
            # Note: Tests may be in task dir, not app/tests
            test_cmd = ["npx", "vitest", "run", "--reporter=verbose"]
            test_cwd = self.project_root / "app"

            # Check if vitest is available
            try:
                check = subprocess.run(
                    ["npx", "vitest", "--version"],
                    capture_output=True,
                    timeout=10,
                    cwd=str(test_cwd)
                )
                if check.returncode != 0:
                    return {
                        "verified": False,
                        "skipped": True,
                        "reason": "vitest not available"
                    }
            except (subprocess.TimeoutExpired, FileNotFoundError):
                return {
                    "verified": False,
                    "skipped": True,
                    "reason": "Could not check vitest availability"
                }

        else:
            # Infrastructure tests - bash scripts
            test_cmd = ["bash"]
            test_cwd = self.artifact_dir

        # Run each test file
        all_failed = True
        test_results = []

        for test_file in test_files[:5]:  # Limit to first 5 test files
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

                if result.returncode == 0:
                    all_failed = False
                    self.log(f"WARNING: Test passed (should fail): {test_file.name}")

            except subprocess.TimeoutExpired:
                test_results.append({
                    "file": str(test_file),
                    "timeout": True
                })
            except Exception as e:
                test_results.append({
                    "file": str(test_file),
                    "error": str(e)
                })

        return {
            "verified": all_failed,
            "skipped": False,
            "test_results": test_results,
            "reason": "All tests fail as expected" if all_failed else "Some tests passed unexpectedly"
        }
