#!/usr/bin/env python3
"""Extract immutable Codex Reflect evidence and Markdown; does not create a viewer."""

from __future__ import annotations

import argparse
from pathlib import Path

from reflect_core import (
    codex_home_arg, find_session_paths, parse_boundary, resolve_workstream,
    summarize_archive, write_analysis_pack, write_workstream_pack,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--session", metavar="ID_OR_PATH", help="Extract one logical session")
    target.add_argument("--workstream", metavar="ID_OR_PATH", help="Extract a root session and recorded descendants")
    parser.add_argument("--codex-home", default=None)
    parser.add_argument("--output-dir", metavar="PATH", required=True, help="New report workspace directory")
    parser.add_argument("--since", metavar="ISO_TIME")
    parser.add_argument("--until", metavar="ISO_TIME")
    args = parser.parse_args()
    since, until = parse_boundary(args.since), parse_boundary(args.until)
    if since and until and since > until:
        raise SystemExit("--since must be before --until")
    home = codex_home_arg(args.codex_home)
    if args.session:
        paths = find_session_paths(home, args.session)
        workspace = write_analysis_pack(home, paths, summarize_archive(paths, since, until), since, until, args.output_dir)
    else:
        root_paths, sessions, edges = resolve_workstream(home, args.workstream)
        workspace = write_workstream_pack(home, root_paths, sessions, edges, since, until, args.output_dir)
    print(f"Evidence workspace: {workspace}")
    print(f"Markdown entry: {workspace / 'markdown' / 'index.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
