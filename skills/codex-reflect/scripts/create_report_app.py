#!/usr/bin/env python3
"""Create a Codex Reflect artifact from an extracted evidence workspace."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
AGENTS_ROOT = SKILL_DIR.parents[1]
TEMPLATE_DIR = SKILL_DIR / "template"
HUB_CLI = AGENTS_ROOT / "bin" / "artifact-hub"


def remove_tree(path: Path) -> None:
    """Remove an owner-only extracted tree, including read-only evidence dirs."""
    for directory, child_dirs, files in os.walk(path):
        os.chmod(directory, 0o700)
        for child in child_dirs:
            os.chmod(Path(directory) / child, 0o700)
        for child in files:
            os.chmod(Path(directory) / child, 0o600)
    shutil.rmtree(path)


def create_app(
    workspace: Path,
    artifact_id: str,
    title: str | None = None,
    consume: bool = False,
) -> tuple[Path, str]:
    workspace = workspace.expanduser().resolve()
    evidence = workspace / "evidence" / "evidence.json"
    manifest_path = workspace / "manifest.json"
    if not evidence.is_file() or not manifest_path.is_file():
        raise SystemExit(f"Not an extracted Codex Reflect workspace: {workspace}")
    if not HUB_CLI.is_file():
        raise SystemExit(f"Artifact Hub CLI is missing: {HUB_CLI}")
    if not (TEMPLATE_DIR / "index.html").is_file():
        raise SystemExit(f"Codex Reflect artifact template is incomplete: {TEMPLATE_DIR}")

    workspace_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    evidence_api = json.loads(evidence.read_text(encoding="utf-8"))
    primary_session = (evidence_api.get("sessions") or [{}])[0]
    initial_git = ((primary_session.get("git") or {}).get("initial") or {})
    repository = primary_session.get("cwd")
    artifact_title = title or f"Codex Reflect: {workspace_manifest['primaryThreadId']}"
    prepared = Path(tempfile.mkdtemp(prefix="artifact-hub-codex-reflect-"))
    try:
        shutil.copytree(TEMPLATE_DIR, prepared, dirs_exist_ok=True)
        shutil.copytree(workspace / "evidence", prepared / "evidence")
        shutil.copytree(workspace / "markdown", prepared / "markdown")
        if (workspace / "AGENTS.md").is_file():
            shutil.copy2(workspace / "AGENTS.md", prepared / "AGENTS.md")
        source = {
            "discoverySessionId": workspace_manifest.get("discoverySessionId"),
            "primaryThreadId": workspace_manifest.get("primaryThreadId"),
            "sourceRollouts": workspace_manifest.get("sourceRollouts", []),
            "repository": repository,
            "project": Path(repository).name if repository else None,
            "branch": initial_git.get("branch"),
        }
        result = subprocess.run(
            [
                str(HUB_CLI), "create", artifact_id,
                "--title", artifact_title,
                "--from", str(prepared),
                "--entry", "index.html",
                "--kind", "codex-reflect",
                "--tag", "retrospective",
                "--source-json", json.dumps(source),
                "--json",
            ],
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=os.environ.copy(),
        )
        if result.returncode:
            raise SystemExit(result.stderr.strip() or result.stdout.strip() or "Artifact creation failed")
        created = json.loads(result.stdout)
        artifact = Path(created["path"])
        if consume:
            remove_tree(workspace)
        return artifact, created["url"]
    finally:
        remove_tree(prepared)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("--id", required=True, dest="artifact_id")
    parser.add_argument("--title")
    parser.add_argument("--consume", action="store_true")
    args = parser.parse_args()
    artifact, url = create_app(args.workspace, args.artifact_id, args.title, args.consume)
    print(f"Report artifact: {artifact}")
    print(f"Author report: {artifact / 'src' / 'report' / 'report.ts'}")
    print(f"Viewer URL: {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
