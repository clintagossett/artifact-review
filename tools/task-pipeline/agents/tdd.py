"""TDD Agent - Writes failing tests for a subtask.

Agent selection based on task type:
- dx-engineer: Infrastructure (bash, Docker, env files)
- tdd-developer: Application code (TypeScript, React, Convex)
"""

import re
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
    - Access to codebase (read-only via Claude CLI tools)

    Outputs:
    - tests/: Test files that define expected behavior
    - test-spec.md: Human-readable test specification

    Agent selection:
    - task_type="infrastructure" → dx-engineer (bash, Docker, env)
    - task_type="app" → tdd-developer (TypeScript, React, Convex)
    """

    AGENT_FILE = "tdd-developer"  # Default, can be overridden

    def __init__(
        self,
        artifact_dir: Path | str,
        project_root: Path | str,
        task_type: str = "app",
    ):
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

    def run(self, subtask: dict[str, Any]) -> dict[str, Any]:
        """Run the TDD agent to write failing tests for a subtask.

        Args:
            subtask: Subtask dict with number, title, description, files

        Returns:
            Dict with status, output text, and artifacts dict
        """
        input_context = f"""# Subtask to Test

**Subtask {subtask.get('number', '?')}:** {subtask.get('title', 'Unknown')}

## Description
{subtask.get('description', 'No description provided')}

## Files Likely Affected
{chr(10).join('- ' + f for f in subtask.get('files', []))}

---

Write failing tests that define the acceptance criteria for this subtask.
Follow TDD principles: tests should be specific, isolated, and clearly express intent.

The tests should FAIL initially (RED phase of TDD).
Do NOT implement the feature - only write the tests.

Output your test specification using <artifact name="test-spec.md"> tags.
Output each test file using <artifact name="tests/filename.test.ts"> tags.
"""

        result = super().run(input_context)
        self.log(f"Artifacts produced: {list(result['artifacts'].keys())}")
        return result
