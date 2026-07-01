#!/usr/bin/env python3
"""Find Codex sessions and inspect root/workstream resolution without extraction."""

from __future__ import annotations

import argparse
import json

from reflect_core import codex_home_arg, find_sessions, list_projects, list_sessions, resolve_workstream


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--list", action="store_true")
    action.add_argument("--find", metavar="QUERY")
    action.add_argument("--projects", action="store_true")
    action.add_argument("--resolve-workstream", metavar="ID_OR_PATH")
    parser.add_argument("--codex-home", default=None)
    parser.add_argument("--project", metavar="PATH")
    parser.add_argument("--recent", type=int, default=20)
    args = parser.parse_args()
    home = codex_home_arg(args.codex_home)
    if args.list:
        result = list_sessions(home, args.recent, args.project)
    elif args.find:
        result = find_sessions(home, args.find, args.recent, args.project)
    elif args.projects:
        result = list_projects(home)
    else:
        root, sessions, edges = resolve_workstream(home, args.resolve_workstream)
        result = {"rootRollouts": [str(path) for path in root], "logicalSessions": {key: [str(path) for path in paths] for key, paths in sessions.items()}, "edges": edges}
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
