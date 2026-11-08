import json
import tempfile
import unittest
from pathlib import Path

import flags


class Base(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "approvers.txt").write_text("ana\n")

    def v1(self):
        (self.root / "flags.d").mkdir()


class V2Test(Base):
    def test_set_and_load(self):
        flags.set_flag(self.root, "checkout", True, "ana")
        self.assertEqual(flags.load(self.root)["checkout"], flags.Flag(True, "ana"))

    def test_hand_edit_is_refused(self):
        flags.set_flag(self.root, "checkout", True, "ana")
        data = json.loads((self.root / "flags.json").read_text())
        data["checkout"]["set_by"] = "bob"
        (self.root / "flags.json").write_text(json.dumps(data))
        with self.assertRaises(flags.FlagError):
            flags.load(self.root)

    def test_check_prod_names_unapproved(self):
        flags.set_flag(self.root, "checkout", True, "bob")
        flags.set_flag(self.root, "search", True, "ana")
        self.assertEqual(flags.check_prod(self.root), ["checkout"])


class V1Test(Base):
    def test_latest_event_wins(self):
        self.v1()
        flags.set_flag(self.root, "checkout", True, "bob")
        flags.set_flag(self.root, "checkout", False, "ana")
        self.assertEqual(flags.load(self.root)["checkout"], flags.Flag(False, "ana"))

    def test_migrate_keeps_history_and_removes_flags_d(self):
        self.v1()
        flags.set_flag(self.root, "checkout", True, "bob")
        flags.set_flag(self.root, "checkout", True, "ana")
        self.assertTrue(flags.migrate(self.root))
        self.assertFalse((self.root / "flags.d").exists())
        self.assertEqual(flags.load(self.root)["checkout"], flags.Flag(True, "ana"))
        self.assertEqual(len(json.loads((self.root / "flags.json").read_text())["checkout"]["history"]), 2)

    def test_v1_and_migrated_agree(self):
        self.v1()
        flags.set_flag(self.root, "checkout", True, "bob")
        flags.set_flag(self.root, "search", True, "ana")
        before = flags.check_prod(self.root)
        flags.migrate(self.root)
        self.assertEqual(flags.check_prod(self.root), before)


if __name__ == "__main__":
    unittest.main()
