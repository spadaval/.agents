"""Feature flags: each flag's value, who set it, and the production approval rule.

The current format (v2) keeps every flag in `flags.json`:

    {"flag": {"value": true, "set_by": "ana", "history": [{"value": ..., "set_by": ...}, ...]}}

`history` is append-only, and its last entry must equal the flag's current
value and setter, so a hand edit of either is refused on load.

The old format (v1) kept one file per change in `flags.d/<seq>-<flag>.json`,
each `{"flag": ..., "value": ..., "set_by": ...}`; the highest sequence number
for a flag is its current value. A deployment that has not run
`flagctl.py migrate` is still read through the v1 path, so the binary keeps
working on it. That path is temporary: once every deployment has migrated it
is removed (see the backlog item "Remove the v1 flags.d read path").
"""
import json
import re
from dataclasses import dataclass
from pathlib import Path

V1_NAME = re.compile(r"^(\d{4})-([a-z0-9_]+)\.json$")


class FlagError(Exception):
    pass


@dataclass(frozen=True)
class Flag:
    value: bool
    set_by: str


def is_v1(root):
    return (Path(root) / "flags.d").is_dir() and not (Path(root) / "flags.json").exists()


def load(root):
    """Every flag's current state, from whichever format the deployment has."""
    return load_v1(root) if is_v1(root) else load_v2(root)


def load_v2(root):
    path = Path(root) / "flags.json"
    data = json.loads(path.read_text()) if path.exists() else {}
    flags = {}
    for name, entry in data.items():
        history = entry.get("history") or []
        current = {"value": entry["value"], "set_by": entry["set_by"]}
        if not history or history[-1] != current:
            raise FlagError(f"{name}: current value is not the last history entry (hand edit?)")
        flags[name] = Flag(entry["value"], entry["set_by"])
    return flags


def v1_events(root):
    """(seq, flag, event) for each v1 event file, in sequence order."""
    events = []
    for path in sorted((Path(root) / "flags.d").iterdir()):
        m = V1_NAME.match(path.name)
        if not m:
            continue
        event = json.loads(path.read_text())
        if event.get("flag") != m.group(2):
            raise FlagError(f"{path.name}: names flag {event.get('flag')!r}")
        events.append((int(m.group(1)), m.group(2), event))
    return events


def load_v1(root):
    flags = {}
    for _, name, event in v1_events(root):
        flags[name] = Flag(event["value"], event["set_by"])
    return flags


def set_flag(root, name, value, who):
    if is_v1(root):
        seqs = [seq for seq, _, _ in v1_events(root)]
        seq = max(seqs, default=0) + 1
        event = {"flag": name, "value": value, "set_by": who}
        (Path(root) / "flags.d" / f"{seq:04d}-{name}.json").write_text(json.dumps(event))
        return
    path = Path(root) / "flags.json"
    data = json.loads(path.read_text()) if path.exists() else {}
    entry = data.setdefault(name, {"history": []})
    entry.update(value=value, set_by=who)
    entry["history"].append({"value": value, "set_by": who})
    path.write_text(json.dumps(data, indent=1, sort_keys=True))


def approvers(root):
    path = Path(root) / "approvers.txt"
    return {line.strip() for line in path.read_text().splitlines() if line.strip()} if path.exists() else set()


def check_prod(root):
    """Flags that are on in production but were set by someone who may not approve."""
    allowed = approvers(root)
    return sorted(name for name, flag in load(root).items()
                  if flag.value and flag.set_by not in allowed)


def migrate(root):
    """Fold flags.d into flags.json, keeping every event as history, and remove flags.d."""
    if not is_v1(root):
        return False
    data = {}
    for _, name, event in v1_events(root):
        entry = data.setdefault(name, {"history": []})
        entry.update(value=event["value"], set_by=event["set_by"])
        entry["history"].append({"value": event["value"], "set_by": event["set_by"]})
    (Path(root) / "flags.json").write_text(json.dumps(data, indent=1, sort_keys=True))
    for path in (Path(root) / "flags.d").iterdir():
        path.unlink()
    (Path(root) / "flags.d").rmdir()
    return True
