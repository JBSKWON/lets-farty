#!/usr/bin/env python3
"""Compatibility entry point adapted from the supplied harness template.

Uses the repository's pinned Node tooling; no uv/Python dependencies are needed.
"""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
COMMANDS = ['check:architecture']

if __name__ == "__main__":
    for command in COMMANDS:
        result = subprocess.run(["npm", "run", command, "--", *sys.argv[1:]], cwd=ROOT)
        if result.returncode:
            sys.exit(result.returncode)
