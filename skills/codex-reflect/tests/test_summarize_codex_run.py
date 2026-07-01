import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "summarize_codex_run.py"
SPEC = importlib.util.spec_from_file_location("summarize_codex_run", SCRIPT)
assert SPEC and SPEC.loader
RUNS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RUNS)

PARENT = "019aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
STRONG = "019bbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
WEAK = "019ccccc-cccc-cccc-cccc-cccccccccccc"


def row(timestamp, payload, row_type="response_item"):
    return {"timestamp": timestamp, "type": row_type, "payload": payload}


def write_rollout(root, name, rows):
    path = root / "archived_sessions" / f"rollout-{name}.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(json.dumps(item) for item in rows) + "\n", encoding="utf-8")
    return path


class LinkedSessionEvidenceTests(unittest.TestCase):
    def test_evidence_deduplicates_and_prefers_strong_confidence(self):
        rows = [
            row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
            row("2026-01-01T00:01:00Z", {"type": "function_call_output", "output": f'{{"agent_id":"{STRONG}"}}'}),
            row("2026-01-01T00:02:00Z", {"type": "agent_message", "message": f"subagent {STRONG} and {WEAK}"}),
            row("2026-01-01T00:03:00Z", {"type": "user_message", "message": f"agent_ reference {WEAK}"}),
        ]

        evidence = RUNS.extract_linked_session_evidence(rows)

        self.assertEqual(evidence, [
            {"id": STRONG, "sources": ["function_call_output.agent_id", "message.subagent_reference"], "confidence": "strong"},
            {"id": WEAK, "sources": ["message.subagent_reference"], "confidence": "weak"},
        ])
        self.assertEqual(RUNS.extract_linked_session_ids(rows), {STRONG, WEAK})

    def test_summary_filters_link_evidence_by_time_window_and_preserves_legacy_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "parent", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "function_call_output", "output": f"agent_id={STRONG}"}),
                row("2026-01-01T00:03:00Z", {"type": "agent_message", "message": f"subagent {WEAK}"}),
            ])

            summary = RUNS.summarize_archive(path, until=RUNS.parse_boundary("2026-01-01T00:02:00Z"))

        self.assertEqual(summary["linked_session_ids"], [STRONG])
        self.assertEqual(summary["detected_linked_session_count"], 1)
        self.assertEqual(summary["linked_session_evidence"][0]["confidence"], "strong")

    def test_summary_accepts_structured_tool_output(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "structured-output", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "function_call", "call_id": "call-1", "name": "example", "arguments": "{}"}),
                row("2026-01-01T00:02:00Z", {"type": "function_call_output", "call_id": "call-1", "output": {"status": "ok"}}),
            ])

            summary = RUNS.summarize_archive(path)

        self.assertEqual(summary["failed_calls"], [])

    def test_failure_context_captures_response_and_modified_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "failure-context", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "agent_message", "message": "I will inspect the files."}),
                row("2026-01-01T00:02:00Z", {"type": "function_call", "call_id": "call-1", "name": "exec_command", "arguments": '{"cmd":"rg missing"}'}),
                row("2026-01-01T00:03:00Z", {"type": "function_call_output", "call_id": "call-1", "output": "Process exited with code 1"}),
                row("2026-01-01T00:04:00Z", {"type": "agent_message", "message": "The query had no matches; I will list files instead."}),
                row("2026-01-01T00:05:00Z", {"type": "function_call", "call_id": "call-2", "name": "exec_command", "arguments": '{"cmd":"rg --files"}'}),
                row("2026-01-01T00:06:00Z", {"type": "function_call_output", "call_id": "call-2", "output": "Exit code: 0"}),
            ])

            summary = RUNS.summarize_archive(path)

        self.assertEqual(len(summary["failure_events"]), 1)
        failure = summary["failure_events"][0]
        self.assertEqual(failure["failure_kinds"], ["nonzero_exit"])
        self.assertIn("no matches", failure["response_context"]["next_agent_message"]["message"])
        self.assertEqual(failure["response_context"]["next_action"]["cmd"], "rg --files")
        self.assertEqual(failure["response_context"]["follow_up"], "modified_retry")
        self.assertEqual(failure["response_context"]["follow_up_outcome"], "no_failure_signal_observed")

    def test_failure_events_include_structured_errors_unmatched_calls_and_failed_patches(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "failure-signals", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "function_call", "call_id": "error-call", "name": "example", "arguments": "{}"}),
                row("2026-01-01T00:02:00Z", {"type": "function_call_output", "call_id": "error-call", "output": {"status": "error", "error": "unavailable"}}),
                row("2026-01-01T00:03:00Z", {"type": "function_call", "call_id": "unmatched", "name": "example", "arguments": "{}"}),
                row("2026-01-01T00:04:00Z", {"type": "patch_apply_end", "success": False, "changes": {}, "stderr": "conflict"}),
            ])

            summary = RUNS.summarize_archive(path)

        kinds = {kind for event in summary["failure_events"] for kind in event["failure_kinds"]}
        self.assertEqual(kinds, {"structured_error", "structured_failure_status", "unmatched_tool_call", "patch_apply_failure"})

    def test_operational_metrics_count_tools_recovery_and_spawn_notifications(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "operational-metrics", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "function_call", "call_id": "call-1", "name": "exec_command", "arguments": '{"cmd":"false"}'}),
                row("2026-01-01T00:02:00Z", {"type": "function_call_output", "call_id": "call-1", "output": "Exit code: 1"}),
                row("2026-01-01T00:03:00Z", {"type": "function_call", "call_id": "call-2", "name": "exec_command", "arguments": '{"cmd":"true"}'}),
                row("2026-01-01T00:04:00Z", {"type": "function_call_output", "call_id": "call-2", "output": "Exit code: 0"}),
                row("2026-01-01T00:05:00Z", {"type": "user_message", "message": f'<subagent_notification> {{"agent_path":"{STRONG}"}} </subagent_notification>'}),
            ])

            summary = RUNS.summarize_archive(path)

        metrics = summary["operational_metrics"]
        self.assertEqual(metrics["tool_call_count"], 2)
        self.assertEqual(metrics["completed_tool_call_count"], 2)
        self.assertEqual(metrics["clean_tool_completion_count"], 1)
        self.assertEqual(metrics["clean_tool_completion_rate"], 0.5)
        self.assertEqual(metrics["observed_recovery_count"], 1)
        self.assertEqual(metrics["observed_recovery_rate"], 1.0)
        self.assertEqual(summary["detected_spawned_subagent_ids"], [STRONG])

    def test_token_report_counts_detected_links_and_reports_missing_candidates(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            parent_path = write_rollout(home, "parent", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "token_count", "info": {"total_token_usage": {"total_tokens": 10}}}),
                row("2026-01-01T00:02:00Z", {"type": "function_call_output", "output": f"agent_id={STRONG}"}),
                row("2026-01-01T00:03:00Z", {"type": "agent_message", "message": f"subagent {WEAK}"}),
            ])
            write_rollout(home, "child", [
                row("2026-01-01T00:04:00Z", {"id": STRONG}, "session_meta"),
                row("2026-01-01T00:05:00Z", {"type": "token_count", "info": {"total_token_usage": {"total_tokens": 5}}}),
            ])

            report = RUNS.build_token_report(home, [str(parent_path)], include_linked=True)

        self.assertEqual(report["detected_linked_session_count"], 2)
        self.assertEqual(report["totals"]["total_tokens"], 15)
        self.assertEqual(len(report["sessions"]), 2)
        self.assertEqual(report["missing_linked_session_ids"], {PARENT: [WEAK]})
        confidence = {item["id"]: item["confidence"] for item in report["linked_session_evidence"]}
        self.assertEqual(confidence, {STRONG: "strong", WEAK: "weak"})

    def test_analysis_pack_writes_bounded_markdown_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            parent_path = write_rollout(home, "parent", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "user_message", "message": "Review this run."}),
                row("2026-01-01T00:02:00Z", {"type": "function_call_output", "output": f"agent_id={STRONG}"}),
            ])
            write_rollout(home, "child", [
                row("2026-01-01T00:03:00Z", {"id": STRONG}, "session_meta"),
            ])

            summary = RUNS.summarize_archive(parent_path)
            pack = RUNS.write_analysis_pack(home, parent_path, summary, None, None, None)

            self.assertTrue(pack.is_dir())
            self.assertTrue((pack / "index.md").is_file())
            self.assertTrue((pack / "run-overview.md").is_file())
            self.assertTrue((pack / "parent-session.md").is_file())
            self.assertTrue((pack / "failures.md").is_file())
            self.assertTrue((pack / "timeline.md").is_file())
            self.assertTrue((pack / "delegation.md").is_file())
            self.assertTrue((pack / "metrics.md").is_file())
            self.assertTrue((pack / "sessions" / f"{STRONG}.md").is_file())
            self.assertIn("Detected Linked Session Briefs", (pack / "index.md").read_text(encoding="utf-8"))

    def test_project_listing_and_filtering_use_exact_normalized_cwd(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            project_a = home / "projects" / "a"
            project_b = home / "projects" / "b"
            write_rollout(home, "project-a", [
                row("2026-01-01T00:00:00Z", {"id": PARENT, "cwd": str(project_a)}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "user_message", "message": "needle in project a"}),
            ])
            write_rollout(home, "project-b", [
                row("2026-01-01T00:02:00Z", {"id": WEAK, "cwd": str(project_b)}, "session_meta"),
                row("2026-01-01T00:03:00Z", {"type": "user_message", "message": "needle in project b"}),
            ])

            listed = RUNS.list_sessions(home, 20, str(project_a))
            found = RUNS.find_sessions(home, "needle", 20, str(project_a))
            projects = RUNS.list_projects(home)

        self.assertEqual([entry["id"] for entry in listed], [PARENT])
        self.assertEqual([entry["id"] for entry in found], [PARENT])
        self.assertEqual([(entry["cwd"], entry["session_count"]) for entry in projects], [
            (str(project_b.resolve()), 1),
            (str(project_a.resolve()), 1),
        ])


if __name__ == "__main__":
    unittest.main()
