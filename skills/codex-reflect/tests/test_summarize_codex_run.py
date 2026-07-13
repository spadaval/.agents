import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "reflect_core.py"
CREATE_APP = Path(__file__).parents[1] / "scripts" / "create_report_app.py"
SPEC = importlib.util.spec_from_file_location("reflect_core", SCRIPT)
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

    def test_analysis_pack_creates_central_artifact(self):
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
            pack = RUNS.write_analysis_pack(home, [parent_path], summary, None, None, None)

            self.assertTrue(pack.is_dir())
            markdown = pack / "markdown"
            self.assertTrue((markdown / "index.md").is_file())
            self.assertTrue((markdown / "run-overview.md").is_file())
            self.assertTrue((markdown / "parent-session.md").is_file())
            self.assertTrue((markdown / "failures.md").is_file())
            self.assertTrue((markdown / "timeline.md").is_file())
            self.assertTrue((markdown / "delegation.md").is_file())
            self.assertTrue((markdown / "metrics.md").is_file())
            self.assertTrue((markdown / "sessions" / f"{STRONG}.md").is_file())
            self.assertFalse((pack / "app").exists())
            api = json.loads((pack / "evidence" / "evidence.json").read_text(encoding="utf-8"))
            markdown_index = (markdown / "index.md").read_text(encoding="utf-8")
            workspace_manifest = json.loads((pack / "manifest.json").read_text(encoding="utf-8"))
            artifact_root = home / "artifacts"
            env = {**os.environ, "ARTIFACT_HUB_ROOT": str(artifact_root)}
            subprocess.run(
                [sys.executable, str(CREATE_APP), str(pack), "--id", "reflect-test", "--consume"],
                check=True, capture_output=True, text=True, env=env,
            )
            artifact = artifact_root / "reflect-test"
            self.assertFalse(pack.exists())
            self.assertFalse((artifact / "package.json").exists())
            self.assertTrue((artifact / "src" / "platform" / "WorkstreamCaseFile.svelte").is_file())
            self.assertTrue((artifact / "src" / "report" / "report.ts").is_file())
            self.assertTrue((artifact / "manifest.json").is_file())
            artifact_api = json.loads((artifact / "evidence" / "evidence.json").read_text(encoding="utf-8"))
            self.assertEqual(api["schemaVersion"], RUNS.EVIDENCE_SCHEMA_VERSION)
            self.assertEqual(api, artifact_api)
            self.assertTrue(all(item["id"] for item in api["evidence"]))
            self.assertIn("Artifact Hub viewer", markdown_index)
            app = (artifact / "src" / "App.svelte").read_text(encoding="utf-8")
            self.assertIn("WorkstreamTree", app)
            self.assertNotIn("PlatformPage", app)
            self.assertEqual(workspace_manifest["agentWritable"], ["src/report"])

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

    def test_logical_session_merges_rollouts_and_uses_latest_token_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            first = write_rollout(home, "first", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "token_count", "info": {"total_token_usage": {"total_tokens": 10}}}),
            ])
            second = write_rollout(home, "second", [
                row("2026-01-01T00:02:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:03:00Z", {"type": "token_count", "info": {"total_token_usage": {"total_tokens": 20}}}),
            ])

            paths = RUNS.find_session_paths(home, str(second))
            summary = RUNS.summarize_archive(paths)
            report = RUNS.build_token_report(home, [PARENT], include_linked=False)

        self.assertEqual(paths, [first, second])
        self.assertEqual(summary["rollout_count"], 2)
        self.assertEqual(summary["token_final"]["total_tokens"], 20)
        self.assertEqual(report["totals"]["total_tokens"], 20)

    def test_workstream_resolution_follows_all_created_peer_threads(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            root = write_rollout(home, "root", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "function_call_output", "output": f'{{"threadId":"{STRONG}"}}'}),
                row("2026-01-01T00:01:30Z", {"type": "function_call_output", "output": f'{{"threadId":"{WEAK}"}}'}),
            ])
            child = write_rollout(home, "child", [
                row("2026-01-01T00:02:00Z", {"id": STRONG}, "session_meta"),
                row("2026-01-01T00:03:00Z", {"type": "user_message", "message": f"<codex_delegation><source_thread_id>{PARENT}</source_thread_id></codex_delegation>"}),
            ])
            peer = write_rollout(home, "peer", [row("2026-01-01T00:02:30Z", {"id": WEAK}, "session_meta")])

            root_paths, sessions, edges = RUNS.resolve_workstream(home, PARENT)

        self.assertEqual(root_paths, [root])
        self.assertEqual(sessions[STRONG], [child])
        self.assertEqual(sessions[WEAK], [peer])
        edge = next(item for item in edges if item["child"] == STRONG)
        self.assertEqual(edge["parent"], PARENT)
        self.assertEqual(edge["kind"], "create_thread")
        self.assertEqual(edge["relationType"], "thread")
        self.assertEqual(edge["timestamp"], "2026-01-01T00:01:00Z")

    def test_delegation_event_preserves_raw_assignment_agent_type_source_and_call_time(self):
        rows = [
            {**row("2026-01-01T00:01:00Z", {"type": "function_call", "call_id": "spawn-1", "name": "spawn_agent", "arguments": json.dumps({"agent_type": "worker", "message": "Assigned issue(s): atelier-demo\nRole/subskill: review"})}), "_line": 8, "_rollout_path": "/tmp/root.jsonl"},
            {**row("2026-01-01T00:01:02Z", {"type": "function_call_output", "call_id": "spawn-1", "output": json.dumps({"agent_id": STRONG})}), "_line": 9, "_rollout_path": "/tmp/root.jsonl"},
        ]

        edge = RUNS.session_relation_events(rows, PARENT)[0]

        self.assertEqual(edge["timestamp"], "2026-01-01T00:01:00Z")
        self.assertEqual(edge["assignment"], "Assigned issue(s): atelier-demo\nRole/subskill: review")
        self.assertEqual(edge["agentType"], "worker")
        self.assertEqual(edge["relationType"], "delegation")
        self.assertNotIn("role", edge)
        self.assertEqual(edge["source"], {"path": "/tmp/root.jsonl", "line": 8})

    def test_successful_validation_commands_are_contextual_evidence_not_tool_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "validation", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:00:30Z", {"type": "user_message", "message": "Please validate this run."}),
                row("2026-01-01T00:00:30Z", {"type": "user_message", "message": "Please validate this run."}),
                row("2026-01-01T00:00:40Z", {"type": "user_message", "message": "<subagent_notification>internal update</subagent_notification>"}),
                row("2026-01-01T00:00:50Z", {"type": "user_message", "message": "<environment_context>internal context</environment_context>"}),
                row("2026-01-01T00:00:55Z", {"type": "agent_message", "message": "I will run the validation."}),
                row("2026-01-01T00:00:55Z", {"type": "agent_message", "message": "I will run the validation."}),
                row("2026-01-01T00:01:00Z", {"type": "function_call", "call_id": "check", "name": "exec_command", "arguments": '{"cmd":"npm run check"}'}),
                row("2026-01-01T00:02:00Z", {"type": "function_call_output", "call_id": "check", "output": "Exit code: 0\nNo errors"}),
            ])
            summary = RUNS.summarize_archive(path)
            api = RUNS.normalized_evidence_pack(PARENT, {PARENT: summary}, [], RUNS.single_session_report(summary))

        self.assertEqual(summary["validation_events"][0]["command"], "npm run check")
        self.assertTrue(any(item["kind"] == "validation" for item in api["evidence"]))
        user_messages = [item for item in api["evidence"] if item["kind"] == "user_message"]
        self.assertEqual(len(user_messages), 3)
        visible = [item for item in user_messages if item["data"]["humanVisible"]]
        self.assertEqual(len(visible), 1)
        self.assertEqual(visible[0]["data"]["message"], "Please validate this run.")
        self.assertEqual(visible[0]["source"]["line"], 2)
        self.assertEqual(len(visible[0]["data"]["representations"]), 2)
        agent_messages = [item for item in api["evidence"] if item["kind"] == "agent_message"]
        self.assertEqual(len(agent_messages), 1)
        self.assertEqual(len(agent_messages[0]["data"]["representations"]), 2)
        self.assertFalse(any(item["kind"] == "tool_count" for item in api["evidence"]))

    def test_schema_v5_retains_interactions_tokens_git_and_neutral_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "schema-v3", [
                row("2026-01-01T00:00:00Z", {
                    "id": PARENT, "cwd": "/tmp/project",
                    "git": {"branch": "main", "commit_hash": "1111111"},
                }, "session_meta"),
                row("2026-01-01T00:00:10Z", {"type": "user_message", "message": "Please implement atelier-demo."}),
                row("2026-01-01T00:00:20Z", {"type": "agent_message", "message": "I will make the change."}),
                row("2026-01-01T00:01:00Z", {"type": "function_call", "call_id": "git-commit", "name": "exec_command", "arguments": '{"cmd":"git commit -m \\\"Add proof\\\""}'}),
                row("2026-01-01T00:01:02Z", {"type": "function_call_output", "call_id": "git-commit", "output": "Exit code: 0\n[feature abcdef1] Add proof"}),
                row("2026-01-01T00:02:00Z", {"type": "custom_tool_call", "call_id": "patch-1", "name": "apply_patch", "input": "*** Begin Patch"}),
                row("2026-01-01T00:02:01Z", {"type": "patch_apply_end", "call_id": "patch-1", "success": True, "stdout": "Success", "changes": {"/tmp/project/file.py": {"type": "update"}}}),
                row("2026-01-01T00:03:00Z", {"type": "function_call", "call_id": "check", "name": "exec_command", "arguments": '{"cmd":"pytest"}'}),
                row("2026-01-01T00:03:02Z", {"type": "function_call_output", "call_id": "check", "output": "Exit code: 0\n1 passed"}),
                row("2026-01-01T00:04:00Z", {"type": "function_call", "call_id": "failure", "name": "exec_command", "arguments": '{"cmd":"false"}'}),
                row("2026-01-01T00:04:01Z", {"type": "function_call_output", "call_id": "failure", "output": "Exit code: 1"}),
                row("2026-01-01T00:05:00Z", {"type": "token_count", "info": {"model_context_window": 200000, "total_token_usage": {
                    "input_tokens": 100, "cached_input_tokens": 40, "output_tokens": 20,
                    "reasoning_output_tokens": 5, "total_tokens": 120,
                }}}),
            ])
            summary = RUNS.summarize_archive(path)
            edge = {
                "parent": PARENT, "child": STRONG, "kind": "spawned_subagent",
                "assignment": "Assigned issue(s): atelier-demo\nRole/subskill: review",
                "timestamp": "2026-01-01T00:00:05Z", "source": {"path": str(path), "line": 1},
            }
            api = RUNS.normalized_evidence_pack(PARENT, {PARENT: summary}, [edge], RUNS.single_session_report(summary))

        self.assertEqual(api["schemaVersion"], 5)
        session = api["sessions"][0]
        self.assertEqual(session["label"], f"Session {PARENT[-8:]}")
        self.assertIsNone(session["role"])
        self.assertEqual(session["status"], "unknown")
        self.assertEqual(session["tokens"]["total"], 120)
        self.assertEqual(session["tokens"]["uncachedInput"], 60)
        self.assertEqual(session["git"]["initial"], {"branch": "main", "commit_hash": "1111111"})

        evidence = api["evidence"]
        interactions = [item for item in evidence if item["kind"] == "tool_interaction"]
        self.assertEqual(len(interactions), 4)
        commit = next(item for item in interactions if item["data"]["id"] == "git-commit")
        self.assertEqual(commit["data"]["invocation"]["arguments"]["cmd"], 'git commit -m "Add proof"')
        self.assertIn("abcdef1", commit["data"]["output"]["text"])
        self.assertEqual(len([item for item in evidence if item["kind"] == "user_message"]), 1)
        self.assertEqual(len([item for item in evidence if item["kind"] == "agent_message"]), 1)
        self.assertEqual(len([item for item in evidence if item["kind"] == "token_snapshot"]), 1)

        validation = next(item for item in evidence if item["kind"] == "validation")
        patch = next(item for item in evidence if item["kind"] == "patch")
        failure = next(item for item in evidence if item["kind"] == "failure")
        self.assertEqual(validation["data"]["toolInteractionEvidenceId"], f"tool:{PARENT}:check")
        self.assertEqual(patch["data"]["toolInteractionEvidenceId"], f"tool:{PARENT}:patch-1")
        self.assertEqual(failure["data"]["toolInteractionEvidenceId"], f"tool:{PARENT}:failure")

        git_initial = next(item for item in evidence if item["kind"] == "git_initial_state")
        git_commit = next(item for item in evidence if item["kind"] == "git_observation")
        self.assertEqual(git_initial["data"]["branch"], "main")
        self.assertEqual(git_commit["data"]["operation"], "commit")
        self.assertEqual(git_commit["data"]["branch"], "feature")
        self.assertEqual(git_commit["data"]["commit"], "abcdef1")
        self.assertEqual(git_commit["data"]["toolInteractionEvidenceId"], f"tool:{PARENT}:git-commit")
        self.assertEqual(RUNS.git_observations(
            "git branch --show-current && git worktree list && git merge-base HEAD main",
            "main", "query",
        ), [])

    def test_model_history_and_token_deltas_are_attributed_to_active_model(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "mixed-model", [
                row("2026-01-01T00:00:00Z", {"id": PARENT, "model_provider": "openai"}, "session_meta"),
                row("2026-01-01T00:00:10Z", {"model": "gpt-5.5", "effort": "high"}, "turn_context"),
                row("2026-01-01T00:01:00Z", {"type": "token_count", "info": {"total_token_usage": {
                    "input_tokens": 100, "cached_input_tokens": 40, "output_tokens": 20,
                    "reasoning_output_tokens": 5, "total_tokens": 120,
                }}}),
                row("2026-01-01T00:02:00Z", {"model": "gpt-5.4-mini", "effort": "medium"}, "turn_context"),
                row("2026-01-01T00:03:00Z", {"type": "token_count", "info": {"total_token_usage": {
                    "input_tokens": 150, "cached_input_tokens": 50, "output_tokens": 30,
                    "reasoning_output_tokens": 8, "total_tokens": 180,
                }}}),
            ])

            summary = RUNS.summarize_archive(path)
            api = RUNS.normalized_evidence_pack(PARENT, {PARENT: summary}, [], RUNS.single_session_report(summary))

        usage = summary["model_usage"]
        self.assertEqual(usage["provider"], "openai")
        self.assertEqual([(item["model"], item["effort"]) for item in usage["configurations"]], [
            ("gpt-5.5", "high"), ("gpt-5.4-mini", "medium"),
        ])
        by_model = {item["model"]: item for item in usage["tokensByModel"]}
        self.assertEqual(by_model["gpt-5.5"]["total"], 120)
        self.assertEqual(by_model["gpt-5.5"]["uncachedInput"], 60)
        self.assertEqual(by_model["gpt-5.4-mini"]["total"], 60)
        self.assertEqual(by_model["gpt-5.4-mini"]["input"], 50)
        self.assertEqual(by_model["gpt-5.4-mini"]["cachedInput"], 10)
        self.assertEqual(by_model["gpt-5.4-mini"]["uncachedInput"], 40)
        self.assertEqual(by_model["gpt-5.4-mini"]["reasoning"], 3)
        session = api["sessions"][0]
        self.assertEqual(session["modelUsage"], usage)
        self.assertEqual(len([item for item in api["evidence"] if item["kind"] == "model_configuration"]), 2)

    def test_patch_output_without_recorded_invocation_still_has_an_honest_interaction_owner(self):
        with tempfile.TemporaryDirectory() as directory:
            path = write_rollout(Path(directory), "output-only-patch", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {
                    "type": "patch_apply_end", "call_id": "missing-invocation", "success": True,
                    "stdout": "Success", "changes": {"/tmp/file.py": {"type": "update"}},
                }),
            ])
            summary = RUNS.summarize_archive(path)
            api = RUNS.normalized_evidence_pack(PARENT, {PARENT: summary}, [], RUNS.single_session_report(summary))

        interaction = next(item for item in api["evidence"] if item["kind"] == "tool_interaction")
        patch = next(item for item in api["evidence"] if item["kind"] == "patch")
        self.assertFalse(interaction["data"]["invocationRecorded"])
        self.assertIsNone(interaction["data"]["invocation"])
        self.assertEqual(interaction["data"]["output"]["source"]["line"], 2)
        self.assertEqual(patch["data"]["toolInteractionEvidenceId"], interaction["id"])
        self.assertEqual(summary["operational_metrics"]["tool_call_count"], 0)

    def test_workstream_pack_exposes_descendant_briefs_and_edge_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            root = write_rollout(home, "root", [
                row("2026-01-01T00:00:00Z", {"id": PARENT}, "session_meta"),
                row("2026-01-01T00:01:00Z", {"type": "function_call_output", "output": f'{{"threadId":"{STRONG}"}}'}),
            ])
            child = write_rollout(home, "child", [
                row("2026-01-01T00:02:00Z", {"id": STRONG}, "session_meta"),
                row("2026-01-01T00:03:00Z", {"type": "user_message", "message": f"<codex_delegation><source_thread_id>{PARENT}</source_thread_id></codex_delegation>"}),
            ])
            pack = RUNS.write_workstream_pack(home, [root], {PARENT: [root], STRONG: [child]}, [{"parent": PARENT, "child": STRONG, "kind": "create_thread"}], None, None, None)

            self.assertTrue((pack / "markdown" / "workstreams.md").is_file())
            self.assertTrue((pack / "markdown" / "sessions" / f"{STRONG}.md").is_file())
            api = json.loads((pack / "evidence" / "evidence.json").read_text(encoding="utf-8"))
            self.assertEqual(api["discoverySessionId"], PARENT)
            self.assertEqual(api["primaryThreadId"], STRONG)
            child_session = next(item for item in api["sessions"] if item["id"] == STRONG)
            self.assertIsNone(child_session["parentId"])
            self.assertEqual(api["edges"], [])
            self.assertEqual(api["threadRelations"][0]["from"], PARENT)
            self.assertEqual(api["threadRelations"][0]["to"], STRONG)
            self.assertTrue(any(item["kind"] == "thread_relation" for item in api["evidence"]))


if __name__ == "__main__":
    unittest.main()
