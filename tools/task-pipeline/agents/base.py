"""Base agent class for the task pipeline.

Uses the Claude CLI (claude --print) instead of the Anthropic Python SDK.
This allows using Claude Max subscription instead of API keys.
"""

import json
import re
import subprocess
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import yaml


class AgentConfig:
    """Configuration parsed from agent definition YAML frontmatter."""

    def __init__(self, name: str, description: str, tools: list[str], model: str, prompt: str):
        self.name = name
        self.description = description
        self.tools = tools
        self.model = model
        self.prompt = prompt

    @classmethod
    def from_file(cls, path: Path) -> "AgentConfig":
        """Parse agent config from markdown file with YAML frontmatter."""
        content = path.read_text()

        # Extract YAML frontmatter between --- markers
        match = re.match(r"^---\n(.*?)\n---\n(.*)$", content, re.DOTALL)
        if not match:
            raise ValueError(f"No YAML frontmatter found in {path}")

        frontmatter = yaml.safe_load(match.group(1))
        prompt = match.group(2).strip()

        return cls(
            name=frontmatter.get("name", path.stem),
            description=frontmatter.get("description", ""),
            tools=[t.strip() for t in frontmatter.get("tools", "").split(",")],
            model=frontmatter.get("model", "sonnet"),
            prompt=prompt,
        )


class BaseAgent(ABC):
    """Base class for all pipeline agents.

    Uses the Claude CLI for execution, which supports Max subscription auth.
    Agent definitions are loaded from .claude/agents/*.md files.

    The CLI handles:
    - Authentication (via Max subscription or API key)
    - Tool execution (built-in tools: Read, Glob, Grep, Edit, Write, Bash)
    - Agentic loop (tool calls and responses)
    """

    # Subclasses should override this to match the agent file name (without .md)
    AGENT_FILE: str = ""

    # Timeout for CLI execution (10 minutes default)
    TIMEOUT_SECONDS: int = 600

    def __init__(
        self,
        artifact_dir: Path | str,
        project_root: Path | str,
        model_override: str | None = None,
    ):
        self.artifact_dir = Path(artifact_dir)
        self.project_root = Path(project_root).resolve()

        # Load agent config from .claude/agents/
        self.config = self._load_agent_config()

        # Allow model override (e.g., same agent file with different model)
        self.model = model_override or self.config.model
        self.artifacts: dict[str, str] = {}

    def _load_agent_config(self) -> AgentConfig:
        """Load agent config from .claude/agents/ directory."""
        if not self.AGENT_FILE:
            raise ValueError("AGENT_FILE must be set in subclass")

        agents_dir = self.project_root / ".claude" / "agents"
        agent_path = agents_dir / f"{self.AGENT_FILE}.md"

        if not agent_path.exists():
            raise FileNotFoundError(f"Agent definition not found: {agent_path}")

        return AgentConfig.from_file(agent_path)

    def run(self, input_context: str) -> dict[str, Any]:
        """Run the agent with the given input context using Claude CLI.

        Uses `claude --print` for non-interactive execution with the
        agent definition from .claude/agents/.

        Returns a dict with the agent's result/artifacts.
        """
        self.log("Starting...")

        # Build CLI command
        cmd = [
            "claude",
            "--print",
            "--agent", self.AGENT_FILE,
            "--model", self.model,
            "--output-format", "json",
            "--permission-mode", "bypassPermissions",
            input_context
        ]

        self.log(f"Running: claude --print --agent {self.AGENT_FILE} --model {self.model}")

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.TIMEOUT_SECONDS,
                cwd=str(self.project_root)
            )

            if result.returncode != 0:
                self.log(f"CLI error (exit {result.returncode}): {result.stderr}")
                return {
                    "status": "error",
                    "error": result.stderr,
                    "output": result.stdout,
                    "artifacts": self.artifacts
                }

            # Parse JSON output
            try:
                output_data = json.loads(result.stdout)
                output_text = output_data.get("result", result.stdout)
            except json.JSONDecodeError:
                # If not JSON, use raw output
                output_text = result.stdout

            # Extract artifacts from output
            self._extract_artifacts(output_text)

            self.log("Complete")
            return {
                "status": "complete",
                "output": output_text,
                "artifacts": self.artifacts
            }

        except subprocess.TimeoutExpired:
            self.log(f"Timeout after {self.TIMEOUT_SECONDS}s")
            return {
                "status": "timeout",
                "error": f"Execution timed out after {self.TIMEOUT_SECONDS} seconds",
                "artifacts": self.artifacts
            }
        except FileNotFoundError:
            self.log("Error: 'claude' CLI not found")
            return {
                "status": "error",
                "error": "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
                "artifacts": self.artifacts
            }

    @abstractmethod
    def _extract_artifacts(self, output: str) -> None:
        """Extract artifacts from agent output.

        Subclasses should implement this to parse their specific output format
        and call add_artifact() for each artifact found.
        """
        pass

    def save_artifacts(self) -> None:
        """Save all artifacts to the artifact directory."""
        self.artifact_dir.mkdir(parents=True, exist_ok=True)
        for name, content in self.artifacts.items():
            artifact_path = self.artifact_dir / name
            # Create parent directories for nested artifact paths (e.g., "tests/unit/foo.sh")
            artifact_path.parent.mkdir(parents=True, exist_ok=True)
            artifact_path.write_text(content)
            print(f"  Saved: {artifact_path}")

    def add_artifact(self, name: str, content: str) -> None:
        """Add an artifact to be saved later."""
        self.artifacts[name] = content

    def log(self, message: str) -> None:
        """Log a message with agent prefix."""
        print(f"[{self.config.name}] {message}")
