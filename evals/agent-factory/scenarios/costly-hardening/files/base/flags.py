"""Feature flags: each flag's value, who set it, and the production approval rule.

The current format (v2) keeps every flag in `flags.json`:

    {"flag": {"value": true, "set_by": "ana", "history": [{"value": ..., "set_by": ...}, ...]}}

`history` is append-only, and its last entry must equal the flag's current
value and setter, so a hand edit of either is refused on load.
"""
import json
from dataclasses import dataclass
from pathlib import Path


class FlagError(Exception):
    pass


@dataclass(frozen=True)
class Flag:
    value: bool
    set_by: str


def load(root):
    """Every flag's current state."""
    return load_v2(root)


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


def set_flag(root, name, value, who):
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

