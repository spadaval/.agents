#!/usr/bin/env python3
"""Start, stop, or inspect a report-local Codex Reflect Vite viewer."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit(f"Codex Reflect viewer unavailable: {message}")


def state_path(app: Path) -> Path:
    return app / ".codex-reflect-viewer.json"


def read_state(app: Path) -> dict[str, object] | None:
    path = state_path(app)
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def alive(pid: object) -> bool:
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def ensure_dependencies(app: Path) -> None:
    if shutil.which("node") is None or shutil.which("npm") is None:
        fail("install Node.js and npm, then rerun. No static HTML fallback is available.")
    if not (app / "package.json").is_file():
        fail(f"{app} is not a report-local app (package.json missing).")
    if (app / "node_modules" / ".bin" / "vite").exists():
        return
    result = subprocess.run(
        ["npm", "install", "--no-audit", "--no-fund"], cwd=app, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    if result.returncode:
        tail = result.stdout[-1200:].strip()
        fail(f"npm install failed (exit {result.returncode}).\n{tail}")


def start(app: Path) -> str:
    existing = read_state(app)
    if existing and alive(existing.get("pid")):
        return str(existing["url"])
    ensure_dependencies(app)
    port = free_port()
    url = f"http://127.0.0.1:{port}/"
    log_path = app / ".codex-reflect-vite.log"
    log = log_path.open("a", encoding="utf-8")
    process = subprocess.Popen(
        ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(port), "--strictPort"],
        cwd=app, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    for _ in range(40):
        time.sleep(0.15)
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.15):
                state_path(app).write_text(json.dumps({"pid": process.pid, "port": port, "url": url}) + "\n", encoding="utf-8")
                return url
        except OSError:
            if process.poll() is not None:
                break
    fail(f"Vite did not start. See {log_path}")


def stop(app: Path) -> None:
    state = read_state(app)
    if state and alive(state.get("pid")):
        os.kill(int(state["pid"]), 15)
    state_path(app).unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("start", "stop", "status"))
    parser.add_argument("app", type=Path, help="Path to the report workspace's app directory")
    args = parser.parse_args()
    app = args.app.expanduser().resolve()
    if args.command == "start":
        url = start(app)
        port = url.rsplit(":", 1)[1].rstrip("/")
        print(f"Viewer URL: {url}")
        print(f"Remote access: ssh -L {port}:127.0.0.1:{port} <vm-host>")
        return 0
    if args.command == "stop":
        stop(app)
        print("Viewer stopped.")
        return 0
    state = read_state(app)
    if state and alive(state.get("pid")):
        print(f"Viewer URL: {state.get('url')}")
        return 0
    print("Viewer is not running.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
