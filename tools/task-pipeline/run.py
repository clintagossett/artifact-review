#!/usr/bin/env python3
"""CLI entrypoint for the Task Pipeline.

Usage:
    # Run with a GitHub issue (app code - uses tdd-developer)
    python run.py --issue 48

    # Run infrastructure task (bash/Docker - uses dx-engineer)
    python run.py --issue 48 --task-type infrastructure

    # Run with an existing task directory
    python run.py --task tasks/00048-agent-init-overhaul/

    # Run with a custom issue file
    python run.py --file path/to/issue.md

    # Specify project root (default: current directory)
    python run.py --issue 48 --project-root /path/to/project
"""

import argparse
import sys
from pathlib import Path

# Add this package to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import (
    TaskPipeline,
    fetch_github_issue,
    create_task_dir,
)


def slugify(text: str) -> str:
    """Convert text to a URL-friendly slug."""
    import re
    # Lowercase and replace spaces/special chars with hyphens
    slug = text.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')[:50]


def extract_title_from_issue(issue_content: str) -> str:
    """Extract title from GitHub issue output."""
    for line in issue_content.split('\n'):
        if line.startswith('title:'):
            return line.split(':', 1)[1].strip()
    return "untitled"


def main():
    parser = argparse.ArgumentParser(
        description="Run the Agentic Task Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        "--issue", "-i",
        type=int,
        help="GitHub issue number to process"
    )
    input_group.add_argument(
        "--task", "-t",
        type=str,
        help="Path to existing task directory"
    )
    input_group.add_argument(
        "--file", "-f",
        type=str,
        help="Path to issue/task file (markdown)"
    )

    # Default project root is 2 levels up from this script (tools/task-pipeline -> project root)
    default_project_root = str(Path(__file__).parent.parent.parent)

    parser.add_argument(
        "--project-root", "-p",
        type=str,
        default=default_project_root,
        help=f"Project root directory (default: {default_project_root})"
    )

    parser.add_argument(
        "--tasks-dir",
        type=str,
        default="tasks",
        help="Base directory for task artifacts (default: ./tasks)"
    )

    parser.add_argument(
        "--repo", "-r",
        type=str,
        help="GitHub repo in owner/repo format (for --issue)"
    )

    parser.add_argument(
        "--phase",
        type=str,
        choices=["architect", "planner", "all"],
        default="architect",
        help="Which phase to run (default: architect)"
    )

    parser.add_argument(
        "--task-type",
        type=str,
        choices=["app", "infrastructure"],
        default="app",
        help="Task type: 'app' (TypeScript/React/Convex uses tdd-developer) "
             "or 'infrastructure' (bash/Docker/env uses dx-engineer). Default: app"
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output"
    )

    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()

    # Determine task directory and issue content
    if args.issue:
        # Fetch from GitHub
        print(f"Fetching GitHub issue #{args.issue}...")
        issue_content = fetch_github_issue(args.issue, args.repo)

        # Create task directory
        title = extract_title_from_issue(issue_content)
        title_slug = slugify(title)
        task_dir = create_task_dir(
            args.issue,
            title_slug,
            project_root / args.tasks_dir
        )
        print(f"Created task directory: {task_dir}")

    elif args.task:
        # Use existing task directory
        task_dir = Path(args.task).resolve()
        if not task_dir.exists():
            print(f"Error: Task directory not found: {task_dir}")
            sys.exit(1)

        # Look for issue.md in the task directory
        issue_path = task_dir / "issue.md"
        if issue_path.exists():
            issue_content = issue_path.read_text()
        else:
            print(f"Error: No issue.md found in {task_dir}")
            sys.exit(1)

    else:
        # Read from file
        file_path = Path(args.file).resolve()
        if not file_path.exists():
            print(f"Error: File not found: {file_path}")
            sys.exit(1)

        issue_content = file_path.read_text()

        # Create task directory based on filename
        title_slug = slugify(file_path.stem)
        # Use a timestamp-based issue number for file-based tasks
        import time
        pseudo_issue = int(time.time()) % 100000
        task_dir = create_task_dir(
            pseudo_issue,
            title_slug,
            project_root / args.tasks_dir
        )

    # Run the pipeline
    pipeline = TaskPipeline(
        task_dir=task_dir,
        project_root=project_root,
        task_type=args.task_type,
    )

    if args.phase == "architect":
        result = pipeline.run_architect(issue_content)
    else:
        result = pipeline.run(issue_content)

    # Print summary
    print("\n" + "-" * 40)
    print("Summary:")
    print(f"  Status: {result.get('status', 'unknown')}")
    print(f"  Iterations: {result.get('iterations', 'N/A')}")
    print(f"  Artifacts: {list(result.get('artifacts', {}).keys())}")
    print(f"\nTask directory: {task_dir}")


if __name__ == "__main__":
    main()
