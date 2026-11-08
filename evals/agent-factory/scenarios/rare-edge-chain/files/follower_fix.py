"""Follow the game's current session log in its log folder."""
import time
from pathlib import Path

SWITCH_SECS = 120      # a log that began this much earlier never takes the session
FRESH_LINE_SECS = 120  # poll hands on lines stamped this recently: the live feed
AHEAD_SECS = 5         # or this far ahead, for a slightly fast clock
TAIL_BYTES = 65536     # where being_written looks for the last line


def line_time(line):
    """The UTC seconds a line is stamped with, or None."""
    words = line.split()
    if words[:1] == ["HEADER"]:
        words = words[1:]
    return int(words[0]) if words and words[0].isdigit() else None


def header_time(path):
    """The UTC seconds on a log's HEADER line, or None if it has none yet."""
    try:
        with open(path) as f:
            first = f.readline()
    except OSError:
        return None
    return line_time(first) if first.startswith("HEADER ") else None


def name_time(path):
    """The UTC seconds in a log's name, session-<seconds>.log, or None."""
    _, _, secs = Path(path).stem.partition("-")
    return int(secs) if secs.isdigit() else None


def last_line_time(path):
    """The UTC seconds on a log's last complete line, or None."""
    try:
        with open(path, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - TAIL_BYTES))
            tail = f.read()
    except OSError:
        return None
    lines = tail[: tail.rfind(b"\n") + 1].decode(errors="replace").splitlines()
    for line in reversed(lines):
        t = line_time(line)
        if t is not None:
            return t
    return None


def being_written(path, now):
    """Whether the game is writing this log now: its last line is fresh."""
    t = last_line_time(path)
    return t is not None and abs(now - t) <= FRESH_LINE_SECS


def begins_before(a, b):
    """Whether log a began more than SWITCH_SECS before log b, by header."""
    ta, tb = header_time(a), header_time(b)
    return ta is not None and tb is not None and ta < tb - SWITCH_SECS


class Follower:
    def __init__(self, folder, clock=time.time):
        self.folder = Path(folder)
        self.clock = clock
        self.path = None
        self.offsets = {}

    def logs(self):
        return sorted(self.folder.glob("session-*.log"))

    def newest_by_mtime(self):
        found = self.logs()
        return max(found, key=lambda p: p.stat().st_mtime) if found else None

    def latest_by_name(self):
        found = [p for p in self.logs() if name_time(p) is not None]
        return max(found, key=name_time) if found else None

    def catch_up(self):
        """At startup, choose the log to follow and return all its lines."""
        newest, latest = self.newest_by_mtime(), self.latest_by_name()
        if newest is None:
            return []
        chosen = newest
        if being_written(newest, self.clock()):
            pass  # the game is writing it, whatever its header says
        elif latest is not None and latest != newest and begins_before(newest, latest):
            chosen = latest
        self.path = chosen
        return self._read(chosen)

    def poll(self):
        """Fresh lines from the followed log, after switching to the newest log
        if the game is writing it, or by header order if the game is not
        writing the followed one."""
        now = self.clock()
        newest = self.newest_by_mtime()
        if newest is not None and newest != self.path and header_time(newest) is not None:
            if being_written(newest, now):
                self.path = newest
            elif self.path is None or (not being_written(self.path, now)
                                       and not begins_before(newest, self.path)):
                self.path = newest
        if self.path is None:
            return []
        return [l for l in self._read(self.path)
                if (t := line_time(l)) is not None and now - FRESH_LINE_SECS <= t <= now + AHEAD_SECS]

    def current(self):
        """The followed log's name, for the dashboard title."""
        return self.path.name if self.path else None

    def _read(self, path):
        """Complete lines after the saved offset, HEADER left out."""
        start = self.offsets.get(path, 0)
        with open(path, "rb") as f:
            f.seek(start)
            data = f.read()
        end = data.rfind(b"\n") + 1
        self.offsets[path] = start + end
        lines = data[:end].decode(errors="replace").splitlines()
        return [l for l in lines if not l.startswith("HEADER ")]
