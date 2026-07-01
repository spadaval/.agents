#!/usr/bin/env python3
"""Summarize Codex session logs from ~/.codex."""

from __future__ import annotations

import argparse
import collections
import contextlib
import datetime as dt
import io
import json
import os
import re
import sqlite3
import sys
import tempfile
from pathlib import Path
from typing import Any

TOKEN_FIELDS = [
    "input_tokens",
    "cached_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
    "total_tokens",
]


def parse_time(value: Any) -> dt.datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return dt.datetime.fromtimestamp(value, tz=dt.timezone.utc)
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return dt.datetime.fromisoformat(text)
    except ValueError:
        return None


def fmt_time(value: dt.datetime | None) -> str:
    if value is None:
        return "unknown"
    return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def fmt_duration(seconds: float | None) -> str:
    if seconds is None:
        return "unknown"
    seconds = max(0, int(round(seconds)))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h {m}m {s}s"
    if m:
        return f"{m}m {s}s"
    return f"{s}s"


def fmt_rate(value: float | None) -> str:
    return f"{value:.1%}" if value is not None else "not observed"


def parse_boundary(value: str | None) -> dt.datetime | None:
    if value is None:
        return None
    parsed = parse_time(value)
    if parsed is None:
        raise SystemExit(f"Could not parse timestamp {value!r}; use ISO-8601, for example 2026-06-20T05:37:14Z")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def in_time_window(row: dict[str, Any], since: dt.datetime | None, until: dt.datetime | None) -> bool:
    if since is None and until is None:
        return True
    at = parse_time(row.get("timestamp"))
    if at is None:
        return False
    if at.tzinfo is None:
        at = at.replace(tzinfo=dt.timezone.utc)
    at = at.astimezone(dt.timezone.utc)
    if since is not None and at < since:
        return False
    if until is not None and at > until:
        return False
    return True


def newer_time(left: Any, right: Any) -> Any:
    left_time = parse_time(left)
    right_time = parse_time(right)
    if left_time is None:
        return right
    if right_time is None:
        return left
    return right if right_time > left_time else left


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line_no, line in enumerate(handle, 1):
            line = line.strip()
            if not line:
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                rows.append({"_decode_error": str(exc), "_line": line_no})
                continue
            if isinstance(value, dict):
                value["_line"] = line_no
                rows.append(value)
    return rows


def compact(text: Any, limit: int = 220) -> str:
    if text is None:
        return ""
    out = re.sub(r"\s+", " ", str(text)).strip()
    if len(out) <= limit:
        return out
    return out[: max(0, limit - 3)] + "..."


def content_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts)
    return ""


def codex_home_arg(value: str | None) -> Path:
    if value:
        return Path(value).expanduser()
    return Path(os.environ.get("CODEX_HOME", "~/.codex")).expanduser()


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")
    path.chmod(0o600)


def capture_markdown(renderer: Any, *args: Any) -> str:
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        renderer(*args)
    return output.getvalue().rstrip()


def create_analysis_dir(codex_home: Path, session_id: str, output_dir: str | None) -> Path:
    if output_dir:
        path = Path(output_dir).expanduser()
        if path.exists():
            raise SystemExit(f"Analysis output directory already exists: {path}")
        path.mkdir(parents=True, mode=0o700)
        return path
    root = codex_home / "tmp" / "codex-reflect"
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    return Path(tempfile.mkdtemp(prefix=f"{session_id}-", dir=root))


def transcript_files(codex_home: Path) -> list[Path]:
    files = list((codex_home / "archived_sessions").glob("rollout-*.jsonl"))
    files.extend((codex_home / "sessions").glob("**/rollout-*.jsonl"))
    return sorted(set(files))


def read_session_index(codex_home: Path) -> list[dict[str, Any]]:
    path = codex_home / "session_index.jsonl"
    if not path.exists():
        return []
    return load_jsonl(path)


def read_history(codex_home: Path) -> list[dict[str, Any]]:
    path = codex_home / "history.jsonl"
    if not path.exists():
        return []
    return load_jsonl(path)


