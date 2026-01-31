"""Architect Agent - Investigates and organizes issues into coherent domains."""

import re
from pathlib import Path
from typing import Any

from agents.base import BaseAgent


class ArchitectAgent(BaseAgent):
    """Architect Agent for analyzing tasks and organizing by domain.

    Role: Investigate and organize issues into coherent domains.
    Lifecycle: Persistent (one per task)

    Inputs:
    - Raw issue content (GitHub issue, task file, etc.)
    - Access to codebase (read-only via Claude CLI tools)

    Outputs:
    - analysis.md: Categorized issues, dependency graph, execution order
    - codebase-notes.md: Observations about current state
    - questions.md: Unknowns and clarifications needed

    Uses agent definition from: .claude/agents/architect.md
    The Claude CLI handles all tool execution (Read, Glob, Grep, etc.)
    """

    AGENT_FILE = "architect"

    def __init__(self, artifact_dir: Path | str, project_root: Path | str):
        super().__init__(artifact_dir, project_root)

    def _extract_artifacts(self, output: str) -> None:
        """Extract artifacts from <artifact> tags in output."""
        # Extract artifacts from <artifact> tags
        artifact_pattern = r'<artifact name="([^"]+)">\s*(.*?)\s*</artifact>'
        matches = re.findall(artifact_pattern, output, re.DOTALL)

        for name, content in matches:
            self.add_artifact(name, content.strip())

        # If no artifacts found, save the whole output as analysis.md
        if not self.artifacts:
            self.add_artifact("analysis.md", output)

    def run(self, issue_content: str) -> dict[str, Any]:
        """Run the architect agent on the given issue.

        Args:
            issue_content: The raw issue content (markdown, text, etc.)

        Returns:
            Dict with status, output text, and artifacts dict
        """
        # Format the input with context
        input_context = f"""# Task to Analyze

{issue_content}

---

Please analyze this task. Start by exploring the codebase to understand the current state, then produce your structured analysis.

Remember to output your analysis using <artifact> tags when complete.
"""

        result = super().run(input_context)

        self.log(f"Artifacts produced: {list(result['artifacts'].keys())}")

        return result
