#!/usr/bin/env python3
"""Summarize Codex session logs from ~/.codex."""

from __future__ import annotations

import collections
import contextlib
import datetime as dt
import html
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

EVIDENCE_SCHEMA_VERSION = 5


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


def is_activity_user_message(value: Any) -> bool:
    """Return whether a user-role transcript item is an actual human message."""
    text = str(value or "").strip()
    if not text:
        return False
    if text.startswith("# AGENTS.md instructions"):
        return False
    return re.match(
        r"^<(?:codex_delegation|subagent_notification|environment_context|turn_aborted)(?:\s|>)",
        text,
        flags=re.IGNORECASE,
    ) is None


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


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    path.chmod(0o600)


def immutable_tree(path: Path) -> None:
    """Mark helper-owned extracted artifacts read-only."""
    if not path.exists():
        return
    for item in sorted(path.rglob("*"), reverse=True):
        if item.is_file():
            item.chmod(0o400)
        elif item.is_dir():
            item.chmod(0o500)
    path.chmod(0o500)


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


def rollout_sort_key(path: Path) -> tuple[dt.datetime, str]:
    meta = archive_meta(path)
    timestamp = parse_time(meta.get("timestamp")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc)
    return (timestamp, str(path))


def logical_session_index(codex_home: Path) -> dict[str, list[Path]]:
    index: dict[str, list[Path]] = collections.defaultdict(list)
    for path in transcript_files(codex_home):
        meta = archive_meta(path)
        session_id = meta.get("id")
        if session_id:
            index[str(session_id)].append(path)
    return {session_id: sorted(paths, key=rollout_sort_key) for session_id, paths in index.items()}


def find_session_paths(codex_home: Path, session: str) -> list[Path]:
    candidate = Path(session).expanduser()
    index = logical_session_index(codex_home)
    if candidate.exists():
        session_id = str(archive_meta(candidate).get("id") or "")
        if session_id and session_id in index:
            return index[session_id]
        return [candidate]

    matches: list[Path] = []
    for path in transcript_files(codex_home):
        meta = archive_meta(path)
        if session in path.name or session == meta.get("id"):
            matches.append(path)
    if not matches:
        raise SystemExit(f"No Codex rollout transcript matched {session!r}")
    session_ids = {str(archive_meta(path).get("id") or path.name) for path in matches}
    if len(session_ids) != 1:
        choices = "\n".join(str(path) for path in matches[:20])
        raise SystemExit(f"Multiple logical sessions matched {session!r}:\n{choices}")
    return index[next(iter(session_ids))]


def find_archive(codex_home: Path, session: str) -> Path:
    """Return the first rollout for legacy single-file callers."""
    return find_session_paths(codex_home, session)[0]


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


def source_ref(row: dict[str, Any]) -> dict[str, Any]:
    return {"path": row.get("_rollout_path"), "line": row.get("_line")}


def final_token_usage(snapshot: Any) -> dict[str, Any] | None:
    if not isinstance(snapshot, dict):
        return None
    input_tokens = int(snapshot.get("input_tokens") or 0)
    cached_input = int(snapshot.get("cached_input_tokens") or 0)
    return {
        "snapshotAt": snapshot.get("timestamp"),
        "contextWindow": snapshot.get("model_context_window"),
        "total": int(snapshot.get("total_tokens") or 0),
        "input": input_tokens,
        "cachedInput": cached_input,
        "uncachedInput": max(0, input_tokens - cached_input),
        "output": int(snapshot.get("output_tokens") or 0),
        "reasoning": int(snapshot.get("reasoning_output_tokens") or 0),
    }


def model_usage_summary(
    configurations: list[dict[str, Any]],
    snapshots: list[dict[str, Any]],
    provider: Any,
) -> dict[str, Any]:
    """Attribute cumulative token counter deltas to the model active at each snapshot."""
    token_fields = {
        "total": "total_tokens",
        "input": "input_tokens",
        "cachedInput": "cached_input_tokens",
        "output": "output_tokens",
        "reasoning": "reasoning_output_tokens",
    }
    ordered_configurations = sorted(configurations, key=lambda item: parse_time(item.get("startedAt")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc))
    ordered_snapshots = sorted(snapshots, key=lambda item: parse_time(item.get("timestamp")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc))
    previous = {raw: 0 for raw in token_fields.values()}
    buckets: dict[str, dict[str, Any]] = {}
    configuration_index = -1

    for snapshot in ordered_snapshots:
        snapshot_time = parse_time(snapshot.get("timestamp"))
        while configuration_index + 1 < len(ordered_configurations):
            candidate_time = parse_time(ordered_configurations[configuration_index + 1].get("startedAt"))
            if snapshot_time is not None and candidate_time is not None and candidate_time > snapshot_time:
                break
            configuration_index += 1
        configuration = ordered_configurations[configuration_index] if configuration_index >= 0 else None
        model = str((configuration or {}).get("model") or "unknown")
        bucket = buckets.setdefault(model, {
            "model": model, "total": 0, "input": 0, "cachedInput": 0,
            "uncachedInput": 0, "output": 0, "reasoning": 0, "snapshotCount": 0,
        })
        deltas: dict[str, int] = {}
        for public, raw in token_fields.items():
            current = int(snapshot.get(raw) or 0)
            delta = current - previous[raw] if current >= previous[raw] else current
            previous[raw] = current
            deltas[public] = delta
            bucket[public] += delta
        bucket["uncachedInput"] += max(0, deltas["input"] - deltas["cachedInput"])
        bucket["snapshotCount"] += 1

    return {
        "provider": str(provider) if provider else None,
        "configurations": ordered_configurations,
        "tokensByModel": sorted(buckets.values(), key=lambda item: (-int(item["total"]), item["model"])),
    }


def git_observations(command: str, output: str, interaction_id: str) -> list[dict[str, Any]]:
    """Describe only Git operations explicitly present in a captured command."""
    observations: list[dict[str, Any]] = []
    operation_pattern = re.compile(
        r"\bgit\s+(switch|checkout|branch|worktree|commit|merge|rebase|cherry-pick|push)(?=\s|$)",
        re.IGNORECASE,
    )
    for number, match in enumerate(operation_pattern.finditer(command), 1):
        verb = match.group(1).lower()
        tail = command[match.end():].lstrip()
        first_argument = re.match(r"([^;&|\s]+)", tail)
        first_argument_value = first_argument.group(1) if first_argument else ""
        if verb == "branch" and (
            not first_argument_value
            or first_argument_value in {"--show-current", "--list", "-l", "--all", "-a", "--remote", "-r", "--contains"}
        ):
            continue
        if verb == "worktree" and first_argument_value not in {"add", "remove", "move", "prune", "lock", "unlock"}:
            continue
        if verb == "checkout" and first_argument_value == "--":
            continue
        operation = {
            "switch": "branch_switch",
            "checkout": "branch_switch",
            "branch": "branch_operation",
            "worktree": "worktree_operation",
            "commit": "commit",
            "merge": "merge",
            "rebase": "rebase",
            "cherry-pick": "cherry_pick",
            "push": "push",
        }[verb]
        if verb in {"switch", "checkout"} and re.match(r"(?:-[cCbB]|--create)\b", tail):
            operation = "branch_create"
        commit_match = re.search(r"\b([0-9a-f]{7,40})\b", output, re.IGNORECASE)
        bracket_commit = re.search(r"\[([^\]\s]+)(?:\s+\([^\]]+\))?\s+([0-9a-f]{7,40})\]\s*([^\n]*)", output)
        observation = {
            "id": f"{interaction_id}:{number}",
            "operation": operation,
            "command": command,
            "output": output,
            "toolInteractionId": interaction_id,
        }
        if bracket_commit:
            observation.update({
                "branch": bracket_commit.group(1),
                "commit": bracket_commit.group(2),
                "subject": bracket_commit.group(3).strip() or None,
            })
        elif commit_match and operation in {"commit", "merge", "rebase", "cherry_pick"}:
            observation["commit"] = commit_match.group(1)
        observations.append(observation)
    return observations


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


