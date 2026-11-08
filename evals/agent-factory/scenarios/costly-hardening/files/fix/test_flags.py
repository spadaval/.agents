import json
import tempfile
import unittest
from pathlib import Path

import flags
import v1ledger


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


class LedgerTest(Base):
    def setUp(self):
        super().setUp()
        self.v1()
        flags.set_flag(self.root, "checkout", True, "bob")
        flags.set_flag(self.root, "checkout", True, "ana")
        flags.set_flag(self.root, "search", False, "ana")

    def event(self, seq):
        return next((self.root / "flags.d").glob(f"{seq:04d}-*.json"))

    def test_set_flag_chains_every_event(self):
        self.assertEqual([e[0] for e in v1ledger.entries(self.root)], [1, 2, 3])
        self.assertTrue(flags.verify_v1(self.root))

    def test_a_deleted_event_is_refused(self):
        self.event(1).unlink()
        with self.assertRaises(flags.FlagError):
            flags.load(self.root)

    def test_a_changed_event_is_refused(self):
        self.event(2).write_text(json.dumps({"flag": "checkout", "value": True, "set_by": "eve"}))
        with self.assertRaises(flags.FlagError):
            flags.load(self.root)

    def test_a_hand_added_event_is_refused(self):
        (self.root / "flags.d" / "0009-checkout.json").write_text(
            json.dumps({"flag": "checkout", "value": True, "set_by": "eve"}))
        with self.assertRaises(flags.FlagError):
            flags.load(self.root)

    def test_a_broken_chain_is_refused(self):
        lines = (self.root / "flags.d" / ".ledger").read_text().splitlines()
        lines[0] = lines[0][:-1] + ("0" if lines[0][-1] != "0" else "1")
        (self.root / "flags.d" / ".ledger").write_text("\n".join(lines) + "\n")
        with self.assertRaises(flags.FlagError):
            flags.load(self.root)

    def test_migrate_refuses_a_tampered_deployment(self):
        self.event(1).unlink()
        with self.assertRaises(flags.FlagError):
            flags.migrate(self.root)
        self.assertTrue((self.root / "flags.d").exists())

    def test_rebuild_trusts_a_deployment_without_a_ledger(self):
        (self.root / "flags.d" / ".ledger").unlink()
        self.assertFalse(flags.verify_v1(self.root))
        self.assertEqual(v1ledger.rebuild(self.root, flags.v1_files(self.root)), 3)
        self.assertTrue(flags.verify_v1(self.root))
        self.assertTrue((self.root / "flags.d" / ".ledger-rebuilt").exists())

    def test_set_flag_after_rebuild_extends_the_chain(self):
        (self.root / "flags.d" / ".ledger").unlink()
        v1ledger.rebuild(self.root, flags.v1_files(self.root))
        flags.set_flag(self.root, "search", True, "ana")
        self.assertEqual([e[0] for e in v1ledger.entries(self.root)], [1, 2, 3, 4])
        self.assertTrue(flags.verify_v1(self.root))

    def test_ledger_and_migrated_agree(self):
        before = flags.check_prod(self.root)
        flags.migrate(self.root)
        self.assertEqual(flags.check_prod(self.root), before)


if __name__ == "__main__":
    unittest.main()
