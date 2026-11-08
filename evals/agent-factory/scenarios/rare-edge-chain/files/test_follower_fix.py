import os
import tempfile
import unittest
from pathlib import Path

from follower import Follower

NOW = 1_800_000_000


class Clock:
    def __init__(self, t):
        self.t = t

    def __call__(self):
        return self.t


class FollowerTest(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.clock = Clock(NOW)

    def log(self, header, lines=(), mtime=None, name=None):
        """A log headed at `header` with lines stamped at the given times."""
        path = self.dir / f"session-{name if name is not None else header}.log"
        path.write_text(f"HEADER {header}\n" + "".join(f"{t} event {t}\n" for t in lines))
        if mtime is not None:
            os.utime(path, (mtime, mtime))
        return path

    def append(self, path, *stamps, mtime):
        with open(path, "a") as f:
            f.writelines(f"{t} event {t}\n" for t in stamps)
        os.utime(path, (mtime, mtime))

    def test_follows_the_newest_log(self):
        self.log(NOW - 3600, [NOW - 3500], mtime=NOW - 3500)
        new = self.log(NOW - 60, [NOW - 50], mtime=NOW - 50)
        f = Follower(self.dir, self.clock)
        self.assertEqual(f.catch_up(), [f"{NOW - 50} event {NOW - 50}"])
        self.assertEqual(f.current(), new.name)

    def test_a_touched_older_log_is_not_followed(self):
        old = self.log(NOW - 3600, [NOW - 3500], mtime=NOW - 3500)
        game = self.log(NOW - 60, [NOW - 50], mtime=NOW - 50)
        f = Follower(self.dir, self.clock)
        f.catch_up()
        os.utime(old, (NOW, NOW))
        self.assertEqual(f.poll(), [])
        self.assertEqual(f.current(), game.name)

    def test_catch_up_follows_the_games_log_not_a_touched_older_one(self):
        old = self.log(NOW - 3600, [NOW - 3500], mtime=NOW)
        game = self.log(NOW - 60, [NOW - 50], mtime=NOW - 50)
        f = Follower(self.dir, self.clock)
        self.assertEqual(f.catch_up(), [f"{NOW - 50} event {NOW - 50}"])
        self.assertEqual(f.current(), game.name)

    def test_poll_hands_on_each_fresh_line_once(self):
        game = self.log(NOW - 60, [NOW - 50], mtime=NOW - 50)
        f = Follower(self.dir, self.clock)
        f.catch_up()
        self.append(game, NOW - 1, mtime=NOW)
        self.assertEqual(f.poll(), [f"{NOW - 1} event {NOW - 1}"])
        self.assertEqual(f.poll(), [])

    def test_after_a_clock_correction_and_a_restart_the_log_being_written_is_followed(self):
        # The clock ran an hour fast for J1, which it named and stamped, was
        # corrected back, and the game started J2. The follower starts once
        # real time has passed J1's header, while the game writes J2.
        t0 = NOW - 4000
        j1 = self.log(t0 + 3600, [t0 + 3610], mtime=t0 + 10)
        j2 = self.log(t0 + 20, [NOW - 5], mtime=NOW - 5)
        f = Follower(self.dir, self.clock)
        f.catch_up()
        self.assertEqual(f.current(), j2.name)
        self.append(j2, NOW, mtime=NOW)
        self.assertEqual(f.poll(), [f"{NOW} event {NOW}"])
        self.assertEqual(f.current(), j2.name)

    def test_an_older_log_appended_with_old_lines_is_not_taken(self):
        old = self.log(NOW - 3600, [NOW - 3500], mtime=NOW - 3500)
        game = self.log(NOW - 60, [NOW - 10], mtime=NOW - 10)
        f = Follower(self.dir, self.clock)
        f.catch_up()
        self.append(old, NOW - 3400, mtime=NOW)
        self.assertEqual(f.poll(), [])
        self.assertEqual(f.current(), game.name)


if __name__ == "__main__":
    unittest.main()