def extract_source_thread_ids(rows: list[dict[str, Any]]) -> set[str]:
    pattern = re.compile(r"<source_thread_id>\s*(019[0-9a-f-]{33,})\s*</source_thread_id>", re.IGNORECASE)
    sources: set[str] = set()
    for row in rows:
        payload = row.get("payload")
        if not isinstance(payload, dict):
            continue
        text = ""
        if payload.get("type") in {"user_message", "agent_message"}:
            text = str(payload.get("message") or "")
        elif payload.get("type") == "message":
            text = content_text(payload.get("content"))
        sources.update(pattern.findall(text))
    return sources


def extract_created_thread_ids(rows: list[dict[str, Any]]) -> set[str]:
    pattern = re.compile(r'"threadId"\s*:\s*"(019[0-9a-f-]{33,})"', re.IGNORECASE)
    created: set[str] = set()
    for row in rows:
        payload = row.get("payload")
        if not isinstance(payload, dict) or payload.get("type") not in {"function_call_output", "custom_tool_call_output"}:
            continue
        output = payload.get("output")
        if isinstance(output, str):
            created.update(pattern.findall(output))
    return created


def session_relation_events(rows: list[dict[str, Any]], source_session_id: str) -> list[dict[str, Any]]:
    """Pair session-creation calls with outputs without conflating threads and subagents."""
    calls: dict[str, dict[str, Any]] = {}
    records: list[dict[str, Any]] = []
    id_pattern = session_id_pattern()
    names = {"create_thread", "spawn_agent", "fork_thread", "handoff_thread"}
    for row in rows:
        payload = row.get("payload")
        if not isinstance(payload, dict):
            continue
        payload_type = payload.get("type")
        call_id = str(payload.get("call_id") or "")
        if payload_type in {"function_call", "custom_tool_call"} and payload.get("name") in names and call_id:
            arguments = parse_args_json(payload.get("arguments") or payload.get("input"))
            calls[call_id] = {
                "name": str(payload.get("name")),
                "arguments": arguments if isinstance(arguments, dict) else {},
                "timestamp": row.get("timestamp"),
                "source": {"path": row.get("_rollout_path"), "line": row.get("_line")},
            }
            continue
        if payload_type not in {"function_call_output", "custom_tool_call_output"}:
            continue
        output = payload.get("output")
        output_text = output if isinstance(output, str) else json.dumps(output, default=str)
        call = calls.get(call_id, {})
        name = str(call.get("name") or "")
        child_ids: list[str] = []
        try:
            value = json.loads(output_text)
        except (TypeError, ValueError):
            value = {}
        if isinstance(value, dict):
            for key in ("threadId", "thread_id", "agent_id"):
                candidate = value.get(key)
                if isinstance(candidate, str) and id_pattern.fullmatch(candidate):
                    child_ids.append(candidate)
        if not child_ids and name in names:
            child_ids.extend(id_pattern.findall(output_text))
        if not child_ids:
            continue
        arguments = call.get("arguments") if isinstance(call.get("arguments"), dict) else {}
        assignment = str(arguments.get("prompt") or arguments.get("message") or "")
        relation_type = "thread" if name in {"create_thread", "fork_thread", "handoff_thread"} or "threadId" in output_text else "delegation"
        kind = name or ("create_thread" if relation_type == "thread" else "spawn_agent")
        for child_id in child_ids:
            records.append({
                "parent": source_session_id,
                "child": child_id,
                "kind": kind,
                "relationType": relation_type,
                "timestamp": call.get("timestamp") or row.get("timestamp"),
                "assignment": assignment,
                "agentType": arguments.get("agent_type"),
                "source": call.get("source") or {"path": row.get("_rollout_path"), "line": row.get("_line")},
            })
    unique: dict[tuple[str, str, str], dict[str, Any]] = {}
    for record in records:
        key = (str(record["parent"]), str(record["child"]), str(record["kind"]))
        current = unique.get(key)
        if current is None or (not current.get("assignment") and record.get("assignment")):
            unique[key] = record
    return list(unique.values())


def is_validation_command(command: str) -> bool:
    return bool(re.search(
        r"(?:^|[;&|]\s*|\s)(?:cargo\s+(?:test|nextest|check|clippy|fmt)|npm\s+(?:test|run\s+(?:test|check|lint))|"
        r"pnpm\s+(?:test|check|lint)|pytest\b|vitest\b|svelte-check\b|git\s+diff\s+--check\b|"
        r"(?:target/debug/)?atelier\s+(?:check|review)\b)",
        command,
        re.IGNORECASE,
    ))


