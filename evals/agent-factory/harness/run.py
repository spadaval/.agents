#!/usr/bin/env python3
"""Run Agent Factory scenarios against Claude Code and grade the result.

Each scenario directory holds:

- scenario.json: {"description": ..., "timeout_sec": ..., "max_budget_usd": ...}
- prompt.md: the task. "{{skill}}" is replaced by an instruction to use the
  skill in the skill arm and removed in the none arm.
- setup.sh: called with a fresh work directory; must create work/repo (the
  agent's working directory) and may create work/bin (prepended to PATH).
- grade.py: called with the work directory and the transcript path; prints
  one JSON object {"pass": bool, "checks": {...}, "notes": [...]}.

Arms: "none" runs with no skills, "skill" stages skills/agent-factory from a
git ref of this repository (without maintainers/, which describes the expected
behaviour) into the workspace's .claude/skills. Runs use --setting-sources
project, no MCP servers, and an allowlisted environment. Each run's init event
is checked: a run that loaded MCP servers, had the skill in the wrong arm,
exited non-zero, timed out or produced no result is recorded with
"pass": null and an "invalid" reason instead of a grade.

Claude Code loads instruction files (CLAUDE.md, AGENTS.md, .claude/CLAUDE.md,
.claude/rules/ and the like) from every directory above its working directory,
whatever --setting-sources says, so a run under $HOME sees ~/.claude/CLAUDE.md.
Each run's work directory is therefore made under --work-root, which must lie
outside $HOME (default /var/tmp/af-evals); transcripts and results still go to
--out. As a backstop, every run passes --settings with claudeMdExcludes naming
each instruction file path in the directories above its working directory.
Before a matrix, a canary run in the same setup on a cheap model lists the
instruction files it was given, and the harness aborts unless the canary
repository's own AGENTS.md is the only one.

The agent still runs as the user with permissions skipped and full access to
$HOME and the network; fixtures use local remotes, but nothing confines it.
"""

