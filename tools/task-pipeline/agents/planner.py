"""Planner Agent - Creates master plan with subtasks.

Reuses architect.md agent definition but with sonnet model for faster iteration.
"""

import re
from pathlib import Path
from typing import Any

from agents.base import BaseAgent


class PlannerAgent(BaseAgent):
    """Planner Agent for breaking down architecture into subtasks.

    Role: Create master plan with ordered subtasks from architect's analysis.
    Lifecycle: Runs once after architect phase.

    Inputs:
    - Architect's analysis.md (categorized issues, dependency graph)
    - Access to codebase (read-only via Claude CLI tools)

    Outputs:
    - plan.md: Master plan with numbered subtasks
    - subtasks.json: Machine-readable subtask list with dependencies

    Uses same agent definition as Architect (.claude/agents/architect.md)
    but runs with sonnet model for faster iteration.
    """

    AGENT_FILE = "architect"  # Reuses architect.md

    def __init__(self, artifact_dir: Path | str, project_root: Path | str):
        # Use sonnet instead of opus for planning (faster, cheaper)
        super().__init__(artifact_dir, project_root, model_override="sonnet")

    def _extract_artifacts(self, output: str) -> None:
        """Extract artifacts from <artifact> tags in output."""
        artifact_pattern = r'<artifact name="([^"]+)">\s*(.*?)\s*</artifact>'
        matches = re.findall(artifact_pattern, output, re.DOTALL)

        for name, content in matches:
            self.add_artifact(name, content.strip())

        # If no artifacts found, save the whole output as plan.md
        if not self.artifacts:
            self.add_artifact("plan.md", output)

    def run(self, architect_analysis: str) -> dict[str, Any]:
        """Run the planner agent on the architect's analysis.

        Args:
            architect_analysis: The analysis.md content from architect phase

        Returns:
            Dict with status, output text, and artifacts dict
        """
        input_context = f"""# Architect Analysis to Plan

{architect_analysis}

---

Based on this architectural analysis, create a master implementation plan.

Break down the work into numbered subtasks that can be executed sequentially.
Each subtask should be small enough for one TDD cycle (test + implement).

## IMPORTANT: Capture Reference Files

As you explore the codebase, record specific file paths that will help downstream agents.
This prevents each agent from re-exploring the codebase (massive token waste).

For each subtask, include `reference_files` - existing files that demonstrate:
- Similar patterns to follow
- Code to modify
- Test examples to emulate
- Configuration formats

Example:
```json
{{
  "reference_files": [
    {{"path": "scripts/existing-script.sh", "reason": "Follow error handling pattern"}},
    {{"path": "tests/example.test.sh:15-40", "reason": "Test structure to emulate"}}
  ]
}}
```

## Output Format

Output your plan using <artifact name="plan.md"> tags.
Keep plan.md BRIEF - just subtask summaries, not full documentation.

Also output <artifact name="subtasks.json"> with a JSON array of subtasks.

Each subtask in the JSON MUST have:
- "number": sequential number (1, 2, 3...)
- "title": short descriptive title (max 10 words)
- "description": what needs to be done (max 200 words - be concise!)
- "files": list of files to be created or modified
- "depends_on": list of subtask numbers this depends on
- "reference_files": list of existing files to reference (with reason)

DO NOT write exhaustive documentation. Point to existing code instead.
"""

        result = super().run(input_context)
        self.log(f"Artifacts produced: {list(result['artifacts'].keys())}")
        return result