def load_rollout_rows(paths: list[Path]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for rollout_path in sorted(paths, key=rollout_sort_key):
        for row in load_jsonl(rollout_path):
            row["_rollout_path"] = str(rollout_path)
            rows.append(row)
    rows.sort(key=lambda row: (
        parse_time(row.get("timestamp")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc),
        str(row.get("_rollout_path") or ""),
        int(row.get("_line") or 0),
    ))
    return rows


def session_id_for_paths(paths: list[Path]) -> str:
    if not paths:
        raise ValueError("At least one rollout path is required")
    return str(archive_meta(paths[0]).get("id") or paths[0].stem)


def resolve_workstream(codex_home: Path, session: str) -> tuple[list[Path], dict[str, list[Path]], list[dict[str, Any]]]:
    index = logical_session_index(codex_home)
    root_paths = find_session_paths(codex_home, session)
    root_id = session_id_for_paths(root_paths)
    seen_upstream: set[str] = set()
    while True:
        if root_id in seen_upstream:
            raise SystemExit(f"Lineage cycle detected while resolving root session {root_id}")
        seen_upstream.add(root_id)
        sources = extract_source_thread_ids(load_rollout_rows(root_paths))
        available_sources = sorted(source for source in sources if source in index)
        if not available_sources:
            break
        if len(available_sources) > 1:
            raise SystemExit(f"Multiple upstream source sessions found for {root_id}: {', '.join(available_sources)}")
        source_id = available_sources[0]
        root_id = source_id
        root_paths = index[root_id]

    sessions: dict[str, list[Path]] = {root_id: root_paths}
    edges: list[dict[str, Any]] = []
    queue = [root_id]
    while queue:
        parent_id = queue.pop(0)
        rows = load_rollout_rows(sessions[parent_id])
        records = session_relation_events(rows, parent_id)
        for edge in records:
            child_id = str(edge["child"])
            if child_id not in index or child_id == parent_id:
                continue
            if edge not in edges:
                edges.append(edge)
            if child_id not in sessions:
                sessions[child_id] = index[child_id]
                queue.append(child_id)
    return root_paths, sessions, edges


def summarize_archive(
    path: Path | list[Path],
    since: dt.datetime | None = None,
    until: dt.datetime | None = None,
) -> dict[str, Any]:
    paths = [path] if isinstance(path, Path) else list(path)
    if not paths:
        raise ValueError("At least one rollout path is required")
    paths = sorted(paths, key=rollout_sort_key)
    raw_rows = load_rollout_rows(paths)
    own_ids: set[str] = set()
    meta: dict[str, Any] = {"path": str(paths[0])}
    for row in raw_rows:
        payload = row.get("payload")
        if row.get("type") == "session_meta" and isinstance(payload, dict):
            if len(meta) == 1:
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
    model_configurations: list[dict[str, Any]] = []
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
        if row.get("type") == "turn_context":
            collaboration = payload.get("collaboration_mode") if isinstance(payload.get("collaboration_mode"), dict) else {}
            settings = collaboration.get("settings") if isinstance(collaboration.get("settings"), dict) else {}
            model = str(payload.get("model") or settings.get("model") or "").strip()
            effort = payload.get("effort") or payload.get("reasoning_effort") or settings.get("reasoning_effort")
            configuration = {
                "model": model or "unknown",
                "effort": str(effort) if effort else None,
                "startedAt": row.get("timestamp"),
                "source": source_ref(row),
            }
            previous_configuration = model_configurations[-1] if model_configurations else None
            if not previous_configuration or (previous_configuration.get("model"), previous_configuration.get("effort")) != (configuration["model"], configuration["effort"]):
                model_configurations.append(configuration)
            continue
        if payload_type == "user_message":
            users.append({
                "timestamp": row.get("timestamp"), "message": payload.get("message"),
                "line": row.get("_line"), "source": source_ref(row), "rawType": payload_type,
            })
        elif payload_type == "agent_message":
            agent_messages.append({
                "timestamp": row.get("timestamp"), "message": payload.get("message"),
                "line": row.get("_line"), "source": source_ref(row), "rawType": payload_type,
            })
        elif payload_type == "message":
            role = payload.get("role")
            if role == "user":
                users.append({
                    "timestamp": row.get("timestamp"), "message": content_text(payload.get("content")),
                    "line": row.get("_line"), "source": source_ref(row), "rawType": payload_type,
                })
            elif role == "assistant":
                agent_messages.append({
                    "timestamp": row.get("timestamp"), "message": content_text(payload.get("content")),
                    "line": row.get("_line"), "source": source_ref(row), "rawType": payload_type,
                })
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
                "source": source_ref(row),
                **usage,
            })
        elif payload_type in {"function_call", "custom_tool_call"}:
            call_id = payload.get("call_id")
            if call_id:
                raw_arguments = payload.get("arguments") if payload_type == "function_call" else payload.get("input")
                args = parse_args_json(raw_arguments)
                calls[str(call_id)] = {
                    "id": str(call_id),
                    "name": payload.get("name"),
                    "type": payload_type,
                    "timestamp": row.get("timestamp"),
                    "arguments": args,
                    "raw_arguments": raw_arguments,
                    "raw_input": payload.get("input") if payload_type == "custom_tool_call" else None,
                    "line": row.get("_line"),
                    "invocation_source": source_ref(row),
                    "invocation_recorded": True,
                }
        elif payload_type in {"function_call_output", "custom_tool_call_output"}:
            call_id = payload.get("call_id")
            if call_id:
                call = calls.setdefault(str(call_id), {"id": str(call_id)})
                output = payload.get("output")
                if output is None:
                    output = ""
                output_text = output if isinstance(output, str) else json.dumps(output, default=str)
                call["output"] = output_text
                call["raw_output"] = output
                call["output_timestamp"] = row.get("timestamp")
                call["output_line"] = row.get("_line")
                call["output_source"] = source_ref(row)
                call["exit_code"] = exit_code(output_text)
        elif payload_type == "patch_apply_end":
            call_id = str(payload.get("call_id") or "")
            patch = {
                "timestamp": row.get("timestamp"),
                "success": payload.get("success"),
                "stdout": compact(payload.get("stdout"), 300),
                "stderr": compact(payload.get("stderr"), 300),
                "changes": sorted((payload.get("changes") or {}).keys()),
                "line": row.get("_line"),
                "source": source_ref(row),
                "toolInteractionId": call_id or None,
            }
            patches.append(patch)
            if call_id:
                call = calls.setdefault(call_id, {
                    "id": call_id, "name": "apply_patch", "type": "patch_apply_end",
                    "timestamp": None, "line": row.get("_line"), "invocation_recorded": False,
                })
                output = {
                    "success": payload.get("success"), "stdout": payload.get("stdout"),
                    "stderr": payload.get("stderr"), "changes": payload.get("changes"),
                }
                call["output"] = json.dumps(output, default=str)
                call["raw_output"] = output
                call["output_timestamp"] = row.get("timestamp")
                call["output_line"] = row.get("_line")
                call["output_source"] = source_ref(row)
                call["exit_code"] = 0 if payload.get("success") is True else 1 if payload.get("success") is False else None

    tool_counts = collections.Counter(
        str(call.get("name") or call.get("type"))
        for call in calls.values() if call.get("invocation_recorded")
    )
    shell_counts = collections.Counter()
    failed_calls: list[dict[str, Any]] = []
    failure_events: list[dict[str, Any]] = []
    call_failure_kinds: dict[str, list[str]] = {}
    for call in calls.values():
        if not call.get("invocation_recorded"):
            continue
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
                "toolInteractionId": call.get("id"),
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
                "toolInteractionId": patch.get("toolInteractionId"),
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
        if not call.get("invocation_recorded"):
            continue
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

    validation_events = []
    for call in calls.values():
        if call.get("name") != "exec_command" or not call.get("cmd") or not is_validation_command(str(call.get("cmd"))):
            continue
        if call_failure_kinds.get(str(call.get("id"))) or "output" not in call:
            continue
        validation_events.append({
            "toolInteractionId": call.get("id"),
            "timestamp": call.get("timestamp"),
            "line": call.get("output_line") or call.get("line"),
            "command": call.get("cmd"),
            "output": compact(call.get("output"), 700),
            "success": True,
        })
    validation_events.sort(key=lambda event: int(event.get("line") or 0))

    tool_interactions = []
    observed_git = []
    for call in calls.values():
        if not call.get("name") or not isinstance(call.get("line"), int):
            continue
        invocation = ({
            "arguments": call.get("arguments") or {},
            "rawArguments": call.get("raw_arguments"),
            "rawInput": call.get("raw_input"),
            "source": call.get("invocation_source"),
        } if call.get("invocation_recorded") else None)
        interaction = {
            "id": str(call.get("id")),
            "tool": call.get("name"),
            "kind": call.get("type"),
            "invokedAt": call.get("timestamp"),
            "completedAt": call.get("output_timestamp"),
            "invocationRecorded": bool(call.get("invocation_recorded")),
            "invocation": invocation,
            "output": ({
                "value": call.get("raw_output"),
                "text": call.get("output"),
                "exitCode": call.get("exit_code"),
                "source": call.get("output_source") or {"path": str(paths[0]), "line": call.get("output_line")},
            } if "output" in call else None),
            "command": call.get("cmd"),
            "failureKinds": call_failure_kinds.get(str(call.get("id")), []),
        }
        tool_interactions.append(interaction)
        if call.get("name") == "exec_command" and call.get("cmd"):
            for observation in git_observations(str(call["cmd"]), str(call.get("output") or ""), str(call["id"])):
                observation.update({
                    "timestamp": call.get("timestamp"),
                    "success": not bool(call_failure_kinds.get(str(call.get("id")))) if "output" in call else None,
                    "source": call.get("invocation_source") or {"path": str(paths[0]), "line": call.get("line")},
                })
                observed_git.append(observation)
    tool_interactions.sort(key=lambda item: int(
        (((item.get("invocation") or {}).get("source") or {}).get("line"))
        or (((item.get("output") or {}).get("source") or {}).get("line"))
        or 0
    ))

    tool_calls = [
        call for call in calls.values()
        if call.get("invocation_recorded") and call.get("name") and isinstance(call.get("line"), int)
    ]
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
            "last_agent_message": complete.get("last_agent_message"),
        })

    linked_session_evidence = extract_linked_session_evidence(rows, own_ids)
    spawned_subagent_ids = sorted(extract_spawned_subagent_ids(rows, own_ids))
    model_usage = model_usage_summary(model_configurations, token_snapshots, meta.get("model_provider"))
    return {
        "meta": meta,
        "path": str(paths[0]),
        "rollout_paths": [str(item) for item in paths],
        "rollout_count": len(paths),
        "start": fmt_time(min(timestamps) if timestamps else None),
        "end": fmt_time(max(timestamps) if timestamps else None),
        "duration_seconds": (max(timestamps) - min(timestamps)).total_seconds() if timestamps else None,
        "event_counts": {str(key): value for key, value in event_counts.items()},
        "payload_counts": {str(key): value for key, value in payload_counts.items()},
        "user_messages": users,
        "agent_message_count": len(agent_messages),
        "agent_messages": agent_messages,
        "agent_messages_sample": agent_messages[:3] + (agent_messages[-3:] if len(agent_messages) > 6 else agent_messages[3:]),
        "last_agent_message": next(
            (turn.get("last_agent_message") for turn in reversed(turn_list) if turn.get("last_agent_message")),
            agent_messages[-1].get("message") if agent_messages else None,
        ),
        "turns": turn_list,
        "token_final": token_snapshots[-1] if token_snapshots else None,
        "token_snapshots": token_snapshots,
        "model_usage": model_usage,
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
        "validation_events": validation_events,
        "tool_interactions": tool_interactions,
        "git": {
            "initial": meta.get("git") if isinstance(meta.get("git"), dict) else None,
            "observations": observed_git,
        },
        "long_gaps": sorted(gaps, key=lambda item: item["seconds"], reverse=True)[:20],
    }


