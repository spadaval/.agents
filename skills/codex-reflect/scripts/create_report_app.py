#!/usr/bin/env python3
"""Create the report-local Svelte app from an extracted Codex Reflect workspace."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from reflect_core import copy_report_template, immutable_tree, require_viewer_prerequisites, write_json


def create_app(workspace: Path) -> Path:
    workspace = workspace.expanduser().resolve()
    evidence = workspace / "evidence" / "evidence.json"
    manifest_path = workspace / "manifest.json"
    if not evidence.is_file() or not manifest_path.is_file():
        raise SystemExit(f"Not an extracted Codex Reflect workspace: {workspace}")
    if (workspace / "app").exists():
        raise SystemExit(f"Report app already exists: {workspace / 'app'}")
    require_viewer_prerequisites()
    app = copy_report_template(workspace)
    api = json.loads(evidence.read_text(encoding="utf-8"))
    write_json(app / "public" / "data" / "evidence.json", api)
    immutable_tree(app / "public" / "data")
    manifest_path.chmod(0o600)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["appCreated"] = True
    write_json(manifest_path, manifest)
    manifest_path.chmod(0o400)
    return app


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    args = parser.parse_args()
    print(f"Report app: {create_app(args.workspace)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