def archive_meta(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("type") == "session_meta" and isinstance(row.get("payload"), dict):
                payload = row["payload"]
                return {
                    "id": payload.get("id"),
                    "timestamp": payload.get("timestamp") or row.get("timestamp"),
                    "cwd": payload.get("cwd"),
                    "path": str(path),
                }
            if row.get("type") not in {"event_msg", "turn_context", "response_item"}:
                continue
    match = re.match(r"rollout-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})-(.+)$", path.stem)
    if match:
        stamp = match.group(1).replace("T", " ").replace("-", ":", 2)
        try:
            parsed = dt.datetime.strptime(stamp, "%Y:%m:%d %H-%M-%S").replace(tzinfo=dt.timezone.utc)
            timestamp = fmt_time(parsed)
        except ValueError:
            timestamp = None
        return {"id": match.group(2), "timestamp": timestamp, "cwd": None, "path": str(path)}
    session_id = path.stem
    try:
        mtime = dt.datetime.fromtimestamp(path.stat().st_mtime, tz=dt.timezone.utc)
    except OSError:
        mtime = None
    return {"id": session_id, "timestamp": fmt_time(mtime), "cwd": None, "path": str(path)}


def find_archive(codex_home: Path, session: str) -> Path:
    candidate = Path(session).expanduser()
    if candidate.exists():
        return candidate
    matches: list[Path] = []
    for path in transcript_files(codex_home):
        if session in path.name:
            matches.append(path)
            continue
        meta = archive_meta(path)
        if session == meta.get("id"):
            matches.append(path)
    if not matches:
        raise SystemExit(f"No Codex rollout transcript matched {session!r}")
    if len(matches) > 1:
        choices = "\n".join(str(path) for path in matches[:20])
        raise SystemExit(f"Multiple rollout transcripts matched {session!r}:\n{choices}")
    return matches[0]


def transcript_index(codex_home: Path) -> dict[str, Path]:
    index: dict[str, Path] = {}
    for path in transcript_files(codex_home):
        meta = archive_meta(path)
        session_id = meta.get("id")
        if session_id:
            index[str(session_id)] = path
    return index


def normalized_cwd(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    return str(Path(value).expanduser().resolve())


def list_sessions(codex_home: Path, recent: int, project: str | None = None) -> list[dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for row in read_session_index(codex_home):
        session_id = row.get("id")
        if not session_id:
            continue
        by_id[str(session_id)] = {
            "id": str(session_id),
            "thread_name": row.get("thread_name"),
            "updated_at": row.get("updated_at"),
            "source": "session_index",
        }
    history = collections.defaultdict(list)
    for row in read_history(codex_home):
        if row.get("session_id"):
            history[str(row["session_id"])].append(row)
    for session_id, rows in history.items():
        entry = by_id.setdefault(session_id, {"id": session_id, "source": "history"})
        entry["history_count"] = len(rows)
        entry["first_prompt"] = compact(rows[0].get("text"), 140)
        entry["last_prompt"] = compact(rows[-1].get("text"), 140)
        entry["updated_at"] = newer_time(entry.get("updated_at"), fmt_time(parse_time(rows[-1].get("ts"))))
    for path in transcript_files(codex_home):
        meta = archive_meta(path)
        session_id = str(meta.get("id") or path.name)
        entry = by_id.setdefault(session_id, {"id": session_id})
        entry["transcript"] = str(path)
        entry["transcript_timestamp"] = meta.get("timestamp")
        entry["cwd"] = meta.get("cwd")
        entry["updated_at"] = newer_time(entry.get("updated_at"), meta.get("timestamp"))
        entry["source"] = "transcript+" + str(entry.get("source", ""))
    normalized_project = normalized_cwd(project) if project else None
    entries = list(by_id.values())
    if normalized_project:
        entries = [entry for entry in entries if normalized_cwd(entry.get("cwd")) == normalized_project]

    def sort_key(item: dict[str, Any]) -> dt.datetime:
        return parse_time(item.get("updated_at") or item.get("transcript_timestamp")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc)
    return sorted(entries, key=sort_key, reverse=True)[:recent]


def list_projects(codex_home: Path) -> list[dict[str, Any]]:
    projects: dict[str, dict[str, Any]] = {}
    for entry in list_sessions(codex_home, 100000):
        cwd = normalized_cwd(entry.get("cwd"))
        if not cwd:
            continue
        project = projects.setdefault(cwd, {"cwd": cwd, "session_count": 0, "updated_at": None})
        project["session_count"] += 1
        project["updated_at"] = newer_time(project.get("updated_at"), entry.get("updated_at") or entry.get("transcript_timestamp"))
    return sorted(projects.values(), key=lambda item: parse_time(item.get("updated_at")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc), reverse=True)


def find_sessions(codex_home: Path, query: str, recent: int, project: str | None = None) -> list[dict[str, Any]]:
    needle = query.lower()
    matches: dict[str, dict[str, Any]] = {}
    candidates = list_sessions(codex_home, 100000, project)
    eligible_ids = {entry["id"] for entry in candidates}
    for entry in candidates:
        blob = json.dumps(entry, default=str).lower()
        if needle in blob:
            matches[entry["id"]] = dict(entry)
    for row in read_history(codex_home):
        session_id = row.get("session_id")
        if not session_id:
            continue
        if project and str(session_id) not in eligible_ids:
            continue
        text = str(row.get("text") or "")
        if needle in text.lower():
            entry = matches.setdefault(str(session_id), {"id": str(session_id)})
            entry["history_match"] = compact(text, 180)
            entry["history_ts"] = fmt_time(parse_time(row.get("ts")))
    for path in transcript_files(codex_home):
        rows = load_jsonl(path)
        meta = next((r.get("payload", {}) for r in rows if r.get("type") == "session_meta"), {})
        session_id = str(meta.get("id") or path.name)
        if project and session_id not in eligible_ids:
            continue
        for row in rows:
            payload = row.get("payload")
            if not isinstance(payload, dict):
                continue
            texts = []
            if payload.get("type") in {"user_message", "agent_message"}:
                texts.append(payload.get("message"))
            if payload.get("type") == "message" and payload.get("role") in {"user", "assistant"}:
                texts.append(content_text(payload.get("content")))
            for text in texts:
                if text and needle in str(text).lower():
                    entry = matches.setdefault(session_id, {"id": session_id})
                    entry["transcript"] = str(path)
                    entry["transcript_match"] = compact(text, 180)
                    entry["transcript_ts"] = row.get("timestamp")
                    break
    def sort_key(item: dict[str, Any]) -> dt.datetime:
        return parse_time(item.get("transcript_ts") or item.get("updated_at") or item.get("history_ts")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc)
    return sorted(matches.values(), key=sort_key, reverse=True)[:recent]


def parse_args_json(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def command_head(cmd: str) -> str:
    words = re.findall(r"[A-Za-z0-9_./:+-]+", cmd)
    return " ".join(words[:3]) if words else "(empty)"


def exit_code(output: str) -> int | None:
    patterns = [
        r"Process exited with code (-?\d+)",
        r"Exit code: (-?\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, output)
        if match:
            return int(match.group(1))
    return None


def output_failure_kinds(output: str) -> list[str]:
    """Return evidence-based failure signals from a structured tool output."""
    try:
        value = json.loads(output)
    except (TypeError, json.JSONDecodeError):
        return []
    if not isinstance(value, dict):
        return []
    kinds = []
    if value.get("error") or value.get("error_message"):
        kinds.append("structured_error")
    if value.get("success") is False or str(value.get("status", "")).lower() in {"error", "failed", "failure"}:
        kinds.append("structured_failure_status")
    return kinds


def normalized_command(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def compact_activity(event: dict[str, Any]) -> dict[str, Any]:
    result = {
        "kind": event.get("kind"),
        "timestamp": event.get("timestamp"),
        "line": event.get("line"),
    }
    if event.get("kind") in {"agent_message", "user_message"}:
        result["message"] = compact(event.get("message"), 500)
    if event.get("kind") == "tool_call":
        result["tool"] = event.get("tool")
        if event.get("cmd"):
            result["cmd"] = compact(event.get("cmd"), 300)
    if event.get("kind") == "patch_apply":
        result["success"] = event.get("success")
        result["changes"] = event.get("changes")
    return result


def session_id_pattern() -> re.Pattern[str]:
    return re.compile(
        r"\b019[0-9a-f]{5}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
        re.IGNORECASE,
    )


def extract_linked_session_evidence(
    rows: list[dict[str, Any]], own_ids: set[str] | None = None
) -> list[dict[str, Any]]:
    own_ids = set(own_ids or set())
    evidence: dict[str, set[str]] = collections.defaultdict(set)
    pattern = session_id_pattern()
    for row in rows:
        payload = row.get("payload")
        if row.get("type") == "session_meta" and isinstance(payload, dict) and payload.get("id"):
            own_ids.add(str(payload["id"]))
        if not isinstance(payload, dict):
            continue
        if payload.get("type") == "function_call_output":
            output = payload.get("output")
            if isinstance(output, str) and "agent_id" in output:
                for session_id in pattern.findall(output):
                    evidence[session_id].add("function_call_output.agent_id")
        if payload.get("type") in {"user_message", "agent_message"}:
            message = payload.get("message")
            if isinstance(message, str) and ("subagent" in message.lower() or "agent_" in message):
                for session_id in pattern.findall(message):
                    evidence[session_id].add("message.subagent_reference")
        if payload.get("type") == "message":
            text = content_text(payload.get("content"))
            if "subagent" in text.lower() or "agent_" in text:
                for session_id in pattern.findall(text):
                    evidence[session_id].add("message.subagent_reference")

    records = []
    for session_id, sources in evidence.items():
        if session_id in own_ids:
            continue
        records.append({
            "id": session_id,
            "sources": sorted(sources),
            "confidence": "strong" if "function_call_output.agent_id" in sources else "weak",
        })
    return sorted(records, key=lambda record: str(record["id"]))


def extract_linked_session_ids(rows: list[dict[str, Any]], own_ids: set[str] | None = None) -> set[str]:
    """Retain the legacy ID-only view of detected linked-session evidence."""
    return {record["id"] for record in extract_linked_session_evidence(rows, own_ids)}


def extract_spawned_subagent_ids(rows: list[dict[str, Any]], own_ids: set[str] | None = None) -> set[str]:
    """Find direct spawn evidence without treating every linked session as a child."""
    own_ids = set(own_ids or set())
    spawned: set[str] = set()
    pattern = session_id_pattern()
    for row in rows:
        payload = row.get("payload")
        if row.get("type") == "session_meta" and isinstance(payload, dict) and payload.get("id"):
            own_ids.add(str(payload["id"]))
        if not isinstance(payload, dict):
            continue
        if payload.get("type") == "function_call_output":
            output = payload.get("output")
            if isinstance(output, str) and "agent_id" in output:
                spawned.update(pattern.findall(output))
        message = ""
        if payload.get("type") in {"user_message", "agent_message"}:
            message = str(payload.get("message") or "")
        elif payload.get("type") == "message":
            message = content_text(payload.get("content"))
        if "<subagent_notification" in message and "agent_path" in message:
            spawned.update(pattern.findall(message))
    return spawned - own_ids


def summarize_archive(
    path: Path,
    since: dt.datetime | None = None,
    until: dt.datetime | None = None,
) -> dict[str, Any]:
    raw_rows = load_jsonl(path)
    own_ids: set[str] = set()
    meta: dict[str, Any] = {"path": str(path)}
    for row in raw_rows:
        payload = row.get("payload")
        if row.get("type") == "session_meta" and isinstance(payload, dict):
            meta.update(payload)
            if payload.get("id"):
                own_ids.add(str(payload["id"]))
    rows = [row for row in raw_rows if in_time_window(row, since, until)]
    timestamps = [parse_time(row.get("timestamp")) for row in rows]
    timestamps = [value for value in timestamps if value is not None]
    event_counts = collections.Counter()
    payload_counts = collections.Counter()
    users: list[dict[str, Any]] = []
    agent_messages: list[dict[str, Any]] = []
    turns: dict[str, dict[str, Any]] = {}
    token_snapshots: list[dict[str, Any]] = []
    calls: dict[str, dict[str, Any]] = {}
    patches: list[dict[str, Any]] = []

    previous_time: dt.datetime | None = None
    gaps: list[dict[str, Any]] = []

    for row in rows:
        event_counts[row.get("type")] += 1
        payload = row.get("payload")
        payload_type = payload.get("type") if isinstance(payload, dict) else None
        payload_counts[payload_type] += 1
        at = parse_time(row.get("timestamp"))
        if previous_time and at:
            delta = (at - previous_time).total_seconds()
            if delta >= 60:
                gaps.append({
                    "seconds": delta,
                    "from": fmt_time(previous_time),
                    "to": fmt_time(at),
                    "line": row.get("_line"),
                    "event": payload_type or row.get("type"),
                })
        if at:
            previous_time = at

        if row.get("type") == "session_meta" and isinstance(payload, dict):
            continue
        if not isinstance(payload, dict):
            continue
        if payload_type == "user_message":
            users.append({"timestamp": row.get("timestamp"), "message": payload.get("message"), "line": row.get("_line")})
        elif payload_type == "agent_message":
            agent_messages.append({"timestamp": row.get("timestamp"), "message": payload.get("message"), "line": row.get("_line")})
        elif payload_type == "message":
            role = payload.get("role")
            if role == "user":
                users.append({"timestamp": row.get("timestamp"), "message": content_text(payload.get("content")), "line": row.get("_line")})
            elif role == "assistant":
                agent_messages.append({"timestamp": row.get("timestamp"), "message": content_text(payload.get("content")), "line": row.get("_line")})
        elif payload_type == "task_started":
            turn_id = payload.get("turn_id")
            if turn_id:
                turns.setdefault(str(turn_id), {})["started"] = payload
                turns[str(turn_id)]["started_timestamp"] = row.get("timestamp")
        elif payload_type == "task_complete":
            turn_id = payload.get("turn_id")
            if turn_id:
                turns.setdefault(str(turn_id), {})["complete"] = payload
                turns[str(turn_id)]["completed_timestamp"] = row.get("timestamp")
        elif payload_type == "token_count":
            info = payload.get("info") or {}
            usage = info.get("total_token_usage") or {}
            token_snapshots.append({
                "timestamp": row.get("timestamp"),
                "model_context_window": info.get("model_context_window"),
                **usage,
            })
        elif payload_type in {"function_call", "custom_tool_call"}:
            call_id = payload.get("call_id")
            if call_id:
                args = parse_args_json(payload.get("arguments") or payload.get("input"))
                calls[str(call_id)] = {
                    "id": str(call_id),
                    "name": payload.get("name"),
                    "type": payload_type,
                    "timestamp": row.get("timestamp"),
                    "arguments": args,
                    "raw_input": payload.get("input") if payload_type == "custom_tool_call" else None,
                    "line": row.get("_line"),
                }
        elif payload_type in {"function_call_output", "custom_tool_call_output"}:
            call_id = payload.get("call_id")
            if call_id:
                call = calls.setdefault(str(call_id), {"id": str(call_id)})
                output = payload.get("output") or ""
                output_text = output if isinstance(output, str) else json.dumps(output, default=str)
                call["output"] = output_text
                call["output_timestamp"] = row.get("timestamp")
                call["output_line"] = row.get("_line")
                call["exit_code"] = exit_code(output_text)
        elif payload_type == "patch_apply_end":
            patches.append({
                "timestamp": row.get("timestamp"),
                "success": payload.get("success"),
                "stdout": compact(payload.get("stdout"), 300),
                "stderr": compact(payload.get("stderr"), 300),
                "changes": sorted((payload.get("changes") or {}).keys()),
                "line": row.get("_line"),
            })

    tool_counts = collections.Counter(str(call.get("name") or call.get("type")) for call in calls.values())
    shell_counts = collections.Counter()
    failed_calls: list[dict[str, Any]] = []
    failure_events: list[dict[str, Any]] = []
    call_failure_kinds: dict[str, list[str]] = {}
    for call in calls.values():
        args = call.get("arguments") or {}
        if call.get("name") == "exec_command" and isinstance(args, dict):
            cmd = str(args.get("cmd") or "")
            shell_counts[command_head(cmd)] += 1
            call["cmd"] = cmd
        kinds = []
        if call.get("exit_code") not in (None, 0):
            kinds.append("nonzero_exit")
        if "output" in call:
            kinds.extend(output_failure_kinds(str(call.get("output") or "")))
        else:
            kinds.append("unmatched_tool_call")
        kinds = sorted(set(kinds))
        if kinds:
            call_failure_kinds[str(call.get("id"))] = kinds
            failure = {
                "source": "tool_call",
                "id": call.get("id"),
                "timestamp": call.get("timestamp"),
                "name": call.get("name"),
                "cmd": call.get("cmd"),
                "exit_code": call.get("exit_code"),
                "output": compact(call.get("output"), 500),
                "line": call.get("output_line") or call.get("line"),
                "failure_kinds": kinds,
            }
            failure_events.append(failure)
            if "nonzero_exit" in kinds:
                failed_calls.append({
                    "timestamp": call.get("timestamp"),
                    "name": call.get("name"),
                    "cmd": call.get("cmd"),
                    "exit_code": call.get("exit_code"),
                    "output": compact(call.get("output"), 500),
                    "line": call.get("line"),
                })

    for patch in patches:
        if patch.get("success") is False:
            failure_events.append({
                "source": "patch_apply",
                "timestamp": patch.get("timestamp"),
                "line": patch.get("line"),
                "failure_kinds": ["patch_apply_failure"],
                "changes": patch.get("changes"),
                "stderr": patch.get("stderr"),
            })

    activity_events = []
    for message in agent_messages:
        activity_events.append({"kind": "agent_message", **message})
    for message in users:
        activity_events.append({"kind": "user_message", **message})
    for call in calls.values():
        activity_events.append({
            "kind": "tool_call",
            "id": call.get("id"),
            "tool": call.get("name"),
            "cmd": call.get("cmd"),
            "timestamp": call.get("timestamp"),
            "line": call.get("line"),
            "has_output": "output" in call,
        })
    for patch in patches:
        activity_events.append({"kind": "patch_apply", **patch})
    activity_events = sorted(
        (event for event in activity_events if isinstance(event.get("line"), int)),
        key=lambda event: int(event["line"]),
    )

    for failure in failure_events:
        line = failure.get("line")
        prior_messages = [event for event in activity_events if event["kind"] == "agent_message" and event["line"] < line]
        later_events = [event for event in activity_events if event["line"] > line]
        next_message = next((event for event in later_events if event["kind"] == "agent_message"), None)
        next_action = next((event for event in later_events if event["kind"] in {"tool_call", "patch_apply", "user_message"}), None)
        response = {
            "previous_agent_message": compact_activity(prior_messages[-1]) if prior_messages else None,
            "next_agent_message": compact_activity(next_message) if next_message else None,
            "next_action": compact_activity(next_action) if next_action else None,
        }
        if next_action is None:
            response["follow_up"] = "no_follow_up_observed"
        elif next_action["kind"] == "user_message":
            response["follow_up"] = "user_escalation_observed"
        elif next_action["kind"] == "patch_apply":
            response["follow_up"] = "patch_follow_up_observed"
        else:
            next_id = str(next_action.get("id"))
            next_kinds = call_failure_kinds.get(next_id, [])
            if failure.get("source") == "tool_call" and next_action.get("tool") == failure.get("name"):
                if normalized_command(next_action.get("cmd")) == normalized_command(failure.get("cmd")):
                    response["follow_up"] = "unchanged_retry"
                else:
                    response["follow_up"] = "modified_retry"
            else:
                response["follow_up"] = "fallback_tool_call"
            if next_kinds:
                response["follow_up_outcome"] = "failure_signal_observed"
            elif next_action.get("has_output"):
                response["follow_up_outcome"] = "no_failure_signal_observed"
            else:
                response["follow_up_outcome"] = "outcome_unobserved"
        failure["response_context"] = response

    failure_events.sort(key=lambda event: int(event.get("line") or 0))

    tool_calls = [call for call in calls.values() if call.get("name") and isinstance(call.get("line"), int)]
    completed_tool_calls = [call for call in tool_calls if "output" in call]
    clean_tool_calls = [
        call for call in completed_tool_calls
        if not call_failure_kinds.get(str(call.get("id")))
    ]
    recovery_outcomes = [
        failure.get("response_context", {}).get("follow_up_outcome")
        for failure in failure_events
    ]
    observed_recoveries = [outcome for outcome in recovery_outcomes if outcome in {"no_failure_signal_observed", "failure_signal_observed"}]
    clean_recoveries = [outcome for outcome in observed_recoveries if outcome == "no_failure_signal_observed"]
    operational_metrics = {
        "tool_call_count": len(tool_calls),
        "completed_tool_call_count": len(completed_tool_calls),
        "clean_tool_completion_count": len(clean_tool_calls),
        "clean_tool_completion_rate": (len(clean_tool_calls) / len(completed_tool_calls)) if completed_tool_calls else None,
        "failure_signal_count": len(failure_events),
        "observed_recovery_count": len(clean_recoveries),
        "recovery_candidate_count": len(observed_recoveries),
        "observed_recovery_rate": (len(clean_recoveries) / len(observed_recoveries)) if observed_recoveries else None,
        "patch_event_count": len(patches),
        "failed_patch_count": sum(1 for patch in patches if patch.get("success") is False),
    }

    turn_list = []
    for turn_id, turn in turns.items():
        complete = turn.get("complete") or {}
        started = turn.get("started") or {}
        turn_list.append({
            "turn_id": turn_id,
            "started": turn.get("started_timestamp"),
            "completed": turn.get("completed_timestamp"),
            "duration_ms": complete.get("duration_ms"),
            "time_to_first_token_ms": complete.get("time_to_first_token_ms"),
            "model_context_window": started.get("model_context_window"),
            "last_agent_message": compact(complete.get("last_agent_message"), 500),
        })

    linked_session_evidence = extract_linked_session_evidence(rows, own_ids)
    spawned_subagent_ids = sorted(extract_spawned_subagent_ids(rows, own_ids))
    return {
        "meta": meta,
        "path": str(path),
        "start": fmt_time(min(timestamps) if timestamps else None),
        "end": fmt_time(max(timestamps) if timestamps else None),
        "duration_seconds": (max(timestamps) - min(timestamps)).total_seconds() if timestamps else None,
        "event_counts": {str(key): value for key, value in event_counts.items()},
        "payload_counts": {str(key): value for key, value in payload_counts.items()},
        "user_messages": users,
        "agent_message_count": len(agent_messages),
        "agent_messages_sample": agent_messages[:3] + (agent_messages[-3:] if len(agent_messages) > 6 else agent_messages[3:]),
        "turns": turn_list,
        "token_final": token_snapshots[-1] if token_snapshots else None,
        "token_snapshots": token_snapshots,
        "linked_session_ids": [record["id"] for record in linked_session_evidence],
        "linked_session_evidence": linked_session_evidence,
        "detected_linked_session_count": len(linked_session_evidence),
        "detected_spawned_subagent_ids": spawned_subagent_ids,
        "detected_spawned_subagent_count": len(spawned_subagent_ids),
        "time_filter": {
            "since": fmt_time(since),
            "until": fmt_time(until),
        } if since or until else None,
        "tool_counts": dict(tool_counts),
        "operational_metrics": operational_metrics,
        "shell_command_heads": dict(shell_counts.most_common(20)),
        "failed_calls": failed_calls,
        "failure_events": failure_events,
        "patches": patches,
        "long_gaps": sorted(gaps, key=lambda item: item["seconds"], reverse=True)[:20],
    }


def resolve_session_quiet(codex_home: Path, session: str, index: dict[str, Path] | None = None) -> Path | None:
    if index and session in index:
        return index[session]
    try:
        return find_archive(codex_home, session)
    except SystemExit:
        return None


def token_usage_record(
    path: Path,
    role: str,
    source: str | None = None,
    since: dt.datetime | None = None,
    until: dt.datetime | None = None,
) -> dict[str, Any]:
    summary = summarize_archive(path, since=since, until=until)
    meta = summary.get("meta") if isinstance(summary.get("meta"), dict) else {}
    token = summary.get("token_final") if isinstance(summary.get("token_final"), dict) else {}
    record = {
        "role": role,
        "source": source,
        "id": meta.get("id") or Path(summary["path"]).stem,
        "path": summary["path"],
        "start": summary.get("start"),
        "end": summary.get("end"),
        "duration_seconds": summary.get("duration_seconds"),
        "cwd": meta.get("cwd"),
        "token_snapshots": len(summary.get("token_snapshots") or []),
        "linked_session_ids": summary.get("linked_session_ids") or [],
        "linked_session_evidence": summary.get("linked_session_evidence") or [],
        "detected_linked_session_count": int(summary.get("detected_linked_session_count") or 0),
        "time_filter": summary.get("time_filter"),
    }
    for field in TOKEN_FIELDS:
        record[field] = int(token.get(field) or 0)
    record["uncached_input_tokens"] = max(0, record["input_tokens"] - record["cached_input_tokens"])
    return record


def build_token_report(
    codex_home: Path,
    sessions: list[str],
    include_linked: bool,
    since: dt.datetime | None = None,
    until: dt.datetime | None = None,
) -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    seen_paths: set[str] = set()
    missing_linked: dict[str, list[str]] = {}
    index = transcript_index(codex_home) if include_linked else {}

    def add(
        path: Path,
        role: str,
        source: str | None = None,
        record_since: dt.datetime | None = None,
        record_until: dt.datetime | None = None,
    ) -> dict[str, Any]:
        key = str(path.resolve())
        if key in seen_paths:
            return {}
        seen_paths.add(key)
        record = token_usage_record(path, role, source, since=record_since, until=record_until)
        records.append(record)
        return record

    parents: list[dict[str, Any]] = []
    for session in sessions:
        path = find_archive(codex_home, session)
        record = add(path, "parent", record_since=since, record_until=until)
        if record:
            parents.append(record)

    if include_linked:
        for parent in parents:
            missing: list[str] = []
            for linked_id in parent.get("linked_session_ids") or []:
                path = resolve_session_quiet(codex_home, linked_id, index)
                if path is None:
                    missing.append(linked_id)
                    continue
                add(path, "linked", str(parent.get("id")))
            if missing:
                missing_linked[str(parent.get("id"))] = missing

    totals: dict[str, int] = {field: 0 for field in TOKEN_FIELDS}
    totals["uncached_input_tokens"] = 0
    for record in records:
        for field in totals:
            totals[field] += int(record.get(field) or 0)

    linked_evidence: dict[str, dict[str, Any]] = {}
    for parent in parents:
        parent_id = str(parent.get("id"))
        for item in parent.get("linked_session_evidence") or []:
            session_id = str(item.get("id") or "")
            if not session_id:
                continue
            merged = linked_evidence.setdefault(session_id, {
                "id": session_id,
                "sources": set(),
                "parent_session_ids": set(),
            })
            merged["sources"].update(item.get("sources") or [])
            merged["parent_session_ids"].add(parent_id)
    linked_session_evidence = []
    for session_id, item in linked_evidence.items():
        sources = sorted(item["sources"])
        linked_session_evidence.append({
            "id": session_id,
            "sources": sources,
            "confidence": "strong" if "function_call_output.agent_id" in sources else "weak",
            "parent_session_ids": sorted(item["parent_session_ids"]),
        })
    linked_session_evidence.sort(key=lambda item: str(item["id"]))
    return {
        "sessions": records,
        "totals": totals,
        "missing_linked_session_ids": missing_linked,
        "linked_session_evidence": linked_session_evidence,
        "detected_linked_session_count": len(linked_session_evidence),
        "include_linked": include_linked,
        "parent_time_filter": {
            "since": fmt_time(since),
            "until": fmt_time(until),
        } if since or until else None,
    }


def print_token_report(report: dict[str, Any]) -> None:
    sessions = report.get("sessions") or []
    totals = report.get("totals") or {}
    linked_evidence = report.get("linked_session_evidence") or []
    strong_count = sum(1 for item in linked_evidence if item.get("confidence") == "strong")
    weak_count = sum(1 for item in linked_evidence if item.get("confidence") == "weak")
    print("# Token Usage Report")
    print()
    print(f"- Sessions counted: {len(sessions)}")
    print(f"- Detected linked sessions: {report.get('detected_linked_session_count', 0)} (strong: {strong_count}, weak: {weak_count})")
    print(f"- Detected linked sessions included: {report.get('include_linked')}")
    if linked_evidence:
        print("- Detected links are candidates; verify delegation and handoff events before calling them subagents or claiming a mission-wide total.")
    if report.get("parent_time_filter"):
        window = report["parent_time_filter"]
        print(f"- Parent time filter: {window.get('since')} to {window.get('until')}")
    print(
        "- Total tokens: "
        f"{totals.get('total_tokens', 0):,} "
        f"(input {totals.get('input_tokens', 0):,}, "
        f"cached input {totals.get('cached_input_tokens', 0):,}, "
        f"uncached input {totals.get('uncached_input_tokens', 0):,}, "
        f"output {totals.get('output_tokens', 0):,}, "
        f"reasoning {totals.get('reasoning_output_tokens', 0):,})"
    )
    print()
    print("| Role | Session | Total | Input | Cached | Uncached | Output | Reasoning | Snapshots | Time Window |")
    print("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
    for record in sorted(sessions, key=lambda item: int(item.get("total_tokens") or 0), reverse=True):
        session = str(record.get("id") or "")
        if record.get("source"):
            session = f"{session} <- {record['source']}"
        window = f"{record.get('start', 'unknown')} to {record.get('end', 'unknown')}"
        print(
            f"| {record.get('role')} | `{session}` | "
            f"{int(record.get('total_tokens') or 0):,} | "
            f"{int(record.get('input_tokens') or 0):,} | "
            f"{int(record.get('cached_input_tokens') or 0):,} | "
            f"{int(record.get('uncached_input_tokens') or 0):,} | "
            f"{int(record.get('output_tokens') or 0):,} | "
            f"{int(record.get('reasoning_output_tokens') or 0):,} | "
            f"{int(record.get('token_snapshots') or 0):,} | {window} |"
        )
    missing = report.get("missing_linked_session_ids") or {}
    if missing:
        print()
        print("## Missing Detected Linked Sessions")
        for parent, ids in missing.items():
            print(f"- `{parent}`: {', '.join(f'`{item}`' for item in ids)}")


def print_table(rows: list[dict[str, Any]]) -> None:
    for row in rows:
        print(f"{row.get('updated_at') or row.get('transcript_timestamp') or row.get('transcript_ts') or row.get('history_ts') or 'unknown'}  {row.get('id')}")
        if row.get("thread_name"):
            print(f"  name: {row['thread_name']}")
        if row.get("first_prompt"):
            print(f"  first: {row['first_prompt']}")
        if row.get("last_prompt") and row.get("last_prompt") != row.get("first_prompt"):
            print(f"  last: {row['last_prompt']}")
        if row.get("history_match"):
            print(f"  history match: {row['history_match']}")
        if row.get("transcript_match"):
            print(f"  transcript match: {row['transcript_match']}")
        if row.get("transcript"):
            print(f"  transcript: {row['transcript']}")
        if row.get("cwd"):
            print(f"  cwd: {row['cwd']}")


def print_projects(projects: list[dict[str, Any]]) -> None:
    if not projects:
        print("No projects with transcript working directories found.")
        return
    print("# Codex Projects")
    print()
    print("| Project | Sessions | Latest activity |")
    print("| --- | ---: | --- |")
    for project in projects:
        print(f"| `{project['cwd']}` | {project['session_count']} | {project.get('updated_at') or 'unknown'} |")


def search_sqlite_logs(
    codex_home: Path,
    contains: str | None,
    level: str | None,
    target: str | None,
    recent: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for db in sorted(codex_home.glob("logs_*.sqlite")):
        con: sqlite3.Connection | None = None
        try:
            con = sqlite3.connect(str(db))
            con.row_factory = sqlite3.Row
            clauses: list[str] = []
            params: list[Any] = []
            if contains:
                clauses.append("(feedback_log_body like ? or target like ? or module_path like ? or file like ?)")
                like = f"%{contains}%"
                params.extend([like, like, like, like])
            if level:
                clauses.append("level = ?")
                params.append(level)
            if target:
                clauses.append("target like ?")
                params.append(f"%{target}%")
            where = " where " + " and ".join(clauses) if clauses else ""
            query = (
                "select ts, ts_nanos, level, target, feedback_log_body, module_path, file, line, thread_id "
                f"from logs{where} order by ts desc, ts_nanos desc limit ?"
            )
            params.append(recent)
            for row in con.execute(query, params):
                item = dict(row)
                item["db"] = str(db)
                rows.append(item)
        except sqlite3.Error as exc:
            rows.append({"db": str(db), "error": str(exc)})
        finally:
            if con is not None:
                con.close()
    rows.sort(key=lambda item: (item.get("ts") or 0, item.get("ts_nanos") or 0), reverse=True)
    return rows[:recent]


def print_sqlite_logs(rows: list[dict[str, Any]]) -> None:
    for row in rows:
        if row.get("error"):
            print(f"{row['db']}: ERROR {row['error']}")
            continue
        stamp = fmt_time(parse_time(row.get("ts"))) if row.get("ts") else "unknown"
        loc = f" {row.get('file')}:{row.get('line')}" if row.get("file") else ""
        print(f"{stamp} {row.get('level')} {row.get('target')}{loc}")
        body = compact(row.get("feedback_log_body"), 300)
        if body:
            print(f"  {body}")
        if row.get("thread_id"):
            print(f"  thread: {row['thread_id']}")


def print_markdown(summary: dict[str, Any]) -> None:
    meta = summary["meta"]
    print(f"# Codex Run Summary: {meta.get('id') or Path(summary['path']).name}")
    print()
    print(f"- Path: `{summary['path']}`")
    print(f"- CWD: `{meta.get('cwd', 'unknown')}`")
    print(f"- Model: `{meta.get('model_provider', 'unknown')}`")
    print(f"- Window: {summary['start']} to {summary['end']} ({fmt_duration(summary['duration_seconds'])})")
    if summary.get("time_filter"):
        window = summary["time_filter"]
        print(f"- Time filter: {window.get('since')} to {window.get('until')}")
    git = meta.get("git") if isinstance(meta.get("git"), dict) else {}
    if git:
        print(f"- Git: `{git.get('branch', 'unknown')}` `{git.get('commit_hash', 'unknown')}`")
    if summary.get("turns"):
        print(f"- Turns: {len(summary['turns'])}")
    if summary.get("token_final"):
        token = summary["token_final"]
        print(f"- Final tokens: total={token.get('total_tokens')} input={token.get('input_tokens')} output={token.get('output_tokens')} reasoning={token.get('reasoning_output_tokens')}")
    linked_evidence = summary.get("linked_session_evidence") or []
    if linked_evidence:
        strong_count = sum(1 for item in linked_evidence if item.get("confidence") == "strong")
        weak_count = sum(1 for item in linked_evidence if item.get("confidence") == "weak")
        print(f"- Detected linked sessions: {summary.get('detected_linked_session_count', 0)} (strong: {strong_count}, weak: {weak_count}; candidates requiring verification)")
    print()

    print("## User Requests")
    for item in summary["user_messages"][:12]:
        print(f"- {item.get('timestamp', 'unknown')}: {compact(item.get('message'), 240)}")
    if len(summary["user_messages"]) > 12:
        print(f"- ... {len(summary['user_messages']) - 12} more")
    print()

    print("## Tool Use")
    for name, count in sorted(summary["tool_counts"].items(), key=lambda item: (-item[1], item[0])):
        print(f"- {name}: {count}")
    if summary["shell_command_heads"]:
        print()
        print("Top shell command heads:")
        for head, count in summary["shell_command_heads"].items():
            print(f"- `{head}`: {count}")
    print()

    print("## Failures")
    failures = summary["failed_calls"]
    if not failures:
        print("- No nonzero command exits detected in parsed tool outputs.")
    for failure in failures[:20]:
        cmd = failure.get("cmd") or failure.get("name")
        print(f"- {failure.get('timestamp', 'unknown')} exit={failure.get('exit_code')} `{compact(cmd, 160)}`")
        if failure.get("output"):
            print(f"  output: {compact(failure['output'], 260)}")
    if len(failures) > 20:
        print(f"- ... {len(failures) - 20} more")
    print()

    print("## Failure Response Review")
    failure_events = summary.get("failure_events") or []
    if not failure_events:
        print("- No failure signals detected in parsed events.")
    for failure in failure_events[:20]:
        label = failure.get("cmd") or failure.get("name") or failure.get("source")
        kinds = ", ".join(failure.get("failure_kinds") or [])
        print(f"- {failure.get('timestamp', 'unknown')} `{compact(label, 160)}` [{kinds}]")
        context = failure.get("response_context") or {}
        next_message = context.get("next_agent_message")
        if next_message and next_message.get("message"):
            print(f"  next agent message: {next_message['message']}")
        next_action = context.get("next_action")
        if next_action:
            action_label = next_action.get("cmd") or next_action.get("tool") or next_action.get("kind")
            print(f"  next action: {next_action.get('kind')} `{compact(action_label, 160)}`")
        print(f"  follow-up: {context.get('follow_up', 'unknown')}")
        if context.get("follow_up_outcome"):
            print(f"  follow-up outcome: {context['follow_up_outcome']}")
    if len(failure_events) > 20:
        print(f"- ... {len(failure_events) - 20} more")
    print()

    print("## Patches")
    patches = summary["patches"]
    if not patches:
        print("- No patch_apply_end events detected.")
    for patch in patches[:20]:
        changed = ", ".join(f"`{path}`" for path in patch.get("changes", [])[:6])
        more = "" if len(patch.get("changes", [])) <= 6 else " ..."
        print(f"- {patch.get('timestamp', 'unknown')} success={patch.get('success')} {changed}{more}")
    print()

    print("## Long Gaps")
    gaps = summary["long_gaps"]
    if not gaps:
        print("- No gaps over 60 seconds detected between logged events.")
    for gap in gaps[:10]:
        print(f"- {fmt_duration(gap['seconds'])}: {gap['from']} -> {gap['to']} before {gap.get('event')} line {gap.get('line')}")


def render_failure_review(summary: dict[str, Any]) -> str:
    lines = ["# Failure Review", "", f"- Source: `{summary['path']}`", ""]
    failures = summary.get("failure_events") or []
    if not failures:
        lines.append("No failure signals detected in parsed events.")
        return "\n".join(lines)
    for number, failure in enumerate(failures, 1):
        label = failure.get("cmd") or failure.get("name") or failure.get("source")
        lines.extend([
            f"## Failure {number}: `{compact(label, 160)}`",
            "",
            f"- Evidence: {failure.get('timestamp', 'unknown')}, line {failure.get('line', 'unknown')}; signals: {', '.join(failure.get('failure_kinds') or [])}.",
        ])
        if failure.get("output"):
            lines.append(f"- Output: {compact(failure['output'], 500)}")
        if failure.get("stderr"):
            lines.append(f"- Stderr: {compact(failure['stderr'], 500)}")
        context = failure.get("response_context") or {}
        previous = context.get("previous_agent_message") or {}
        if previous.get("message"):
            lines.append(f"- Prior agent message: {previous['message']}")
        next_message = context.get("next_agent_message") or {}
        if next_message.get("message"):
            lines.append(f"- Next agent message: {next_message['message']}")
        next_action = context.get("next_action") or {}
        if next_action:
            action = next_action.get("cmd") or next_action.get("tool") or next_action.get("kind")
            lines.append(f"- Next action: {next_action.get('kind')} `{compact(action, 200)}`.")
        lines.append(f"- Follow-up: {context.get('follow_up', 'unknown')}.")
        if context.get("follow_up_outcome"):
            lines.append(f"- Follow-up outcome: {context['follow_up_outcome']}.")
        lines.append("")
    return "\n".join(lines)


def render_timeline(summary: dict[str, Any]) -> str:
    lines = [
        "# Timeline",
        "",
        f"- Source: `{summary['path']}`",
        f"- Event window: {summary['start']} to {summary['end']} ({fmt_duration(summary['duration_seconds'])}).",
        "",
        "## Turns",
    ]
    turns = summary.get("turns") or []
    if not turns:
        lines.append("- No completed turns detected.")
    for turn in turns:
        lines.append(f"- `{turn.get('turn_id')}`: {turn.get('started')} to {turn.get('completed')} ({turn.get('duration_ms', 'unknown')} ms).")
    lines.extend(["", "## Long Event Gaps"])
    gaps = summary.get("long_gaps") or []
    if not gaps:
        lines.append("- No gaps over 60 seconds detected.")
    for gap in gaps:
        lines.append(f"- {fmt_duration(gap['seconds'])}: {gap['from']} to {gap['to']} before {gap.get('event')} at line {gap.get('line')}.")
    return "\n".join(lines)


def render_delegation(summary: dict[str, Any], report: dict[str, Any]) -> str:
    lines = ["# Delegation Evidence", "", f"- Parent transcript: `{summary['path']}`", ""]
    evidence = report.get("linked_session_evidence") or []
    if not evidence:
        lines.append("No detected linked sessions.")
    else:
        lines.append("Detected links are candidates. Verify delegation and handoff events before calling them subagents or claiming a mission-wide total.")
        lines.append("")
        lines.append("| Candidate session | Confidence | Evidence sources |")
        lines.append("| --- | --- | --- |")
        for item in evidence:
            lines.append(f"| `{item['id']}` | {item['confidence']} | {', '.join(item.get('sources') or [])} |")
    missing = report.get("missing_linked_session_ids") or {}
    if missing:
        lines.extend(["", "## Missing Candidate Transcripts"])
        for parent, ids in missing.items():
            lines.append(f"- `{parent}`: {', '.join(f'`{item}`' for item in ids)}")
    return "\n".join(lines)


def render_run_overview(summary: dict[str, Any], report: dict[str, Any]) -> str:
    requests = summary.get("user_messages") or []
    latest_request = compact(requests[-1].get("message"), 500) if requests else "No user request recorded."
    totals = report.get("totals") or {}
    metrics = summary.get("operational_metrics") or {}
    parent_record = next((record for record in report.get("sessions") or [] if record.get("role") == "parent"), {})
    linked_tokens = max(0, int(totals.get("total_tokens") or 0) - int(parent_record.get("total_tokens") or 0))
    linked_records = [record for record in report.get("sessions") or [] if record.get("role") == "linked"]
    lines = [
        "# Run Overview",
        "",
        f"- Parent transcript: `{summary['path']}`",
        f"- Analysis window: {summary['start']} to {summary['end']} ({fmt_duration(summary['duration_seconds'])}).",
        f"- Latest request: {latest_request}",
        "",
        "## Run at a Glance",
        "",
        f"- Tool calls: {metrics.get('tool_call_count', 0)}; clean completed calls: {metrics.get('clean_tool_completion_count', 0)}/{metrics.get('completed_tool_call_count', 0)} ({fmt_rate(metrics.get('clean_tool_completion_rate'))}, heuristic).",
        f"- Failure signals: {metrics.get('failure_signal_count', 0)}; recoveries observed: {metrics.get('observed_recovery_count', 0)}/{metrics.get('recovery_candidate_count', 0)} ({fmt_rate(metrics.get('observed_recovery_rate'))}, heuristic).",
        f"- Patches: {metrics.get('patch_event_count', 0)}; failed patches: {metrics.get('failed_patch_count', 0)}.",
        f"- Detected spawned subagents: {summary.get('detected_spawned_subagent_count', 0)}; available linked-session briefs: {len(linked_records)}.",
        f"- Tokens: parent {int(parent_record.get('total_tokens') or 0):,}; linked sessions {linked_tokens:,}; counted total {int(totals.get('total_tokens') or 0):,}.",
        "- Mission/workstream outcome: requires main-agent synthesis from root and handoff evidence.",
        "",
        "## Review Priorities",
        "",
        "1. Separate failure signals from expected or harmless nonzero exits in `failures.md`.",
        "2. Verify detected linked-session relationships in `delegation.md` before treating them as subagents.",
        "3. Read `parent-session.md` and the relevant session briefs before making causal or improvement claims.",
    ]
    return "\n".join(lines)


def write_analysis_pack(
    codex_home: Path,
    path: Path,
    summary: dict[str, Any],
    since: dt.datetime | None,
    until: dt.datetime | None,
    output_dir: str | None,
) -> Path:
    meta = summary.get("meta") if isinstance(summary.get("meta"), dict) else {}
    session_id = str(meta.get("id") or path.stem)
    pack_dir = create_analysis_dir(codex_home, session_id, output_dir)
    sessions_dir = pack_dir / "sessions"
    sessions_dir.mkdir(mode=0o700)
    report = build_token_report(codex_home, [str(path)], include_linked=True, since=since, until=until)

    write_text(pack_dir / "run-overview.md", render_run_overview(summary, report))
    write_text(pack_dir / "parent-session.md", capture_markdown(print_markdown, summary))
    write_text(pack_dir / "failures.md", render_failure_review(summary))
    write_text(pack_dir / "timeline.md", render_timeline(summary))
    write_text(pack_dir / "delegation.md", render_delegation(summary, report))
    write_text(pack_dir / "metrics.md", capture_markdown(print_token_report, report))

    linked_records = [record for record in report.get("sessions") or [] if record.get("role") == "linked"]
    for record in linked_records:
        child_summary = summarize_archive(Path(record["path"]))
        write_text(sessions_dir / f"{record['id']}.md", capture_markdown(print_markdown, child_summary))

    requests = summary.get("user_messages") or []
    latest_request = compact(requests[-1].get("message"), 500) if requests else "No user request recorded."
    lines = [
        "# Codex Reflect Analysis Pack",
        "",
        f"- Parent session: `{session_id}`",
        f"- Source transcript: `{path}`",
        f"- Generated: {fmt_time(dt.datetime.now(dt.timezone.utc))}",
        f"- Analysis window: {summary['start']} to {summary['end']}",
        f"- Latest request: {latest_request}",
        f"- Failure signals: {len(summary.get('failure_events') or [])}",
        f"- Detected linked sessions: {report.get('detected_linked_session_count', 0)}",
        "",
        "## Read in this order",
        "",
        "1. [Run overview](run-overview.md)",
        "2. [Parent-session evidence](parent-session.md)",
        "3. [Failure review](failures.md)",
        "4. [Timeline](timeline.md)",
        "5. [Delegation evidence](delegation.md)",
        "6. [Metrics](metrics.md)",
    ]
    if linked_records:
        lines.extend(["", "## Detected Linked Session Briefs", ""])
        for record in linked_records:
            lines.append(f"- [Session `{record['id']}`](sessions/{record['id']}.md)")
    lines.extend([
        "",
        "Raw rollout JSONL remains authoritative. These files are bounded summaries and evidence guides, not final conclusions.",
    ])
    write_text(pack_dir / "index.md", "\n".join(lines))
    return pack_dir


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex-home", default=None, help="Codex home directory, default ${CODEX_HOME:-~/.codex}")
    parser.add_argument("--list", action="store_true", help="List recent known sessions")
    parser.add_argument("--find", metavar="QUERY", help="Search session index, history, and transcript messages")
    parser.add_argument("--projects", action="store_true", help="List projects with known session working directories")
    parser.add_argument("--project", metavar="PATH", help="Filter --list and --find to an exact normalized session working directory")
    parser.add_argument("--session", metavar="ID_OR_PATH", help="Build a Markdown analysis pack for a rollout transcript by id substring or path")
    parser.add_argument("--output-dir", metavar="PATH", help="Write a session analysis pack to this new directory instead of ${CODEX_HOME:-~/.codex}/tmp/codex-reflect")
    parser.add_argument("--token-report", nargs="+", metavar="ID_OR_PATH", help="Report token usage for one or more rollout transcripts")
    parser.add_argument("--no-linked", action="store_true", help="Do not include linked subagent sessions in --token-report")
    parser.add_argument("--since", metavar="ISO_TIME", help="Only include parent transcript events at or after this timestamp")
    parser.add_argument("--until", metavar="ISO_TIME", help="Only include parent transcript events at or before this timestamp")
    parser.add_argument("--sqlite-logs", action="store_true", help="Search ~/.codex/logs_*.sqlite diagnostics")
    parser.add_argument("--contains", metavar="TEXT", help="Filter SQLite diagnostics by substring")
    parser.add_argument("--level", metavar="LEVEL", help="Filter SQLite diagnostics by level")
    parser.add_argument("--target", metavar="TEXT", help="Filter SQLite diagnostics by target substring")
    parser.add_argument("--recent", type=int, default=20, help="Number of list/find results")
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    args = parser.parse_args()

    codex_home = codex_home_arg(args.codex_home)
    since = parse_boundary(args.since)
    until = parse_boundary(args.until)
    if since and until and since > until:
        raise SystemExit("--since must be before --until")
    if args.output_dir and not args.session:
        raise SystemExit("--output-dir requires --session")
    if args.output_dir and args.json:
        raise SystemExit("--output-dir cannot be combined with --json")
    if args.project and not (args.list or args.find):
        raise SystemExit("--project requires --list or --find")
    if args.projects and (args.project or args.list or args.find):
        raise SystemExit("--projects cannot be combined with --project, --list, or --find")
    if args.token_report:
        report = build_token_report(codex_home, args.token_report, not args.no_linked, since=since, until=until)
        if args.json:
            print(json.dumps(report, indent=2, sort_keys=True))
        else:
            print_token_report(report)
        return 0
    if args.list:
        rows = list_sessions(codex_home, args.recent, args.project)
        if args.json:
            print(json.dumps(rows, indent=2, sort_keys=True))
        else:
            print_table(rows)
        return 0
    if args.find:
        rows = find_sessions(codex_home, args.find, args.recent, args.project)
        if args.json:
            print(json.dumps(rows, indent=2, sort_keys=True))
        else:
            print_table(rows)
        return 0
    if args.projects:
        projects = list_projects(codex_home)
        if args.json:
            print(json.dumps(projects, indent=2, sort_keys=True))
        else:
            print_projects(projects)
        return 0
    if args.session:
        path = find_archive(codex_home, args.session)
        summary = summarize_archive(path, since=since, until=until)
        if args.json:
            print(json.dumps(summary, indent=2, sort_keys=True))
        else:
            pack_dir = write_analysis_pack(codex_home, path, summary, since, until, args.output_dir)
            print(f"Analysis pack: {pack_dir / 'index.md'}")
        return 0
    if args.sqlite_logs:
        rows = search_sqlite_logs(codex_home, args.contains, args.level, args.target, args.recent)
        if args.json:
            print(json.dumps(rows, indent=2, sort_keys=True))
        else:
            print_sqlite_logs(rows)
        return 0
    parser.print_help(sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