import argparse
import concurrent.futures
import datetime
import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SCENARIOS = Path(__file__).resolve().parents[1] / "scenarios"
DEFAULT_OUT = Path.home() / ".cache" / "af-evals" / "runs"
DEFAULT_WORK_ROOT = Path("/var/tmp/af-evals")
SKILL_LINE = "Use the agent-factory skill for this task.\n\n"
# Passed through to the agent; everything else in the parent environment
# (including a parent Claude Code or T3 session's sockets and tokens) is dropped.
ENV_KEEP = ("HOME", "USER", "LOGNAME", "LANG", "LC_ALL", "SHELL", "PATH")
NO_MCP = ["--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}']
# What Claude Code 2.1.318 loads as instructions from each directory above its
# working directory (.claude/rules is a directory of rule files). AGENTS.md
# loads where no CLAUDE.md does, so hiding a CLAUDE.md can expose one.
INSTRUCTION_NAMES = ("CLAUDE.md", "CLAUDE.local.md", "AGENTS.md",
                     ".claude/CLAUDE.md", ".claude/AGENTS.md", ".claude/rules/**")
CANARY_MODEL = "haiku"
CANARY_PROMPT = (
    "This is an automated isolation check. Do not use any tools. List every "
    "instruction or memory file (such as CLAUDE.md, CLAUDE.local.md, AGENTS.md "
    "or a rules file) whose contents were loaded into your context, one per "
    "line, as its absolute path followed by ' | ' and the first Markdown "
    "heading in it. If no such file was loaded, reply NONE."
)


def inside(path: Path, root: Path) -> bool:
    path, root = path.resolve(), root.resolve()
    return path == root or root in path.parents


def instruction_excludes(cwd: Path) -> list:
    """claudeMdExcludes naming every instruction file path above cwd."""
    dirs = []
    for d in [*cwd.parents, *cwd.resolve().parents]:
        if d not in dirs:
            dirs.append(d)
    return [str(d / name) for d in dirs for name in INSTRUCTION_NAMES]


def claude_command(prompt: str, model: str, effort: str, budget, cwd: Path) -> list:
    settings = {"claudeMdExcludes": instruction_excludes(cwd)}
    return [
        "claude", "-p", prompt,
        "--model", model, "--effort", effort,
        "--setting-sources", "project",
        "--settings", json.dumps(settings),
        "--output-format", "stream-json", "--verbose",
        "--dangerously-skip-permissions",
        "--no-session-persistence",
        "--max-budget-usd", str(budget),
        *NO_MCP,
    ]


def agent_env(work: Path) -> dict:
    env = {k: os.environ[k] for k in ENV_KEEP if k in os.environ}
    env["TERM"] = "dumb"
    env["ENABLE_CLAUDEAI_MCP_SERVERS"] = "false"
    if (work / "bin").is_dir():
        env["PATH"] = f"{work / 'bin'}:{env['PATH']}"
    env["TMPDIR"] = str(work / "tmp")
    (work / "tmp").mkdir(exist_ok=True)
    return env


def run_claude(cmd: list, cwd: Path, env: dict, transcript: Path, timeout):
    """Run Claude Code into transcript; return its exit code or "timeout"."""
    with transcript.open("w") as out:
        # Own process group, so servers the agent starts die with the run.
        proc = subprocess.Popen(cmd, cwd=cwd, env=env, stdout=out,
                                stderr=subprocess.STDOUT, start_new_session=True)
        try:
            exit_code = proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            exit_code = "timeout"
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait()
    return exit_code


def stage_skill(ref: str, repo_dir: Path) -> str:
    sha = subprocess.run(
        ["git", "-C", str(REPO), "rev-parse", "--short", ref],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    dest = repo_dir / ".claude" / "skills"
    dest.mkdir(parents=True, exist_ok=True)
    archive = subprocess.run(
        ["git", "-C", str(REPO), "archive", ref, "skills/agent-factory"],
        check=True, capture_output=True,
    ).stdout
    subprocess.run(
        ["tar", "-x", "--strip-components=1", "-C", str(dest),
         "--exclude=agent-factory/maintainers"],
        input=archive, check=True,
    )
    exclude = repo_dir / ".git" / "info" / "exclude"
    if exclude.parent.exists():
        with exclude.open("a") as f:
            f.write("\n.claude/\n")
    return sha


def read_transcript(transcript: Path) -> dict:
    """The init event's isolation facts and the final result, if any."""
    info = {"init": None, "result": None}
    for line in transcript.read_text().splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "system" and event.get("subtype") == "init" \
                and info["init"] is None:
            info["init"] = {
                "cwd": event.get("cwd"),
                "model": event.get("model"),
                "version": event.get("claude_code_version"),
                "mcp_servers": [m.get("name") for m in event.get("mcp_servers") or []],
                "agent_factory": any("agent-factory" in str(x)
                                     for x in event.get("skills") or []),
            }
        if event.get("type") == "result":
            info["result"] = event
    return info


def invalid_reason(arm: str, exit_code, info: dict):
    if exit_code != 0:
        return f"claude exited {exit_code}"
    if info["init"] is None:
        return "no init event"
    if info["result"] is None or info["result"].get("is_error") \
            or info["result"].get("subtype") != "success":
        return "no successful result event"
    if info["init"]["mcp_servers"]:
        return f"MCP servers loaded: {info['init']['mcp_servers']}"
    if info["init"]["agent_factory"] != (arm == "skill"):
        return f"agent-factory present={info['init']['agent_factory']} in arm {arm}"
    return None


def check_isolation(work_root: Path, effort: str, out_root: Path) -> None:
    """Exit unless a run in this setup sees only its repository's own
    instruction file, an AGENTS.md whose heading carries a random token."""
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    token = secrets.token_hex(4)
    work = work_root / f"{stamp}-canary-{token}"
    repo = work / "repo"
    repo.mkdir(parents=True)
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    (repo / "AGENTS.md").write_text(
        f"# Isolation canary {token}\n\nThis repository's own guide.\n")
    transcript = out_root / f"canary-{stamp}-{token}.jsonl"
    exit_code = run_claude(
        claude_command(CANARY_PROMPT, CANARY_MODEL, effort, 0.5, repo),
        repo, agent_env(work), transcript, timeout=300)
    reply = (read_transcript(transcript)["result"] or {}).get("result") or ""
    paths = {p.rstrip(".,;:)") for p in re.findall(r"/[^\s|`'\"<>]+", reply)}
    foreign = sorted(p for p in paths if Path(p).is_file() and not inside(Path(p), repo))
    own_seen = token in reply
    print(json.dumps({"canary": "pass" if exit_code == 0 and own_seen and not foreign
                      else "fail", "model": CANARY_MODEL, "exit": exit_code,
                      "foreign": foreign, "own_seen": own_seen,
                      "transcript": str(transcript)}), flush=True)
    if exit_code == 0 and own_seen and not foreign:
        shutil.rmtree(work, ignore_errors=True)
        return
    if exit_code != 0:
        why = f"the canary run exited {exit_code}"
    elif foreign:
        why = ("the run can see instruction files other than the scenario's "
               "own: " + ", ".join(foreign))
    else:
        why = ("the canary did not report its repository's own AGENTS.md, so "
               "the run's instructions are unconfirmed")
    sys.exit(f"Isolation canary failed: {why}.\nIts reply:\n{reply.strip()}\n"
             f"Transcript: {transcript}\nWork directory kept: {work}\n"
             "No scenario was run.")


def run_one(scenario: str, arm: str, ref: str, model: str, effort: str,
            index: int, out_root: Path, work_root: Path) -> dict:
    sdir = SCENARIOS / scenario
    meta = json.loads((sdir / "scenario.json").read_text())
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    name = f"{stamp}-{scenario}-{arm}-{model}-{index}-{secrets.token_hex(2)}"
    run_dir = out_root / name
    work = work_root / name
    run_dir.mkdir(parents=True)
    work.mkdir(parents=True)
    (run_dir / "work").symlink_to(work)

    setup = subprocess.run(["bash", str(sdir / "setup.sh"), str(work)],
                           capture_output=True, text=True)
    if setup.returncode != 0:
        return {"scenario": scenario, "arm": arm, "model": model, "index": index,
                "pass": None, "invalid": "setup failed: " + setup.stderr[-500:],
                "run_dir": str(run_dir), "work_dir": str(work)}
    repo_dir = work / "repo"
    skill_sha = stage_skill(ref, repo_dir) if arm == "skill" else None

    prompt = (sdir / "prompt.md").read_text()
    prompt = prompt.replace("{{skill}}", SKILL_LINE if arm == "skill" else "")
    transcript = run_dir / "transcript.jsonl"
    cmd = claude_command(prompt, model, effort, meta.get("max_budget_usd", 5),
                         repo_dir)
    started = datetime.datetime.now()
    exit_code = run_claude(cmd, repo_dir, agent_env(work), transcript,
                           timeout=meta.get("timeout_sec", 1200))
    seconds = (datetime.datetime.now() - started).total_seconds()

    info = read_transcript(transcript)
    (run_dir / "final.md").write_text((info["result"] or {}).get("result") or "")
    grade = subprocess.run(
        [sys.executable, "-I", str(sdir / "grade.py"), str(work), str(transcript)],
        capture_output=True, text=True,
    )
    try:
        verdict = json.loads(grade.stdout)
    except json.JSONDecodeError:
        verdict = {"pass": None, "error": grade.stdout + grade.stderr}
    invalid = invalid_reason(arm, exit_code, info)
    if invalid:
        verdict = {**verdict, "pass": None, "invalid": invalid}

    result = {
        "scenario": scenario, "arm": arm, "skill_ref": skill_sha,
        "model": model, "effort": effort, "index": index,
        "exit": exit_code, "seconds": round(seconds), "run_dir": str(run_dir),
        "work_dir": str(work), "init": info["init"],
        **verdict,
    }
    (run_dir / "result.json").write_text(json.dumps(result, indent=1))
    return result


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("scenarios", nargs="+")
    p.add_argument("--arms", default="none,skill")
    p.add_argument("--ref", default="HEAD", help="git ref of the skill to stage")
    p.add_argument("--model", default="opus")
    p.add_argument("--effort", default="high")
    p.add_argument("--runs", type=int, default=1)
    p.add_argument("--jobs", type=int, default=2)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT,
                   help="where transcripts and results go")
    p.add_argument("--work-root", type=Path, default=DEFAULT_WORK_ROOT,
                   help="where work directories are made; must be outside $HOME")
    p.add_argument("--keep", action="store_true",
                   help="keep work directories (default: keep only on failure)")
    a = p.parse_args()
    if inside(a.work_root, Path.home()):
        p.error(f"--work-root {a.work_root} is inside $HOME, where the user's "
                "own CLAUDE.md would load into every run")

    jobs = [(s, arm, i) for s in a.scenarios for arm in a.arms.split(",")
            for i in range(a.runs)]
    results_path = a.out / "results.jsonl"
    a.out.mkdir(parents=True, exist_ok=True)
    a.work_root.mkdir(parents=True, exist_ok=True)
    check_isolation(a.work_root, a.effort, a.out)
    with concurrent.futures.ThreadPoolExecutor(a.jobs) as pool:
        futures = [pool.submit(run_one, s, arm, a.ref, a.model, a.effort, i,
                               a.out, a.work_root)
                   for s, arm, i in jobs]
        for fut, (s, arm, i) in zip(futures, jobs):
            try:
                r = fut.result()
            except Exception as exc:  # record it; keep the other runs' results
                r = {"scenario": s, "arm": arm, "index": i, "pass": None,
                     "invalid": f"harness error: {exc!r}", "run_dir": ""}
            with results_path.open("a") as f:
                f.write(json.dumps(r) + "\n")
            if r.get("pass") is True and not a.keep and r.get("work_dir"):
                shutil.rmtree(r["work_dir"], ignore_errors=True)
                (Path(r["run_dir"]) / "work").unlink(missing_ok=True)
            print(json.dumps({k: r.get(k) for k in
                              ("scenario", "arm", "index", "pass", "invalid",
                               "exit", "seconds", "run_dir")}), flush=True)


if __name__ == "__main__":
    main()
