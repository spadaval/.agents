import json
import tempfile
import unittest
from pathlib import Path

import flags


class Base(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "approvers.txt").write_text("ana\n")


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


if __name__ == "__main__":
    unittest.main()
