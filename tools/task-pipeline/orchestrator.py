"""Task Pipeline Orchestrator - Coordinates agents and manages state.

Uses Claude CLI (via Max subscription) instead of Anthropic Python SDK.
"""

import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

from agents.architect import ArchitectAgent
from agents.planner import PlannerAgent
from agents.tdd import TDDAgent
from agents.executor import ExecutorAgent


class TaskPipeline:
    """Orchestrates the multi-agent task pipeline.

    Flow:
    1. Architect Agent - Analyzes issue, organizes by domain
    2. Planner Agent - Creates master plan with subtasks
    3. For each subtask:
       - TDD Agent - Writes failing tests
       - Executor Agent - Implements to pass tests

    State is persisted to the task directory.
    Uses Claude CLI for agent execution (supports Max subscription).
    """

    def __init__(
        self,
        task_dir: Path | str,
        project_root: Path | str | None = None,
        task_type: str = "app",
    ):
        """Initialize the pipeline.

        Args:
            task_dir: Directory for task artifacts (will be created if needed)
            project_root: Root of the project to analyze (default: current directory)
            task_type: Type of task - "app" (TypeScript/React/Convex) or
                       "infrastructure" (bash/Docker/env). Determines which
                       agent to use for TDD and Executor phases.
        """
        self.task_dir = Path(task_dir).resolve()
        self.project_root = Path(project_root).resolve() if project_root else Path.cwd()
        self.task_type = task_type

        # Task metadata
        self.task_metadata: dict[str, Any] = {
            "created_at": datetime.now().isoformat(),
            "status": "initialized",
            "task_type": task_type,
            "phases_completed": []
        }

    def _save_task_metadata(self) -> None:
        """Save task metadata to task.json."""
        self.task_dir.mkdir(parents=True, exist_ok=True)
        metadata_path = self.task_dir / "task.json"
        metadata_path.write_text(json.dumps(self.task_metadata, indent=2))

    def _load_task_metadata(self) -> None:
        """Load task metadata from task.json if it exists."""
        metadata_path = self.task_dir / "task.json"
        if metadata_path.exists():
            self.task_metadata = json.loads(metadata_path.read_text())

    def save_issue(self, issue_content: str) -> None:
        """Save the original issue to the task directory."""
        self.task_dir.mkdir(parents=True, exist_ok=True)
        issue_path = self.task_dir / "issue.md"
        issue_path.write_text(issue_content)
        print(f"Saved issue to: {issue_path}")

    def run_architect(self, issue_content: str) -> dict[str, Any]:
        """Run the Architect phase.

        Args:
            issue_content: Raw issue content to analyze

        Returns:
            Result dict from the architect agent
        """
        print("\n" + "=" * 60)
        print("PHASE 1: ARCHITECT")
        print("=" * 60)

        # Create architect artifact directory
        architect_dir = self.task_dir / "01-architect"

        # Run architect agent (uses Claude CLI)
        architect = ArchitectAgent(
            artifact_dir=architect_dir,
            project_root=self.project_root
        )

        result = architect.run(issue_content)

        # Save artifacts
        architect.save_artifacts()

        # Update metadata
        self.task_metadata["status"] = "architect_complete"
        self.task_metadata["phases_completed"].append({
            "phase": "architect",
            "completed_at": datetime.now().isoformat(),
            "status": result.get("status", "unknown"),
            "artifacts": list(result["artifacts"].keys())
        })
        self._save_task_metadata()

        print("\nArchitect phase complete.")
        print(f"Artifacts saved to: {architect_dir}")

        return result

    def run_planner(self, architect_analysis: str) -> dict[str, Any]:
        """Run the Planner phase.

        Args:
            architect_analysis: Analysis content from architect phase

        Returns:
            Result dict from the planner agent
        """
        print("\n" + "=" * 60)
        print("PHASE 2: PLANNER")
        print("=" * 60)

        planner_dir = self.task_dir / "02-planner"

        planner = PlannerAgent(
            artifact_dir=planner_dir,
            project_root=self.project_root
        )

        result = planner.run(architect_analysis)
        planner.save_artifacts()

        self.task_metadata["status"] = "planner_complete"
        self.task_metadata["phases_completed"].append({
            "phase": "planner",
            "completed_at": datetime.now().isoformat(),
            "status": result.get("status", "unknown"),
            "artifacts": list(result["artifacts"].keys())
        })
        self._save_task_metadata()

        print("\nPlanner phase complete.")
        print(f"Artifacts saved to: {planner_dir}")

        return result

    def run_subtask(self, subtask: dict, subtask_num: int) -> dict[str, Any]:
        """Run TDD + Executor cycle for a single subtask.

        Args:
            subtask: Subtask dict from planner's subtasks.json
            subtask_num: Subtask number for directory naming

        Returns:
            Result dict with TDD and executor results
        """
        print("\n" + "-" * 40)
        print(f"SUBTASK {subtask_num}: {subtask.get('title', 'Unknown')}")
        print("-" * 40)

        subtask_dir = self.task_dir / f"03-subtask-{subtask_num:02d}"

        # Phase 3a: TDD - Write failing tests
        print(f"\n[TDD] Writing failing tests... (agent: {self.task_type})")
        tdd_dir = subtask_dir / "tdd"
        tdd_agent = TDDAgent(
            artifact_dir=tdd_dir,
            project_root=self.project_root,
            task_type=self.task_type,
        )
        tdd_result = tdd_agent.run(subtask)
        tdd_agent.save_artifacts()

        # Get test spec for executor
        test_spec = tdd_result["artifacts"].get("test-spec.md", "")

        # Phase 3b: Executor - Implement to pass tests
        print(f"\n[EXECUTOR] Implementing code... (agent: {self.task_type})")
        exec_dir = subtask_dir / "executor"
        executor = ExecutorAgent(
            artifact_dir=exec_dir,
            project_root=self.project_root,
            task_type=self.task_type,
        )
        exec_result = executor.run(subtask, test_spec)
        executor.save_artifacts()

        # Update metadata
        self.task_metadata["phases_completed"].append({
            "phase": f"subtask-{subtask_num}",
            "completed_at": datetime.now().isoformat(),
            "tdd_status": tdd_result.get("status", "unknown"),
            "executor_status": exec_result.get("status", "unknown"),
            "tdd_artifacts": list(tdd_result["artifacts"].keys()),
            "executor_artifacts": list(exec_result["artifacts"].keys())
        })
        self._save_task_metadata()

        print(f"\nSubtask {subtask_num} complete.")

        return {
            "tdd": tdd_result,
            "executor": exec_result
        }

    def run(self, issue_content: str) -> dict[str, Any]:
        """Run the full pipeline.

        Phases:
        - Phase 1: Architect (opus) - Analyze and organize
        - Phase 2: Planner (sonnet) - Create subtask plan
        - Phase 3: For each subtask:
            - TDD (sonnet) - Write failing tests
            - Executor (sonnet) - Implement to pass tests

        Args:
            issue_content: Raw issue content

        Returns:
            Summary of pipeline execution
        """
        print(f"\nStarting Task Pipeline")
        print(f"Task directory: {self.task_dir}")
        print(f"Project root: {self.project_root}")

        # Load existing state if resuming
        self._load_task_metadata()
        completed_phases = {p["phase"] for p in self.task_metadata.get("phases_completed", [])}

        # Save the original issue
        self.save_issue(issue_content)

        # Phase 1: Architect (opus)
        if "architect" in completed_phases:
            print("\n[SKIP] Architect phase already complete")
            analysis_path = self.task_dir / "01-architect" / "analysis.md"
            analysis = analysis_path.read_text() if analysis_path.exists() else ""
        else:
            architect_result = self.run_architect(issue_content)

            if architect_result.get("status") != "complete":
                print("\nArchitect phase failed. Stopping pipeline.")
                return {"status": "failed", "phase": "architect", "error": architect_result}

            analysis = architect_result["artifacts"].get("analysis.md", "")

        # Phase 2: Planner (sonnet)
        if "planner" in completed_phases:
            print("\n[SKIP] Planner phase already complete")
            subtasks_path = self.task_dir / "02-planner" / "subtasks.json"
            if subtasks_path.exists():
                subtasks = json.loads(subtasks_path.read_text())
            else:
                print("\nError: Planner marked complete but subtasks.json not found")
                return {"status": "failed", "phase": "planner", "error": "subtasks.json missing"}
        else:
            planner_result = self.run_planner(analysis)

            if planner_result.get("status") != "complete":
                print("\nPlanner phase failed. Stopping pipeline.")
                return {"status": "failed", "phase": "planner", "error": planner_result}

            subtasks = self._parse_subtasks(planner_result)

        if not subtasks:
            print("\nNo subtasks found in planner output. Stopping pipeline.")
            return {"status": "failed", "phase": "planner", "error": "No subtasks parsed"}

        print(f"\nFound {len(subtasks)} subtasks to execute.")

        # Phase 3: TDD + Executor loop
        print("\n" + "=" * 60)
        print("PHASE 3: TDD + EXECUTOR LOOP")
        print("=" * 60)

        # Check which subtasks are already complete
        completed_subtasks = self._get_completed_subtasks()

        subtask_results = []
        for i, subtask in enumerate(subtasks, 1):
            if i in completed_subtasks:
                print(f"\n[SKIP] Subtask {i} already complete")
                continue
            result = self.run_subtask(subtask, i)
            subtask_results.append(result)

        # Update final status
        self.task_metadata["status"] = "complete"
        self._save_task_metadata()

        # Generate summary
        summary = {
            "task_dir": str(self.task_dir),
            "status": "complete",
            "phases": self.task_metadata["phases_completed"],
            "subtasks_completed": len(subtask_results)
        }

        print("\n" + "=" * 60)
        print("PIPELINE COMPLETE")
        print("=" * 60)
        print(f"\nTask artifacts: {self.task_dir}")
        print(f"Subtasks completed: {len(subtask_results)}")

        return summary

    def _get_completed_subtasks(self) -> set[int]:
        """Get set of completed subtask numbers from metadata."""
        self._load_task_metadata()
        completed = set()
        for phase in self.task_metadata.get("phases_completed", []):
            phase_name = phase.get("phase", "")
            if phase_name.startswith("subtask-"):
                try:
                    num = int(phase_name.split("-")[1])
                    completed.add(num)
                except (IndexError, ValueError):
                    pass
        return completed

    def _parse_subtasks(self, planner_result: dict[str, Any]) -> list[dict]:
        """Parse subtasks from planner output.

        Tries to parse subtasks.json artifact first, falls back to
        extracting from plan.md if JSON not available.
        """
        import json as json_module

        # Try subtasks.json first
        subtasks_json = planner_result["artifacts"].get("subtasks.json", "")
        if subtasks_json:
            try:
                return json_module.loads(subtasks_json)
            except json_module.JSONDecodeError:
                print("Warning: Could not parse subtasks.json, falling back to plan.md")

        # Fallback: create a single subtask from the plan
        plan = planner_result["artifacts"].get("plan.md", "")
        if plan:
            return [{
                "number": 1,
                "title": "Implement plan",
                "description": plan,
                "files": [],
                "depends_on": []
            }]

        return []


def fetch_github_issue(issue_number: int, repo: str | None = None) -> str:
    """Fetch a GitHub issue using the gh CLI.

    Args:
        issue_number: The issue number
        repo: Repository in owner/repo format (default: current repo)

    Returns:
        Issue content as markdown
    """
    cmd = ["gh", "issue", "view", str(issue_number)]
    if repo:
        cmd.extend(["--repo", repo])

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"Failed to fetch issue: {result.stderr}")

    return result.stdout


def create_task_dir(issue_number: int, title_slug: str, base_dir: Path | None = None) -> Path:
    """Create a task directory with standard naming.

    Args:
        issue_number: GitHub issue number
        title_slug: Slug for the task title (e.g., "agent-init-overhaul")
        base_dir: Base directory for tasks (default: ./tasks)

    Returns:
        Path to the created task directory
    """
    if base_dir is None:
        base_dir = Path.cwd() / "tasks"

    # Zero-pad issue number to 5 digits
    task_name = f"{issue_number:05d}-{title_slug}"
    task_dir = base_dir / task_name

    task_dir.mkdir(parents=True, exist_ok=True)
    return task_dir