def resolve_session_quiet(codex_home: Path, session: str, index: dict[str, list[Path]] | None = None) -> list[Path] | None:
    if index and session in index:
        return index[session]
    try:
        return find_session_paths(codex_home, session)
    except SystemExit:
        return None


def token_usage_record(
    paths: list[Path],
    role: str,
    source: str | None = None,
    since: dt.datetime | None = None,
    until: dt.datetime | None = None,
) -> dict[str, Any]:
    summary = summarize_archive(paths, since=since, until=until)
    meta = summary.get("meta") if isinstance(summary.get("meta"), dict) else {}
    token = summary.get("token_final") if isinstance(summary.get("token_final"), dict) else {}
    record = {
        "role": role,
        "source": source,
        "id": meta.get("id") or Path(summary["path"]).stem,
        "path": summary["path"],
        "rollout_paths": summary.get("rollout_paths") or [],
        "rollout_count": int(summary.get("rollout_count") or 1),
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
    seen_sessions: set[str] = set()
    missing_linked: dict[str, list[str]] = {}
    index = logical_session_index(codex_home) if include_linked else {}

    def add(
        paths: list[Path],
        role: str,
        source: str | None = None,
        record_since: dt.datetime | None = None,
        record_until: dt.datetime | None = None,
    ) -> dict[str, Any]:
        summary = summarize_archive(paths, since=record_since, until=record_until)
        meta = summary.get("meta") if isinstance(summary.get("meta"), dict) else {}
        key = str(meta.get("id") or summary["path"])
        if key in seen_sessions:
            return {}
        seen_sessions.add(key)
        record = token_usage_record(paths, role, source, since=record_since, until=record_until)
        records.append(record)
        return record

    parents: list[dict[str, Any]] = []
    for session in sessions:
        paths = find_session_paths(codex_home, session)
        record = add(paths, "parent", record_since=since, record_until=until)
        if record:
            parents.append(record)

    if include_linked:
        for parent in parents:
            missing: list[str] = []
            for linked_id in parent.get("linked_session_ids") or []:
                paths = resolve_session_quiet(codex_home, linked_id, index)
                if paths is None:
                    missing.append(linked_id)
                    continue
                add(paths, "linked", str(parent.get("id")))
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


def html_text(value: Any) -> str:
    """Escape transcript-derived text before placing it in the static report."""
    return html.escape(str(value if value is not None else ""), quote=True)


def html_id(value: Any) -> str:
    return re.sub(r"[^a-z0-9_-]+", "-", str(value).lower()).strip("-") or "item"


def render_html_report(
    summary: dict[str, Any],
    report: dict[str, Any],
    summaries: dict[str, dict[str, Any]] | None = None,
    edges: list[dict[str, str]] | None = None,
    relative_prefix: str = "",
) -> str:
    """Render a self-contained, dependency-free exploration view of a pack."""
    summaries = summaries or {}
    edges = edges or []
    meta = summary.get("meta") if isinstance(summary.get("meta"), dict) else {}
    session_id = str(meta.get("id") or "unknown")
    metrics = summary.get("operational_metrics") or {}
    totals = report.get("totals") or {}
    parent_record = next((record for record in report.get("sessions") or [] if record.get("role") == "parent"), {})
    linked_records = [record for record in report.get("sessions") or [] if record.get("role") == "linked"]
    latest_request = compact((summary.get("user_messages") or [{}])[-1].get("message"), 420)

    def card(label: str, value: Any, note: str = "") -> str:
        return (
            '<div class="metric"><span class="metric-label">' + html_text(label) + '</span>'
            + '<strong>' + html_text(value) + '</strong>'
            + (f'<small>{html_text(note)}</small>' if note else "") + '</div>'
        )

    metric_cards = "".join([
        card("Logical sessions", len(summaries) if summaries else 1, "detected in this pack"),
        card("Tool calls", metrics.get("tool_call_count", 0)),
        card("Failure signals", metrics.get("failure_signal_count", 0), "parsed signals, not reviewed failures"),
        card("Recoveries", f"{metrics.get('observed_recovery_count', 0)}/{metrics.get('recovery_candidate_count', 0)}", "observed follow-ups"),
        card("Patches", metrics.get("patch_event_count", 0)),
        card("Token total", f"{int(totals.get('total_tokens') or parent_record.get('total_tokens') or 0):,}", "qualified transcript snapshot"),
    ])

    failure_rows = []
    for number, failure in enumerate(summary.get("failure_events") or [], 1):
        label = failure.get("cmd") or failure.get("name") or failure.get("source") or "unknown"
        context = failure.get("response_context") or {}
        next_message = (context.get("next_agent_message") or {}).get("message")
        next_action = context.get("next_action") or {}
        action = next_action.get("cmd") or next_action.get("tool") or next_action.get("kind")
        detail = []
        if failure.get("output"):
            detail.append(f"<p><b>Captured output:</b> {html_text(failure['output'])}</p>")
        if failure.get("stderr"):
            detail.append(f"<p><b>Captured stderr:</b> {html_text(failure['stderr'])}</p>")
        if next_message:
            detail.append(f"<p><b>Immediate agent response:</b> {html_text(next_message)}</p>")
        if action:
            detail.append(f"<p><b>Next action:</b> {html_text(action)}</p>")
        detail.append(
            f"<p><b>Follow-up:</b> {html_text(context.get('follow_up', 'unknown'))}; "
            f"<b>outcome:</b> {html_text(context.get('follow_up_outcome', 'unobserved'))}.</p>"
        )
        search = " ".join([str(label), str(failure.get("failure_kinds")), str(next_message), str(action)]).lower()
        failure_rows.append(
            f'<tr data-search="{html_text(search)}"><td>{number}</td><td>{html_text(failure.get("timestamp", "unknown"))}</td>'
            f'<td><code>{html_text(compact(label, 180))}</code></td>'
            f'<td>{html_text(", ".join(failure.get("failure_kinds") or []))}</td>'
            f'<td>{html_text(context.get("follow_up", "unknown"))}</td>'
            f'<td><details><summary>Evidence</summary>{"".join(detail)}</details></td></tr>'
        )
    failure_table = "".join(failure_rows) or '<tr><td colspan="6">No failure signals detected.</td></tr>'

    timeline = []
    for turn in summary.get("turns") or []:
        timeline.append({"time": turn.get("started"), "kind": "turn", "label": f"Turn {turn.get('turn_id')}", "detail": f"{turn.get('duration_ms', 'unknown')} ms"})
    for gap in summary.get("long_gaps") or []:
        timeline.append({"time": gap.get("from"), "kind": "long gap", "label": f"{fmt_duration(gap.get('seconds'))} without a logged event", "detail": f"before {gap.get('event')} at line {gap.get('line')}"})
    for failure in summary.get("failure_events") or []:
        timeline.append({"time": failure.get("timestamp"), "kind": "failure", "label": failure.get("cmd") or failure.get("name") or failure.get("source"), "detail": ", ".join(failure.get("failure_kinds") or [])})
    for patch in summary.get("patches") or []:
        timeline.append({"time": patch.get("timestamp"), "kind": "patch", "label": ", ".join(patch.get("changes") or []) or "patch event", "detail": f"success={patch.get('success')}"})
    timeline.sort(key=lambda item: str(item.get("time") or ""))
    timeline_rows = "".join(
        f'<tr><td>{html_text(item.get("time", "unknown"))}</td><td><span class="tag {html_id(item.get("kind"))}">{html_text(item.get("kind"))}</span></td>'
        f'<td>{html_text(compact(item.get("label"), 240))}</td><td>{html_text(compact(item.get("detail"), 220))}</td></tr>'
        for item in timeline
    ) or '<tr><td colspan="4">No timeline events were extracted.</td></tr>'

    tool_counts = sorted((summary.get("tool_counts") or {}).items(), key=lambda item: (-item[1], item[0]))
    max_tool_count = max((count for _, count in tool_counts), default=1)
    tool_rows = "".join(
        f'<tr><td><code>{html_text(name)}</code></td><td>{count:,}</td><td><div class="bar"><i style="width:{count / max_tool_count * 100:.1f}%"></i></div></td></tr>'
        for name, count in tool_counts
    ) or '<tr><td colspan="3">No parsed tool calls.</td></tr>'

    session_rows = []
    for item_id, item in summaries.items():
        item_metrics = item.get("operational_metrics") or {}
        token = item.get("token_final") or {}
        session_rows.append(
            f'<tr><td><a href="sessions/{html_text(item_id)}.html"><code>{html_text(item_id)}</code></a></td><td>{item.get("rollout_count", 1)}</td>'
            f'<td>{html_text(item.get("start"))}<br>→ {html_text(item.get("end"))}</td>'
            f'<td>{item_metrics.get("tool_call_count", 0):,}</td><td>{item_metrics.get("failure_signal_count", 0)}</td>'
            f'<td>{int(token.get("total_tokens") or 0):,}</td></tr>'
        )
    if not session_rows:
        session_rows.append(
            f'<tr><td><code>{html_text(session_id)}</code></td><td>{summary.get("rollout_count", 1)}</td>'
            f'<td>{html_text(summary.get("start"))}<br>→ {html_text(summary.get("end"))}</td>'
            f'<td>{metrics.get("tool_call_count", 0):,}</td><td>{metrics.get("failure_signal_count", 0)}</td>'
            f'<td>{int((summary.get("token_final") or {}).get("total_tokens") or 0):,}</td></tr>'
        )
    edge_list = "".join(
        f'<li><code>{html_text(edge.get("parent"))}</code> <span aria-hidden="true">→</span> <code>{html_text(edge.get("child"))}</code> <small>{html_text(edge.get("kind"))}</small></li>'
        for edge in edges
    ) or "<li>No downstream session edges were resolved.</li>"

    linked_rows = "".join(
        f'<li><code>{html_text(item.get("id"))}</code> <span class="tag">{html_text(item.get("confidence"))}</span> '
        f'{html_text(", ".join(item.get("sources") or []))}</li>'
        for item in report.get("linked_session_evidence") or []
    ) or "<li>No linked-session candidates were detected.</li>"
    generated = fmt_time(dt.datetime.now(dt.timezone.utc))
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Codex Reflect · {html_text(session_id)}</title>
<style>
:root {{ color-scheme: light dark; --bg:#10151c; --panel:#18212c; --line:#314052; --text:#e8edf3; --muted:#a9b6c7; --accent:#67d5ad; --warn:#ffbd66; --bad:#ff7f86; }}
* {{ box-sizing:border-box }} body {{ margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,sans-serif }}
header {{ padding:32px max(24px, calc((100% - 1260px)/2)); background:linear-gradient(135deg,#172436,#102019); border-bottom:1px solid var(--line) }}
h1 {{ margin:0 0 6px; font-size:clamp(1.5rem,3vw,2.35rem) }} h2 {{ margin:0 0 14px; font-size:1.25rem }} h3 {{ margin:18px 0 8px }}
.muted, small {{ color:var(--muted) }} code {{ font:0.9em ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap:anywhere }}
nav {{ position:sticky; top:0; z-index:2; background:color-mix(in srgb,var(--bg) 92%,transparent); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); padding:10px max(24px, calc((100% - 1260px)/2)); overflow:auto; white-space:nowrap }}
nav a {{ color:var(--text); text-decoration:none; margin-right:18px }} nav a:hover {{ color:var(--accent) }} main {{ max-width:1260px; margin:auto; padding:24px }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px }} .metric, section {{ background:var(--panel); border:1px solid var(--line); border-radius:10px }} .metric {{ padding:15px }} .metric-label {{ display:block; color:var(--muted); font-size:.8rem; text-transform:uppercase; letter-spacing:.06em }} .metric strong {{ display:block; margin:4px 0; font-size:1.42rem }} section {{ margin:20px 0; padding:20px; scroll-margin-top:52px }}
.notice {{ border-left:4px solid var(--warn); padding:10px 14px; background:#49391e44 }} .controls {{ display:flex; gap:10px; align-items:center; margin:0 0 12px }} input {{ width:min(520px,100%); padding:9px; color:var(--text); background:var(--bg); border:1px solid var(--line); border-radius:6px }}
.table-wrap {{ overflow:auto; max-height:680px; border:1px solid var(--line); border-radius:7px }} table {{ border-collapse:collapse; width:100%; min-width:720px }} th,td {{ padding:9px 11px; text-align:left; vertical-align:top; border-bottom:1px solid var(--line) }} th {{ position:sticky; top:0; background:#202b38; z-index:1 }} tr:hover td {{ background:#ffffff08 }} details {{ min-width:230px }} summary {{ cursor:pointer; color:var(--accent) }} p {{ overflow-wrap:anywhere }}
.tag {{ display:inline-block; padding:2px 7px; border-radius:99px; background:#33475e; font-size:.8rem; white-space:nowrap }} .tag.failure {{ background:#6e3037 }} .tag.long-gap {{ background:#705228 }} .tag.patch {{ background:#285b48 }} .tag.turn {{ background:#33475e }}
.bar {{ width:180px; height:8px; background:#0d1218; border-radius:99px; overflow:hidden }} .bar i {{ display:block; height:100%; background:var(--accent) }} ul {{ padding-left:20px }} li {{ margin:6px 0 }}
@media (max-width:600px) {{ main {{ padding:14px }} section {{ padding:14px }} header {{ padding:24px 14px }} nav {{ padding:10px 14px }} }}
</style></head><body>
<header><h1>Codex Reflect</h1><div class="muted">Interactive transcript evidence · logical session <code>{html_text(session_id)}</code></div>
<p class="muted">Window: {html_text(summary.get('start'))} → {html_text(summary.get('end'))} ({html_text(fmt_duration(summary.get('duration_seconds')))}) · Generated {html_text(generated)}</p></header>
<nav><a href="#overview">Overview</a><a href="#timeline">Timeline</a><a href="#failures">Failures</a><a href="#delegation">Delegation</a><a href="#tools">Tools</a><a href="#evidence">Evidence</a></nav>
<main><section id="overview"><h2>At a glance</h2><div class="grid">{metric_cards}</div><p class="notice">This report exposes transcript-derived signals for exploration. Detected links are candidates, elapsed time is logged-event time, and failure signals are not automatically reviewed failures.</p><h3>Latest recorded request</h3><p>{html_text(latest_request or 'No user request recorded.')}</p></section>
<section id="timeline"><h2>Timeline</h2><p class="muted">Turns, long logged-event gaps, failure signals, and patch events. A gap does not prove idleness or active work.</p><div class="table-wrap"><table><thead><tr><th>Time</th><th>Kind</th><th>Event</th><th>Detail</th></tr></thead><tbody>{timeline_rows}</tbody></table></div></section>
<section id="failures"><h2>Failure explorer</h2><p class="muted">Search commands, signal kinds, immediate responses, or follow-up behavior. Expand evidence before judging diagnosis quality.</p><div class="controls"><label for="failure-filter">Filter</label><input id="failure-filter" type="search" placeholder="e.g. cargo, nonzero_exit, modified_retry"></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Time</th><th>Command/tool</th><th>Signal</th><th>Follow-up</th><th>Context</th></tr></thead><tbody id="failure-rows">{failure_table}</tbody></table></div></section>
<section id="delegation"><h2>Delegation and workstream</h2><p class="muted">Use lineage and handoffs to verify roles before describing a candidate as a subagent.</p><h3>Logical session groups</h3><div class="table-wrap"><table><thead><tr><th>Session</th><th>Rollouts</th><th>Window</th><th>Tools</th><th>Failure signals</th><th>Token snapshot</th></tr></thead><tbody>{''.join(session_rows)}</tbody></table></div><h3>Resolved edges</h3><ul>{edge_list}</ul><h3>Detected link evidence</h3><ul>{linked_rows}</ul></section>
<section id="tools"><h2>Tool activity</h2><div class="table-wrap"><table><thead><tr><th>Tool</th><th>Calls</th><th>Relative volume</th></tr></thead><tbody>{tool_rows}</tbody></table></div></section>
<section id="evidence"><h2>Evidence and companion files</h2><ul><li><a href="{html_text(relative_prefix)}index.md">Pack index</a></li><li><a href="{html_text(relative_prefix)}run-overview.md">Run overview</a></li><li><a href="{html_text(relative_prefix)}failures.md">Failure review</a></li><li><a href="{html_text(relative_prefix)}timeline.md">Timeline details</a></li><li><a href="{html_text(relative_prefix)}delegation.md">Delegation evidence</a></li><li><a href="{html_text(relative_prefix)}metrics.md">Metrics</a></li></ul><p class="muted">Raw rollout JSONL remains authoritative. This HTML report is a navigational, transcript-derived view and does not make causal conclusions.</p></section></main>
<script>
const input=document.getElementById('failure-filter'); const rows=[...document.querySelectorAll('#failure-rows tr')];
input?.addEventListener('input',()=>{{const q=input.value.trim().toLowerCase(); rows.forEach(row=>row.hidden=!!q&&!row.dataset.search.includes(q));}});
</script></body></html>"""


def single_session_report(summary: dict[str, Any]) -> dict[str, Any]:
    """Provide report-shaped metrics for a drill-down without traversing links."""
    token = summary.get("token_final") if isinstance(summary.get("token_final"), dict) else {}
    totals = {field: int(token.get(field) or 0) for field in TOKEN_FIELDS}
    totals["uncached_input_tokens"] = max(0, totals["input_tokens"] - totals["cached_input_tokens"])
    meta = summary.get("meta") if isinstance(summary.get("meta"), dict) else {}
    return {
        "sessions": [{"role": "parent", "id": meta.get("id"), **totals}],
        "totals": totals,
        "linked_session_evidence": summary.get("linked_session_evidence") or [],
    }


def evidence_id(kind: str, session_id: str, suffix: Any) -> str:
    """Stable evidence handles are deliberately independent of UI order."""
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "-", str(suffix)).strip("-") or "item"
    return f"{kind}:{session_id}:{safe}"


def evidence_source_suffix(item: dict[str, Any]) -> str:
    source = item.get("source") if isinstance(item.get("source"), dict) else {}
    path = str(source.get("path") or "rollout")
    return f"{Path(path).name}:{source.get('line', item.get('line', 'unknown'))}"


def deduplicated_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse duplicate transcript representations while retaining their provenance."""
    merged: dict[tuple[str, str], dict[str, Any]] = {}
    for message in messages:
        timestamp = str(message.get("timestamp") or "")
        content = str(message.get("message") or "")
        key = (timestamp or evidence_source_suffix(message), content)
        representation = {
            "rawType": message.get("rawType"),
            "source": message.get("source") or {"line": message.get("line")},
        }
        existing = merged.get(key)
        if existing is None:
            existing = {**message, "representations": [representation]}
            merged[key] = existing
        else:
            existing["representations"].append(representation)
    return list(merged.values())


def normalized_evidence_pack(
    root_id: str,
    summaries: dict[str, dict[str, Any]],
    edges: list[dict[str, Any]],
    report: dict[str, Any],
) -> dict[str, Any]:
    """Create the small, UI-safe evidence API; raw JSONL stays authoritative."""
    evidence: list[dict[str, Any]] = []
    sessions: list[dict[str, Any]] = []
    thread_kinds = {"create_thread", "fork_thread", "handoff_thread", "handoff"}
    thread_edges = [edge for edge in edges if edge.get("relationType") == "thread" or edge.get("kind") in thread_kinds]
    delegation_edges = [edge for edge in edges if edge not in thread_edges]
    for session_id, summary in summaries.items():
        meta = summary.get("meta") if isinstance(summary.get("meta"), dict) else {}
        metrics = summary.get("operational_metrics") or {}
        incoming = [edge for edge in delegation_edges if edge.get("child") == session_id]
        outgoing = [edge for edge in delegation_edges if edge.get("parent") == session_id]
        assignment_edge = next((edge for edge in incoming if edge.get("assignment")), None)
        if assignment_edge is None and session_id == root_id:
            assignment_edge = next((edge for edge in outgoing if edge.get("assignment")), None)
        assignment = str((assignment_edge or {}).get("assignment") or "")
        if not assignment:
            first_user = next((item for item in summary.get("user_messages") or [] if item.get("message")), {})
            assignment = re.sub(r"<codex_delegation>[\s\S]*?</codex_delegation>", "", str(first_user.get("message") or ""), flags=re.IGNORECASE).strip()
        handoff = str(summary.get("last_agent_message") or "")
        child_ends = [
            parse_time((summaries.get(str(edge.get("child"))) or {}).get("end"))
            for edge in outgoing
            if str(edge.get("child")) in summaries
        ]
        child_ends = [value for value in child_ends if value is not None]
        if child_ends:
            children_done = max(child_ends)
            first_post_children = next((
                turn for turn in summary.get("turns") or []
                if parse_time(turn.get("completed")) is not None
                and parse_time(turn.get("completed")) >= children_done
                and turn.get("last_agent_message")
            ), None)
            if first_post_children:
                handoff = str(first_post_children.get("last_agent_message") or handoff)
        token_usage = final_token_usage(summary.get("token_final"))
        short_id = session_id[-8:]
        session = {
            "id": session_id,
            "shortId": short_id,
            "label": f"Session {short_id}",
            "role": None,
            "parentId": str(incoming[0].get("parent")) if incoming else None,
            "parentIds": [str(edge.get("parent")) for edge in incoming],
            "childIds": [str(edge.get("child")) for edge in outgoing],
            "delegatedAt": (assignment_edge or {}).get("timestamp"),
            "assignment": assignment,
            "finalHandoff": handoff,
            "status": "unknown",
            "rolloutCount": summary.get("rollout_count", 1),
            "window": {"start": summary.get("start"), "end": summary.get("end"), "durationSeconds": summary.get("duration_seconds")},
            "metrics": metrics,
            "sourceRollouts": summary.get("rollout_paths") or [summary.get("path")],
            "cwd": meta.get("cwd"),
            "tokens": token_usage,
            "modelUsage": summary.get("model_usage") or {"provider": None, "configurations": [], "tokensByModel": []},
            "git": summary.get("git") or {"initial": None, "observations": []},
        }
        sessions.append(session)
        evidence.append({
            "id": evidence_id("session", session_id, "summary"), "kind": "session_summary", "sessionId": session_id,
            "timestamp": summary.get("start"), "source": {"paths": session["sourceRollouts"]},
            "excerpt": f"Logical session with {session['rolloutCount']} rollout(s), {metrics.get('tool_call_count', 0)} tool calls, and {metrics.get('failure_signal_count', 0)} failure signals.",
            "data": session,
        })
        if token_usage:
            evidence.append({
                "id": evidence_id("tokens", session_id, "final"), "kind": "token_snapshot", "sessionId": session_id,
                "timestamp": token_usage.get("snapshotAt"), "source": {"paths": session["sourceRollouts"]},
                "excerpt": f"Final captured token snapshot: {token_usage.get('total', 0):,} total tokens.",
                "data": token_usage,
            })
        for number, configuration in enumerate(session["modelUsage"].get("configurations") or [], 1):
            evidence.append({
                "id": evidence_id("model", session_id, str(number)), "kind": "model_configuration", "sessionId": session_id,
                "timestamp": configuration.get("startedAt"), "source": configuration.get("source") or {"paths": session["sourceRollouts"]},
                "excerpt": f"Model configured as {configuration.get('model') or 'unknown'}"
                    + (f" with {configuration.get('effort')} reasoning effort." if configuration.get("effort") else "."),
                "data": {**configuration, "provider": session["modelUsage"].get("provider")},
            })
        interaction_evidence_ids: dict[str, str] = {}
        for interaction in summary.get("tool_interactions") or []:
            interaction_id = str(interaction.get("id") or "unknown")
            item_id = evidence_id("tool", session_id, interaction_id)
            interaction_evidence_ids[interaction_id] = item_id
            invocation = interaction.get("invocation") if isinstance(interaction.get("invocation"), dict) else {}
            output = interaction.get("output") if isinstance(interaction.get("output"), dict) else {}
            evidence.append({
                "id": item_id, "kind": "tool_interaction", "sessionId": session_id,
                "timestamp": interaction.get("invokedAt"),
                "source": {"invocation": invocation.get("source"), "output": output.get("source")},
                "excerpt": compact(interaction.get("command") or interaction.get("tool"), 700),
                "data": interaction,
            })
        for failure in summary.get("failure_events") or []:
            line = failure.get("line", "unknown")
            tool_id = str(failure.get("toolInteractionId") or "")
            failure_data = {**failure, "toolInteractionEvidenceId": interaction_evidence_ids.get(tool_id)}
            evidence.append({
                "id": evidence_id("failure", session_id, line), "kind": "failure", "sessionId": session_id,
                "timestamp": failure.get("timestamp"), "source": {"path": summary.get("path"), "line": line},
                "excerpt": compact(failure.get("output") or failure.get("stderr") or failure.get("cmd") or failure.get("name"), 700),
                "data": failure_data,
            })
        for patch in summary.get("patches") or []:
            line = patch.get("line", "unknown")
            tool_id = str(patch.get("toolInteractionId") or "")
            patch_data = {**patch, "toolInteractionEvidenceId": interaction_evidence_ids.get(tool_id)}
            evidence.append({
                "id": evidence_id("patch", session_id, line), "kind": "patch", "sessionId": session_id,
                "timestamp": patch.get("timestamp"), "source": {"path": summary.get("path"), "line": line},
                "excerpt": ", ".join(patch.get("changes") or []) or "Patch event with no changed paths recorded.", "data": patch_data,
            })
        for validation in summary.get("validation_events") or []:
            line = validation.get("line", "unknown")
            tool_id = str(validation.get("toolInteractionId") or "")
            validation_data = {**validation, "toolInteractionEvidenceId": interaction_evidence_ids.get(tool_id)}
            evidence.append({
                "id": evidence_id("validation", session_id, line), "kind": "validation", "sessionId": session_id,
                "timestamp": validation.get("timestamp"), "source": {"path": summary.get("path"), "line": line},
                "excerpt": compact(validation.get("command"), 700), "data": validation_data,
            })
        for message in deduplicated_messages(summary.get("user_messages") or []):
            line = message.get("line", "unknown")
            evidence.append({
                "id": evidence_id("user", session_id, evidence_source_suffix(message)), "kind": "user_message", "sessionId": session_id,
                "timestamp": message.get("timestamp"), "source": message.get("source") or {"path": summary.get("path"), "line": line},
                "excerpt": compact(message.get("message"), 700),
                "data": {**message, "humanVisible": is_activity_user_message(message.get("message"))},
            })
        for message in deduplicated_messages(summary.get("agent_messages") or []):
            line = message.get("line", "unknown")
            evidence.append({
                "id": evidence_id("agent", session_id, evidence_source_suffix(message)), "kind": "agent_message", "sessionId": session_id,
                "timestamp": message.get("timestamp"), "source": message.get("source") or {"path": summary.get("path"), "line": line},
                "excerpt": compact(message.get("message"), 700), "data": message,
            })
        initial_git = (summary.get("git") or {}).get("initial")
        if isinstance(initial_git, dict) and initial_git:
            evidence.append({
                "id": evidence_id("git", session_id, "initial"), "kind": "git_initial_state", "sessionId": session_id,
                "timestamp": summary.get("start"), "source": {"paths": session["sourceRollouts"]},
                "excerpt": compact(f"Initial Git metadata: branch {initial_git.get('branch')}, commit {initial_git.get('commit_hash')}", 700),
                "data": initial_git,
            })
        for observation in (summary.get("git") or {}).get("observations") or []:
            tool_id = str(observation.get("toolInteractionId") or "")
            observation_data = {**observation, "toolInteractionEvidenceId": interaction_evidence_ids.get(tool_id)}
            evidence.append({
                "id": evidence_id("git", session_id, observation.get("id") or "operation"),
                "kind": "git_observation", "sessionId": session_id,
                "timestamp": observation.get("timestamp"), "source": observation.get("source") or {},
                "excerpt": compact(f"{observation.get('operation')}: {observation.get('command')}", 700),
                "data": observation_data,
            })
        for gap in summary.get("long_gaps") or []:
            line = gap.get("line", "unknown")
            evidence.append({
                "id": evidence_id("gap", session_id, line), "kind": "long_gap", "sessionId": session_id,
                "timestamp": gap.get("from"), "source": {"path": summary.get("path"), "line": line},
                "excerpt": f"{fmt_duration(gap.get('seconds'))} before {gap.get('event')}", "data": gap,
            })
        for turn in summary.get("turns") or []:
            turn_id = turn.get("turn_id", "unknown")
            evidence.append({
                "id": evidence_id("turn", session_id, turn_id), "kind": "turn", "sessionId": session_id,
                "timestamp": turn.get("started"), "source": {"paths": session["sourceRollouts"]},
                "excerpt": f"Turn {turn_id}: {turn.get('duration_ms', 'unknown')} ms.", "data": turn,
            })
    for edge in delegation_edges:
        evidence.append({
            "id": evidence_id("edge", edge["parent"], edge["child"]), "kind": "delegation_edge", "sessionId": edge["parent"],
            "timestamp": edge.get("timestamp"), "source": {**(edge.get("source") or {}), "sessionIds": [edge["parent"], edge["child"]]},
            "excerpt": f"{edge['parent']} → {edge['child']} via {edge['kind']}.", "data": edge,
        })
    thread_relations = []
    for edge in thread_edges:
        relation = {
            "from": str(edge["parent"]), "to": str(edge["child"]), "kind": str(edge.get("kind") or "create_thread"),
            "timestamp": edge.get("timestamp"), "source": edge.get("source") or {}, "prompt": edge.get("assignment") or "",
        }
        thread_relations.append(relation)
        evidence.append({
            "id": evidence_id("thread", relation["from"], relation["to"]), "kind": "thread_relation", "sessionId": relation["from"],
            "timestamp": relation.get("timestamp"), "source": {**relation["source"], "sessionIds": [relation["from"], relation["to"]]},
            "excerpt": f"{relation['from']} started related thread {relation['to']} via {relation['kind']}.", "data": relation,
        })
    evidence.sort(key=lambda item: (str(item.get("timestamp") or ""), item["id"]))
    primary_thread_id = next(
        (str(edge["child"]) for edge in thread_edges if edge.get("parent") == root_id and edge.get("kind") == "create_thread"),
        root_id,
    )
    return {
        "schemaVersion": EVIDENCE_SCHEMA_VERSION,
        "discoverySessionId": root_id,
        "primaryThreadId": primary_thread_id,
        "generatedAt": fmt_time(dt.datetime.now(dt.timezone.utc)),
        "report": {"totals": report.get("totals") or {}, "linkedSessionEvidence": report.get("linked_session_evidence") or []},
        "sessions": sessions,
        "threadRelations": thread_relations,
        "edges": delegation_edges,
        "evidence": evidence,
    }


def write_report_workspace(
    pack_dir: Path,
    root_id: str,
    summaries: dict[str, dict[str, Any]],
    edges: list[dict[str, Any]],
    report: dict[str, Any],
) -> None:
    api = normalized_evidence_pack(root_id, summaries, edges, report)
    write_json(pack_dir / "evidence" / "evidence.json", api)
    manifest = {
        "schemaVersion": EVIDENCE_SCHEMA_VERSION,
        "kind": "codex-reflect-report-workspace",
        "discoverySessionId": root_id,
        "primaryThreadId": api["primaryThreadId"],
        "sourceRollouts": sorted({path for summary in summaries.values() for path in (summary.get("rollout_paths") or [summary.get("path")]) if path}),
        "logicalSessions": [{"id": item["id"], "rolloutCount": item["rolloutCount"]} for item in api["sessions"]],
        "evidenceApi": "evidence/evidence.json",
        "markdown": "markdown/index.md",
        "agentWritable": ["src/report"],
        "appCreated": False,
    }
    write_json(pack_dir / "manifest.json", manifest)
    write_text(pack_dir / "AGENTS.md", "# Codex Reflect artifact source\n\nEvidence, Markdown, and the viewer platform are helper-owned. After creating the Artifact Hub app, author run-specific analysis only under `src/report/`; regenerate the artifact when extraction or platform behavior changes.\n")
    immutable_tree(pack_dir / "evidence")
    (pack_dir / "manifest.json").chmod(0o400)


def write_analysis_pack(
    codex_home: Path,
    paths: list[Path],
    summary: dict[str, Any],
    since: dt.datetime | None,
    until: dt.datetime | None,
    output_dir: str | None,
    workspace_summaries: dict[str, dict[str, Any]] | None = None,
    workspace_edges: list[dict[str, str]] | None = None,
    workspace_report: dict[str, Any] | None = None,
) -> Path:
    meta = summary.get("meta") if isinstance(summary.get("meta"), dict) else {}
    session_id = str(meta.get("id") or paths[0].stem)
    pack_dir = create_analysis_dir(codex_home, session_id, output_dir)
    markdown_dir = pack_dir / "markdown"
    sessions_dir = markdown_dir / "sessions"
    sessions_dir.mkdir(parents=True, mode=0o700)
    report = build_token_report(codex_home, [session_id], include_linked=True, since=since, until=until)
    workspace_summaries = workspace_summaries or {session_id: summary}

    write_text(markdown_dir / "run-overview.md", render_run_overview(summary, report))
    write_text(markdown_dir / "parent-session.md", capture_markdown(print_markdown, summary))
    write_text(markdown_dir / "failures.md", render_failure_review(summary))
    write_text(markdown_dir / "timeline.md", render_timeline(summary))
    write_text(markdown_dir / "delegation.md", render_delegation(summary, report))
    write_text(markdown_dir / "metrics.md", capture_markdown(print_token_report, report))

    linked_records = [record for record in report.get("sessions") or [] if record.get("role") == "linked"]
    for record in linked_records:
        child_summary = summarize_archive(find_session_paths(codex_home, str(record["id"])))
        write_text(sessions_dir / f"{record['id']}.md", capture_markdown(print_markdown, child_summary))
    for child_id, child_summary in workspace_summaries.items():
        if child_id != session_id:
            write_text(sessions_dir / f"{child_id}.md", capture_markdown(print_markdown, child_summary))

    requests = summary.get("user_messages") or []
    latest_request = compact(requests[-1].get("message"), 500) if requests else "No user request recorded."
    lines = [
        "# Codex Reflect Analysis Pack",
        "",
        f"- Parent session: `{session_id}`",
        f"- Source rollouts: {len(summary.get('rollout_paths') or [])}",
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
    if workspace_edges:
        lines.extend([
            "", "## Workstream Analysis", "",
            "- [Workstream map](workstreams.md)",
            "- [Workstream metrics](workstream-metrics.md)",
            "- Session briefs in [sessions/](sessions/) are grouped by logical session and merge their rollouts.",
        ])
    lines.extend([
        "",
        "## Artifact Hub viewer",
        "",
        "The Svelte viewer is user-facing. From this workspace, run `python3 /root/.agents/skills/codex-reflect/scripts/create_report_app.py .. --id <artifact-id> --consume`, then open it with `/root/.agents/bin/artifact-hub open <artifact-id>`. Analyze this Markdown/evidence pack directly; regenerate the artifact after extractor or template changes.",
        "",
        "Raw rollout JSONL remains authoritative. These files are bounded summaries and evidence guides, not final conclusions.",
    ])
    if workspace_edges:
        write_text(markdown_dir / "workstreams.md", render_workstream_map(session_id, workspace_summaries, workspace_edges))
        write_text(markdown_dir / "workstream-metrics.md", capture_markdown(print_token_report, workspace_report or report))
    write_text(markdown_dir / "index.md", "\n".join(lines))
    write_report_workspace(pack_dir, session_id, workspace_summaries, workspace_edges or [], workspace_report or report)
    immutable_tree(markdown_dir)
    return pack_dir


def render_workstream_map(
    root_id: str,
    summaries: dict[str, dict[str, Any]],
    edges: list[dict[str, str]],
) -> str:
    lines = [
        "# Workstream Map",
        "",
        f"- Root logical session: `{root_id}`",
        f"- Logical sessions: {len(summaries)}",
        "",
        "## Session Groups",
        "",
        "| Session | Rollouts | Window | Spawned agents | Failure signals |",
        "| --- | ---: | --- | ---: | ---: |",
    ]
    for session_id, summary in summaries.items():
        metrics = summary.get("operational_metrics") or {}
        lines.append(
            f"| `{session_id}` | {summary.get('rollout_count', 1)} | "
            f"{summary.get('start')} to {summary.get('end')} | "
            f"{summary.get('detected_spawned_subagent_count', 0)} | "
            f"{metrics.get('failure_signal_count', 0)} |"
        )
    thread_edges = [edge for edge in edges if edge.get("relationType") == "thread" or edge.get("kind") in {"create_thread", "fork_thread", "handoff_thread", "handoff"}]
    delegation_edges = [edge for edge in edges if edge not in thread_edges]
    lines.extend(["", "## Related Thread Relations", ""])
    lines.extend(
        [f"- `{edge['parent']}` → `{edge['child']}` via `{edge['kind']}` (directional peer relation)" for edge in thread_edges]
        or ["- No related thread links were resolved."]
    )
    lines.extend(["", "## Subagent Delegation", ""])
    lines.extend(
        [f"- `{edge['parent']}` → `{edge['child']}` via `{edge['kind']}`" for edge in delegation_edges]
        or ["- No subagent delegation edges were resolved."]
    )
    return "\n".join(lines)


def write_workstream_pack(
    codex_home: Path,
    root_paths: list[Path],
    sessions: dict[str, list[Path]],
    edges: list[dict[str, Any]],
    since: dt.datetime | None,
    until: dt.datetime | None,
    output_dir: str | None,
) -> Path:
    root_summary = summarize_archive(root_paths, since=since, until=until)
    root_id = session_id_for_paths(root_paths)
    summaries = {
        session_id: summarize_archive(paths, since=since if session_id == root_id else None, until=until if session_id == root_id else None)
        for session_id, paths in sessions.items()
    }
    report = build_token_report(codex_home, list(sessions), include_linked=False)
    pack_dir = write_analysis_pack(
        codex_home, root_paths, root_summary, since, until, output_dir,
        workspace_summaries=summaries, workspace_edges=edges, workspace_report=report,
    )
    return pack_dir


def main() -> int:
    print(
        "summarize_codex_run.py is now an internal extraction library. Use "
        "discover_sessions.py, extract_evidence.py, and create_report_app.py instead.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
