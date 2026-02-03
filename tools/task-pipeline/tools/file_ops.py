"""File operations tools for agents."""

import fnmatch
import re
import subprocess
from pathlib import Path
from typing import Any


class FileTools:
    """File operation tools for agents.

    Provides read-only operations:
    - read_file: Read file contents
    - glob_files: Find files by pattern
    - grep_files: Search file contents

    And write operations (for agents that need them):
    - write_file: Write content to file
    """

    def __init__(self, base_path: Path | str):
        """Initialize with base path for all operations."""
        self.base_path = Path(base_path).resolve()

    # Tool definitions for Claude API
    READ_FILE_TOOL = {
        "name": "read_file",
        "description": "Read the contents of a file. Returns the file contents as a string.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file (relative to project root or absolute)"
                },
                "max_lines": {
                    "type": "integer",
                    "description": "Maximum number of lines to read (default: 500)"
                }
            },
            "required": ["path"]
        }
    }

    GLOB_FILES_TOOL = {
        "name": "glob_files",
        "description": "Find files matching a glob pattern. Returns list of matching file paths.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Glob pattern (e.g., '**/*.py', 'scripts/*.sh')"
                },
                "path": {
                    "type": "string",
                    "description": "Directory to search in (default: project root)"
                }
            },
            "required": ["pattern"]
        }
    }

    GREP_FILES_TOOL = {
        "name": "grep_files",
        "description": "Search for a pattern in files. Returns matching lines with file paths and line numbers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Regex pattern to search for"
                },
                "path": {
                    "type": "string",
                    "description": "File or directory to search in (default: project root)"
                },
                "glob": {
                    "type": "string",
                    "description": "Glob pattern to filter files (e.g., '*.py')"
                },
                "max_matches": {
                    "type": "integer",
                    "description": "Maximum number of matches to return (default: 50)"
                }
            },
            "required": ["pattern"]
        }
    }

    WRITE_FILE_TOOL = {
        "name": "write_file",
        "description": "Write content to a file. Creates parent directories if needed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file (relative to project root or absolute)"
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file"
                }
            },
            "required": ["path", "content"]
        }
    }

    LIST_DIR_TOOL = {
        "name": "list_directory",
        "description": "List contents of a directory. Returns files and subdirectories.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Directory path (default: project root)"
                },
                "recursive": {
                    "type": "boolean",
                    "description": "List recursively (default: false)"
                },
                "max_depth": {
                    "type": "integer",
                    "description": "Maximum depth for recursive listing (default: 3)"
                }
            },
            "required": []
        }
    }

    @classmethod
    def read_only_tools(cls) -> list[dict[str, Any]]:
        """Return list of read-only tool definitions."""
        return [
            cls.READ_FILE_TOOL,
            cls.GLOB_FILES_TOOL,
            cls.GREP_FILES_TOOL,
            cls.LIST_DIR_TOOL,
        ]

    @classmethod
    def all_tools(cls) -> list[dict[str, Any]]:
        """Return list of all tool definitions including write."""
        return cls.read_only_tools() + [cls.WRITE_FILE_TOOL]

    def _resolve_path(self, path: str | None) -> Path:
        """Resolve a path relative to base_path."""
        if path is None:
            return self.base_path
        p = Path(path)
        if p.is_absolute():
            return p
        return self.base_path / p

    def read_file(self, path: str, max_lines: int = 500) -> str:
        """Read file contents."""
        file_path = self._resolve_path(path)

        if not file_path.exists():
            return f"Error: File not found: {path}"

        if not file_path.is_file():
            return f"Error: Not a file: {path}"

        try:
            content = file_path.read_text()
            lines = content.split("\n")

            if len(lines) > max_lines:
                truncated = "\n".join(lines[:max_lines])
                return f"{truncated}\n\n... (truncated, showing {max_lines}/{len(lines)} lines)"

            return content
        except Exception as e:
            return f"Error reading file: {e}"

    def glob_files(self, pattern: str, path: str | None = None) -> str:
        """Find files matching glob pattern."""
        search_path = self._resolve_path(path)

        if not search_path.exists():
            return f"Error: Path not found: {path}"

        try:
            matches = list(search_path.glob(pattern))

            # Sort by modification time (newest first)
            matches.sort(key=lambda p: p.stat().st_mtime, reverse=True)

            # Limit results
            max_results = 100
            if len(matches) > max_results:
                matches = matches[:max_results]
                truncated = True
            else:
                truncated = False

            # Format results relative to base_path
            results = []
            for m in matches:
                try:
                    rel_path = m.relative_to(self.base_path)
                    results.append(str(rel_path))
                except ValueError:
                    results.append(str(m))

            output = "\n".join(results)
            if truncated:
                output += f"\n\n... (truncated, showing {max_results} of {len(list(search_path.glob(pattern)))} matches)"

            return output if output else "No matches found"
        except Exception as e:
            return f"Error globbing: {e}"

    def grep_files(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        max_matches: int = 50
    ) -> str:
        """Search for pattern in files using ripgrep if available, else Python."""
        search_path = self._resolve_path(path)

        # Try ripgrep first (faster)
        try:
            cmd = ["rg", "-n", "--max-count", str(max_matches)]
            if glob:
                cmd.extend(["--glob", glob])
            cmd.extend([pattern, str(search_path)])

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                return result.stdout if result.stdout else "No matches found"
            elif result.returncode == 1:
                return "No matches found"
            # Fall through to Python implementation
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # Fallback: Python implementation
        try:
            regex = re.compile(pattern)
            matches = []

            if search_path.is_file():
                files = [search_path]
            else:
                file_pattern = glob if glob else "**/*"
                files = [f for f in search_path.glob(file_pattern) if f.is_file()]

            for file_path in files:
                if len(matches) >= max_matches:
                    break

                try:
                    content = file_path.read_text()
                    for i, line in enumerate(content.split("\n"), 1):
                        if regex.search(line):
                            try:
                                rel_path = file_path.relative_to(self.base_path)
                            except ValueError:
                                rel_path = file_path
                            matches.append(f"{rel_path}:{i}:{line.strip()}")
                            if len(matches) >= max_matches:
                                break
                except (UnicodeDecodeError, PermissionError):
                    continue

            return "\n".join(matches) if matches else "No matches found"
        except Exception as e:
            return f"Error searching: {e}"

    def write_file(self, path: str, content: str) -> str:
        """Write content to file."""
        file_path = self._resolve_path(path)

        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content)
            return f"Successfully wrote {len(content)} bytes to {path}"
        except Exception as e:
            return f"Error writing file: {e}"

    def list_directory(
        self,
        path: str | None = None,
        recursive: bool = False,
        max_depth: int = 3
    ) -> str:
        """List directory contents."""
        dir_path = self._resolve_path(path)

        if not dir_path.exists():
            return f"Error: Path not found: {path}"

        if not dir_path.is_dir():
            return f"Error: Not a directory: {path}"

        try:
            results = []

            def list_dir(p: Path, depth: int = 0):
                if depth > max_depth:
                    return

                indent = "  " * depth
                for item in sorted(p.iterdir()):
                    # Skip hidden files and common ignored dirs
                    if item.name.startswith(".") or item.name in ["node_modules", "__pycache__", ".git"]:
                        continue

                    if item.is_dir():
                        results.append(f"{indent}{item.name}/")
                        if recursive:
                            list_dir(item, depth + 1)
                    else:
                        results.append(f"{indent}{item.name}")

            list_dir(dir_path)
            return "\n".join(results) if results else "Empty directory"
        except Exception as e:
            return f"Error listing directory: {e}"

    def execute(self, tool_name: str, input_data: dict[str, Any]) -> str:
        """Execute a tool by name with given input."""
        if tool_name == "read_file":
            return self.read_file(
                input_data["path"],
                input_data.get("max_lines", 500)
            )
        elif tool_name == "glob_files":
            return self.glob_files(
                input_data["pattern"],
                input_data.get("path")
            )
        elif tool_name == "grep_files":
            return self.grep_files(
                input_data["pattern"],
                input_data.get("path"),
                input_data.get("glob"),
                input_data.get("max_matches", 50)
            )
        elif tool_name == "write_file":
            return self.write_file(
                input_data["path"],
                input_data["content"]
            )
        elif tool_name == "list_directory":
            return self.list_directory(
                input_data.get("path"),
                input_data.get("recursive", False),
                input_data.get("max_depth", 3)
            )
        else:
            return f"Unknown tool: {tool_name}"
