"""A hash-chained ledger of v1 event files, so a v1 deployment refuses the hand
edits v2 refuses.

v2 keeps an append-only history per flag and refuses a file whose current value
is not the last history entry. v1 had no such check: deleting a flag's latest
event file by hand made the earlier event current, and `check_prod` then judged
the earlier setter. The ledger closes that gap. Every event `set_flag` writes is
appended to `flags.d/.ledger` as one line:

    <seq> <flag> <sha256 of the event file> <chain>

where `chain` is sha256(previous chain + the other three fields), starting from
GENESIS. `verify` recomputes the chain and refuses an event file that is
missing, changed, or not in the ledger. A deployment whose `flags.d` predates
the ledger has none; `rebuild` writes one from the files as they are, trusting
them once, and records that it did so in `.ledger-rebuilt`.
"""
import hashlib
from pathlib import Path

GENESIS = "0" * 64
LEDGER = ".ledger"
REBUILT = ".ledger-rebuilt"


class LedgerError(Exception):
    pass


def ledger_path(root):
    return Path(root) / "flags.d" / LEDGER


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def link(prev, seq, flag, digest):
    return hashlib.sha256(f"{prev} {seq:04d} {flag} {digest}".encode()).hexdigest()


def entries(root):
    """(seq, flag, digest, chain) for each ledger line, in order."""
    path = ledger_path(root)
    if not path.exists():
        return []
    out = []
    for n, line in enumerate(path.read_text().splitlines(), 1):
        parts = line.split()
        if len(parts) != 4 or not parts[0].isdigit():
            raise LedgerError(f"{LEDGER} line {n} is malformed")
        out.append((int(parts[0]), parts[1], parts[2], parts[3]))
    return out


def has_ledger(root):
    return ledger_path(root).exists()


def append(root, seq, flag, event_file):
    """Record a new event file at the end of the chain."""
    prev = entries(root)[-1][3] if has_ledger(root) and entries(root) else GENESIS
    digest = file_hash(event_file)
    with ledger_path(root).open("a") as f:
        f.write(f"{seq:04d} {flag} {digest} {link(prev, seq, flag, digest)}\n")


def verify(root, event_files):
    """Refuse unless the event files are exactly the ones the ledger chains.

    event_files maps each event's sequence number to (flag, path).
    """
    chained = entries(root)
    prev = GENESIS
    for i in range(len(chained) - 1):
        seq, flag, digest, chain = chained[i]
        if link(prev, seq, flag, digest) != chain:
            raise LedgerError(f"{LEDGER}: chain broken at event {seq:04d}")
        if seq not in event_files:
            raise LedgerError(f"event {seq:04d}-{flag} is in the ledger but its file is missing")
        if event_files[seq][0] != flag or file_hash(event_files[seq][1]) != digest:
            raise LedgerError(f"event {seq:04d}-{flag} was changed after it was recorded")
        prev = chain
    known = {seq for seq, _, _, _ in chained}
    extra = sorted(set(event_files) - known)
    if extra:
        raise LedgerError(f"event {extra[0]:04d} is not in the ledger (added by hand?)")


def rebuild(root, event_files):
    """Write a ledger for the event files as they are now, trusting them once."""
    path = ledger_path(root)
    prev = GENESIS
    lines = []
    for seq in sorted(event_files):
        flag, file = event_files[seq]
        digest = file_hash(file)
        prev = link(prev, seq, flag, digest)
        lines.append(f"{seq:04d} {flag} {digest} {prev}\n")
    path.write_text("".join(lines))
    (Path(root) / "flags.d" / REBUILT).write_text(f"{len(lines)} events trusted at rebuild\n")
    return len(lines)
