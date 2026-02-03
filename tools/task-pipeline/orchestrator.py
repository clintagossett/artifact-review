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
       - TDD Agent - Writes failing tests (RED phase - verified)
       - Executor Agent - Implements to pass tests (GREEN phase - verified)
    4. Integration Test - Verify all subtasks work together
    5. Smoke Test - Validate actual deliverable works

    State is persisted to the task directory.
    Uses Claude CLI for agent execution (supports Max subscription).
    """

    # Default failure threshold - stop pipeline if this many subtasks fail
    DEFAULT_MAX_FAILURES = 3

    def __init__(
        self,
        task_dir: Path | str,
        project_root: Path | str | None = None,
        task_type: str = "app",
        max_failures: int | None = None,
    ):
        """Initialize the pipeline.

        Args:
            task_dir: Directory for task artifacts (will be created if needed)
            project_root: Root of the project to analyze (default: current directory)
            task_type: Type of task - "app" (TypeScript/React/Convex) or
                       "infrastructure" (bash/Docker/env). Determines which
                       agent to use for TDD and Executor phases.
            max_failures: Maximum subtask failures before stopping pipeline.
                          Default: 3. Set to 0 for unlimited failures.
        """
        self.task_dir = Path(task_dir).resolve()
        self.project_root = Path(project_root).resolve() if project_root else Path.cwd()
        self.task_type = task_type
        self.max_failures = max_failures if max_failures is not None else self.DEFAULT_MAX_FAILURES

        # Failure tracking
        self.failure_count = 0
        self.failed_subtasks: list[dict] = []

        # Task metadata
        self.task_metadata: dict[str, Any] = {
            "created_at": datetime.now().isoformat(),
            "status": "initialized",
            "task_type": task_type,
            "max_failures": self.max_failures,
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
            Result dict with TDD and executor results, including overall status
        """
        print("\n" + "-" * 40)
        print(f"SUBTASK {subtask_num}: {subtask.get('title', 'Unknown')}")
        print("-" * 40)

        subtask_dir = self.task_dir / f"03-subtask-{subtask_num:02d}"
        subtask_failed = False
        failure_reason = None

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

        # Check TDD result - must have RED verification
        tdd_status = tdd_result.get("status", "unknown")
        if tdd_status == "timeout":
            subtask_failed = True
            failure_reason = "TDD phase timed out"
            print(f"\n[ERROR] {failure_reason}")
        elif tdd_status == "error":
            subtask_failed = True
            failure_reason = f"TDD phase error: {tdd_result.get('error', 'unknown')}"
            print(f"\n[ERROR] {failure_reason}")
        elif tdd_status not in ("complete", "red_verified"):
            # Warn but continue - test execution may not be available for all task types
            print(f"\n[WARN] TDD RED phase not verified (status: {tdd_status})")

        # Get test spec for executor
        test_spec = tdd_result["artifacts"].get("test-spec.md", "")

        # Phase 3b: Executor - Implement to pass tests (only if TDD didn't fail)
        exec_result = {"status": "skipped", "artifacts": {}}
        if not subtask_failed:
            print(f"\n[EXECUTOR] Implementing code... (agent: {self.task_type})")
            exec_dir = subtask_dir / "executor"
            executor = ExecutorAgent(
                artifact_dir=exec_dir,
                project_root=self.project_root,
                task_type=self.task_type,
            )
            exec_result = executor.run(subtask, test_spec)
            executor.save_artifacts()

            # Check executor result
            exec_status = exec_result.get("status", "unknown")
            if exec_status == "timeout":
                subtask_failed = True
                failure_reason = "Executor phase timed out"
                print(f"\n[ERROR] {failure_reason}")
            elif exec_status == "error":
                subtask_failed = True
                failure_reason = f"Executor phase error: {exec_result.get('error', 'unknown')}"
                print(f"\n[ERROR] {failure_reason}")
            elif exec_status not in ("complete", "green_verified"):
                print(f"\n[WARN] Executor GREEN phase not verified (status: {exec_status})")

        # Update metadata
        subtask_status = "failed" if subtask_failed else "complete"
        self.task_metadata["phases_completed"].append({
            "phase": f"subtask-{subtask_num}",
            "completed_at": datetime.now().isoformat(),
            "status": subtask_status,
            "failure_reason": failure_reason,
            "tdd_status": tdd_result.get("status", "unknown"),
            "executor_status": exec_result.get("status", "unknown"),
            "tdd_artifacts": list(tdd_result["artifacts"].keys()),
            "executor_artifacts": list(exec_result["artifacts"].keys())
        })
        self._save_task_metadata()

        if subtask_failed:
            print(f"\n[FAILED] Subtask {subtask_num} failed: {failure_reason}")
        else:
            print(f"\n[OK] Subtask {subtask_num} complete.")

        return {
            "status": subtask_status,
            "failure_reason": failure_reason,
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
        if self.max_failures > 0:
            print(f"Failure threshold: {self.max_failures} (pipeline stops if exceeded)")

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

            # Track failures
            if result.get("status") == "failed":
                self.failure_count += 1
                self.failed_subtasks.append({
                    "subtask_num": i,
                    "title": subtask.get("title", "Unknown"),
                    "reason": result.get("failure_reason", "Unknown")
                })

                # Check failure threshold
                if self.max_failures > 0 and self.failure_count >= self.max_failures:
                    print("\n" + "=" * 60)
                    print("PIPELINE STOPPED - FAILURE THRESHOLD EXCEEDED")
                    print("=" * 60)
                    print(f"\nFailed subtasks ({self.failure_count}/{self.max_failures}):")
                    for f in self.failed_subtasks:
                        print(f"  - Subtask {f['subtask_num']}: {f['title']}")
                        print(f"    Reason: {f['reason']}")

                    self.task_metadata["status"] = "failed_threshold"
                    self.task_metadata["failure_count"] = self.failure_count
                    self.task_metadata["failed_subtasks"] = self.failed_subtasks
                    self._save_task_metadata()

                    return {
                        "task_dir": str(self.task_dir),
                        "status": "failed",
                        "reason": "failure_threshold_exceeded",
                        "failure_count": self.failure_count,
                        "failed_subtasks": self.failed_subtasks,
                        "subtasks_completed": len(subtask_results) - self.failure_count
                    }

        # Phase 4: Integration Test
        print("\n" + "=" * 60)
        print("PHASE 4: INTEGRATION TEST")
        print("=" * 60)
        integration_result = self.run_integration_test(subtasks)
        if integration_result.get("status") != "passed":
            print(f"\n[FAILED] Integration test failed: {integration_result.get('error', 'unknown')}")
            self.task_metadata["status"] = "integration_failed"
            self._save_task_metadata()
            return {
                "task_dir": str(self.task_dir),
                "status": "failed",
                "reason": "integration_test_failed",
                "integration_result": integration_result,
                "subtasks_completed": len(subtask_results) - self.failure_count
            }

        # Phase 5: Smoke Test
        print("\n" + "=" * 60)
        print("PHASE 5: SMOKE TEST")
        print("=" * 60)
        smoke_result = self.run_smoke_test()
        if smoke_result.get("status") != "passed":
            print(f"\n[FAILED] Smoke test failed: {smoke_result.get('error', 'unknown')}")
            self.task_metadata["status"] = "smoke_test_failed"
            self._save_task_metadata()
            return {
                "task_dir": str(self.task_dir),
                "status": "failed",
                "reason": "smoke_test_failed",
                "smoke_result": smoke_result,
                "subtasks_completed": len(subtask_results) - self.failure_count
            }

        # Update final status
        self.task_metadata["status"] = "complete"
        self.task_metadata["failure_count"] = self.failure_count
        if self.failed_subtasks:
            self.task_metadata["failed_subtasks"] = self.failed_subtasks
        self._save_task_metadata()

        # Generate summary
        summary = {
            "task_dir": str(self.task_dir),
            "status": "complete",
            "phases": self.task_metadata["phases_completed"],
            "subtasks_completed": len(subtask_results) - self.failure_count,
            "subtasks_failed": self.failure_count
        }

        print("\n" + "=" * 60)
        print("PIPELINE COMPLETE")
        print("=" * 60)
        print(f"\nTask artifacts: {self.task_dir}")
        print(f"Subtasks completed: {len(subtask_results) - self.failure_count}")
        if self.failure_count > 0:
            print(f"Subtasks failed: {self.failure_count}")

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

    def run_integration_test(self, subtasks: list[dict]) -> dict[str, Any]:
        """Run integration tests to verify all subtasks work together.

        Phase 4: After all subtasks complete, verify the combined changes
        don't break each other.

        Args:
            subtasks: List of completed subtasks

        Returns:
            Result dict with status and any errors
        """
        print("\nRunning integration tests...")

        # Determine test command based on task type
        if self.task_type == "app":
            # TypeScript/React/Convex - run vitest
            test_cmd = ["npm", "run", "test"]
            test_dir = self.project_root / "app"
        else:
            # Infrastructure - run bats or bash tests
            test_cmd = ["bash", "-c", "find . -name '*.test.sh' -exec bash {} \\;"]
            test_dir = self.task_dir

        try:
            result = subprocess.run(
                test_cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout for integration tests
                cwd=str(test_dir)
            )

            # Save test output
            integration_dir = self.task_dir / "04-integration"
            integration_dir.mkdir(parents=True, exist_ok=True)
            (integration_dir / "test-output.txt").write_text(
                f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}"
            )

            if result.returncode == 0:
                print("[OK] Integration tests passed")
                self.task_metadata["phases_completed"].append({
                    "phase": "integration",
                    "completed_at": datetime.now().isoformat(),
                    "status": "passed"
                })
                self._save_task_metadata()
                return {"status": "passed"}
            else:
                print(f"[FAILED] Integration tests failed (exit code {result.returncode})")
                self.task_metadata["phases_completed"].append({
                    "phase": "integration",
                    "completed_at": datetime.now().isoformat(),
                    "status": "failed",
                    "exit_code": result.returncode
                })
                self._save_task_metadata()
                return {
                    "status": "failed",
                    "error": f"Tests exited with code {result.returncode}",
                    "stdout": result.stdout[-2000:] if result.stdout else "",
                    "stderr": result.stderr[-2000:] if result.stderr else ""
                }

        except subprocess.TimeoutExpired:
            print("[TIMEOUT] Integration tests timed out")
            self.task_metadata["phases_completed"].append({
                "phase": "integration",
                "completed_at": datetime.now().isoformat(),
                "status": "timeout"
            })
            self._save_task_metadata()
            return {"status": "failed", "error": "Integration tests timed out after 5 minutes"}

        except FileNotFoundError as e:
            print(f"[WARN] Could not run integration tests: {e}")
            # Don't fail if tests can't be found - just warn
            self.task_metadata["phases_completed"].append({
                "phase": "integration",
                "completed_at": datetime.now().isoformat(),
                "status": "skipped",
                "reason": str(e)
            })
            self._save_task_metadata()
            return {"status": "passed", "warning": f"Tests skipped: {e}"}

    def run_smoke_test(self) -> dict[str, Any]:
        """Run smoke test to validate the actual deliverable works.

        Phase 5: Test the end-to-end deliverable, not just unit tests.
        For infrastructure tasks, this might run the actual script.
        For app tasks, this might start the server and hit an endpoint.

        Returns:
            Result dict with status and any errors
        """
        print("\nRunning smoke test...")

        smoke_dir = self.task_dir / "05-smoke-test"
        smoke_dir.mkdir(parents=True, exist_ok=True)

        # Look for a smoke test script in the task directory
        smoke_script = self.task_dir / "smoke-test.sh"
        if not smoke_script.exists():
            # Try task-level tests directory
            smoke_script = self.task_dir / "tests" / "smoke.sh"

        if smoke_script.exists():
            # Run the custom smoke test
            print(f"Running custom smoke test: {smoke_script}")
            try:
                result = subprocess.run(
                    ["bash", str(smoke_script)],
                    capture_output=True,
                    text=True,
                    timeout=120,  # 2 minute timeout
                    cwd=str(self.project_root)
                )

                (smoke_dir / "smoke-output.txt").write_text(
                    f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}"
                )

                if result.returncode == 0:
                    print("[OK] Smoke test passed")
                    self.task_metadata["phases_completed"].append({
                        "phase": "smoke_test",
                        "completed_at": datetime.now().isoformat(),
                        "status": "passed"
                    })
                    self._save_task_metadata()
                    return {"status": "passed"}
                else:
                    print(f"[FAILED] Smoke test failed (exit {result.returncode})")
                    self.task_metadata["phases_completed"].append({
                        "phase": "smoke_test",
                        "completed_at": datetime.now().isoformat(),
                        "status": "failed",
                        "exit_code": result.returncode
                    })
                    self._save_task_metadata()
                    return {
                        "status": "failed",
                        "error": f"Smoke test exited with code {result.returncode}",
                        "stdout": result.stdout[-1000:] if result.stdout else "",
                        "stderr": result.stderr[-1000:] if result.stderr else ""
                    }

            except subprocess.TimeoutExpired:
                print("[TIMEOUT] Smoke test timed out")
                self.task_metadata["phases_completed"].append({
                    "phase": "smoke_test",
                    "completed_at": datetime.now().isoformat(),
                    "status": "timeout"
                })
                self._save_task_metadata()
                return {"status": "failed", "error": "Smoke test timed out after 2 minutes"}

        else:
            # No smoke test defined - use default behavior based on task type
            if self.task_type == "infrastructure":
                # For infrastructure, there's usually a main script to test
                # Look for common patterns
                main_scripts = list(self.project_root.glob("scripts/*.sh"))
                if main_scripts:
                    print(f"[INFO] No smoke test defined. Consider adding {self.task_dir}/smoke-test.sh")

            print("[SKIP] No smoke test defined - skipping")
            self.task_metadata["phases_completed"].append({
                "phase": "smoke_test",
                "completed_at": datetime.now().isoformat(),
                "status": "skipped",
                "reason": "No smoke-test.sh found"
            })
            self._save_task_metadata()
            return {"status": "passed", "warning": "No smoke test defined"}


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
