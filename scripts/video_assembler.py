#!/usr/bin/env python3
"""
video_assembler.py - Combine E2E test recordings with title slides

Usage:
    python video_assembler.py --output master.mp4 \
        --journey "Login Flow" test-results/login-flow \
        --journey "Profile Settings" test-results/profile-settings

Requirements:
    - ffmpeg installed (brew install ffmpeg / apt install ffmpeg)
    - Python 3.7+
"""

import argparse
import subprocess
import tempfile
import sys
from pathlib import Path
from typing import List, Tuple


def create_title_slide(
    title: str,
    output_path: Path,
    duration: int = 3,
    width: int = 1280,
    height: int = 720
) -> None:
    """Generate a title slide video using ffmpeg."""
    bg_color = "#1a1a2e"
    text_color = "white"

    # Detect font path based on OS
    import platform
    system = platform.system()

    if system == "Darwin":  # macOS
        font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
        if not Path(font_path).exists():
            font_path = "/System/Library/Fonts/Helvetica.ttc"
    elif system == "Linux":
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    else:
        font_path = None

    font_arg = f"fontfile={font_path}:" if font_path else ""

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c={bg_color}:s={width}x{height}:d={duration}",
        "-vf", f"drawtext={font_arg}text='{title}':fontsize=64:fontcolor={text_color}:x=(w-text_w)/2:y=(h-text_h)/2",
        "-c:v", "libx264",
        "-t", str(duration),
        "-pix_fmt", "yuv420p",
        str(output_path)
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"  ✓ Created title: {output_path.name}")
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Error creating title: {e.stderr}", file=sys.stderr)
        raise


def normalize_video(
    input_path: Path,
    output_path: Path,
    width: int = 1280,
    height: int = 720,
    fps: int = 30
) -> None:
    """Normalize video to consistent format."""
    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
        "-r", str(fps),
        "-pix_fmt", "yuv420p",
        "-an",
        str(output_path)
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"  ✓ Normalized: {output_path.name}")
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Error normalizing: {e.stderr}", file=sys.stderr)
        raise


def concat_clips(clip_paths: List[Path], output_path: Path) -> None:
    """Concatenate multiple video clips."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        for clip in clip_paths:
            f.write(f"file '{clip.absolute()}'\n")
        list_file = f.name

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        str(output_path)
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"  ✓ Concatenated clips")
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Error concatenating: {e.stderr}", file=sys.stderr)
        raise
    finally:
        Path(list_file).unlink()


def collect_webm_clips(directory: Path) -> List[Path]:
    """
    Find all video.webm clips in subdirectories (Playwright test results).

    Playwright creates one subdirectory per test with video.webm inside:
    - test-results/test-name-hash-chromium/video.webm

    This function finds all such video.webm files.
    """
    clips = sorted(directory.rglob("video.webm"))
    # Exclude flow.webm if it exists
    return [c for c in clips if c.name != "flow.webm"]


def assemble_master(
    journeys: List[Tuple[str, Path]],
    output_path: Path,
    temp_dir: Path
) -> None:
    """Assemble master video from journeys with title slides."""
    segments = []

    print(f"Assembling validation video with {len(journeys)} journeys...\n")

    for i, (title, journey_dir) in enumerate(journeys):
        print(f"[{i+1}/{len(journeys)}] Processing: {title}")

        # Create title slide
        title_path = temp_dir / f"{i:02d}_title.mp4"
        print("  → Generating title slide...")
        create_title_slide(title, title_path)
        segments.append(title_path)

        # Find or create journey flow
        flow_path = journey_dir / "flow.webm"
        if not flow_path.exists():
            print("  → Concatenating clips...")
            clips = collect_webm_clips(journey_dir)
            if clips:
                concat_clips(clips, flow_path)
            else:
                print(f"  ✗ No video clips found in {journey_dir}", file=sys.stderr)
                continue
        else:
            print("  → Using existing flow.webm")

        # Normalize journey video
        normalized_path = temp_dir / f"{i:02d}_journey.mp4"
        print("  → Normalizing video...")
        normalize_video(flow_path, normalized_path)
        segments.append(normalized_path)

        print()

    # Final concatenation
    print("Creating master video...")
    concat_clips(segments, output_path)
    print(f"\n✓ Master validation video created: {output_path}\n")
    print(f"View with: open \"{output_path}\"")


def check_ffmpeg():
    """Check if ffmpeg is installed."""
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            check=True,
            capture_output=True,
            text=True
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: ffmpeg not found. Install it first:", file=sys.stderr)
        print("  macOS: brew install ffmpeg", file=sys.stderr)
        print("  Linux: sudo apt install ffmpeg", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Assemble E2E test recordings into master validation video",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
  python video_assembler.py --output validation-videos/master.mp4 \\
      --journey "Login Flow" test-results/login-flow \\
      --journey "Signup Flow" test-results/signup-flow
        """
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Output file path"
    )
    parser.add_argument(
        "--journey", "-j",
        nargs=2,
        action="append",
        metavar=("TITLE", "DIR"),
        help="Journey title and directory (can specify multiple)"
    )

    args = parser.parse_args()

    if not args.journey:
        parser.error("At least one --journey is required")

    # Check dependencies
    check_ffmpeg()

    # Parse journeys
    journeys = [(title, Path(dir_path)) for title, dir_path in args.journey]
    output_path = Path(args.output)

    # Validate journey directories
    for title, journey_dir in journeys:
        if not journey_dir.exists():
            print(f"Error: Journey directory does not exist: {journey_dir}", file=sys.stderr)
            sys.exit(1)

    # Create output directory
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Assemble video
    with tempfile.TemporaryDirectory() as temp_dir:
        assemble_master(journeys, output_path, Path(temp_dir))


if __name__ == "__main__":
    main()
