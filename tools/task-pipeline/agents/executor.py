"""Executor Agent - Implements code to pass failing tests.

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
            self.add_artifact("implementation-notes.md", output)

    def run(self, subtask: dict[str, Any], test_spec: str) -> dict[str, Any]:
        """Run the executor agent to implement code for a subtask.

        Args:
            subtask: Subtask dict with number, title, description, files
            test_spec: Test specification from TDD agent

        Returns:
            Dict with status, output text, and artifacts dict
        """
        input_context = f"""# Subtask to Implement

**Subtask {subtask.get('number', '?')}:** {subtask.get('title', 'Unknown')}

## Description
{subtask.get('description', 'No description provided')}

## Files Likely Affected
{chr(10).join('- ' + f for f in subtask.get('files', []))}

## Test Specification
{test_spec}

---

Implement the minimal code needed to make the tests pass.
Follow TDD principles: GREEN phase - just enough code to pass tests.

You have full access to edit files in the codebase.
After implementing, run the tests to verify they pass.

Output implementation notes using <artifact name="implementation-notes.md"> tags.
Include: what files were modified, key decisions made, any issues encountered.
"""

        result = super().run(input_context)
        self.log(f"Artifacts produced: {list(result['artifacts'].keys())}")
        return result
