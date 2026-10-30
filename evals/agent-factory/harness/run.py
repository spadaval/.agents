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
git ref of this repository into the workspace's .claude/skills. Runs use
--setting-sources project, so user-level skills and settings do not leak in.
"""

import argparse
import concurrent.futures
import datetime
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SCENARIOS = Path(__file__).resolve().parents[1] / "scenarios"
DEFAULT_OUT = Path.home() / ".cache" / "af-evals" / "runs"
SKILL_LINE = "Use the agent-factory skill for this task.\n\n"


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
        ["tar", "-x", "--strip-components=1", "-C", str(dest)],
        input=archive, check=True,
    )
    exclude = repo_dir / ".git" / "info" / "exclude"
    if exclude.parent.exists():
        with exclude.open("a") as f:
            f.write("\n.claude/\n")
    return sha


def final_text(transcript: Path) -> str:
    text = ""
    for line in transcript.read_text().splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "result":
            text = event.get("result") or text
    return text


def run_one(scenario: str, arm: str, ref: str, model: str, effort: str,
            index: int, out_root: Path) -> dict:
    sdir = SCENARIOS / scenario
    meta = json.loads((sdir / "scenario.json").read_text())
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = out_root / f"{stamp}-{scenario}-{arm}-{model}-{index}"
    work = run_dir / "work"
    work.mkdir(parents=True)

    subprocess.run(["bash", str(sdir / "setup.sh"), str(work)], check=True,
                   capture_output=True)
    repo_dir = work / "repo"
    skill_sha = stage_skill(ref, repo_dir) if arm == "skill" else None

    prompt = (sdir / "prompt.md").read_text()
    prompt = prompt.replace("{{skill}}", SKILL_LINE if arm == "skill" else "")
    env = dict(os.environ)
    if (work / "bin").is_dir():
        env["PATH"] = f"{work / 'bin'}:{env['PATH']}"
    env["TMPDIR"] = str(work / "tmp")
    (work / "tmp").mkdir(exist_ok=True)

    transcript = run_dir / "transcript.jsonl"
    cmd = [
        "claude", "-p", prompt,
        "--model", model, "--effort", effort,
        "--setting-sources", "project",
        "--output-format", "stream-json", "--verbose",
        "--dangerously-skip-permissions",
        "--no-session-persistence",
        "--max-budget-usd", str(meta.get("max_budget_usd", 5)),
    ]
    started = datetime.datetime.now()
    with transcript.open("w") as out:
        try:
            proc = subprocess.run(cmd, cwd=repo_dir, env=env, stdout=out,
                                  stderr=subprocess.STDOUT,
                                  timeout=meta.get("timeout_sec", 1200))
            exit_code = proc.returncode
        except subprocess.TimeoutExpired:
            exit_code = "timeout"
    seconds = (datetime.datetime.now() - started).total_seconds()

    (run_dir / "final.md").write_text(final_text(transcript))
    grade = subprocess.run(
        [sys.executable, "-I", str(sdir / "grade.py"), str(work), str(transcript)],
        capture_output=True, text=True,
    )
    try:
        verdict = json.loads(grade.stdout)
    except json.JSONDecodeError:
        verdict = {"pass": None, "error": grade.stdout + grade.stderr}

    result = {
        "scenario": scenario, "arm": arm, "skill_ref": skill_sha,
        "model": model, "effort": effort, "index": index,
        "exit": exit_code, "seconds": round(seconds), "run_dir": str(run_dir),
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
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--keep", action="store_true",
                   help="keep work directories (default: keep only on failure)")
    a = p.parse_args()

    jobs = [(s, arm, i) for s in a.scenarios for arm in a.arms.split(",")
            for i in range(a.runs)]
    results_path = a.out / "results.jsonl"
    a.out.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(a.jobs) as pool:
        futures = [pool.submit(run_one, s, arm, a.ref, a.model, a.effort, i, a.out)
                   for s, arm, i in jobs]
        for fut in concurrent.futures.as_completed(futures):
            r = fut.result()
            with results_path.open("a") as f:
                f.write(json.dumps(r) + "\n")
            if r.get("pass") and not a.keep:
                shutil.rmtree(Path(r["run_dir"]) / "work", ignore_errors=True)
            print(json.dumps({k: r.get(k) for k in
                              ("scenario", "arm", "index", "pass", "exit",
                               "seconds", "run_dir")}), flush=True)


if __name__ == "__main__":
    main()
