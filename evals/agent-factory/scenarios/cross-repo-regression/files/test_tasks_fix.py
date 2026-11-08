import unittest

import tasks


def store():
    return {"items": {
        "p": {"title": "Parent", "parent": None, "status": "in_progress",
              "done_when": [{"text": "children merged", "ticked": True}]},
        "a": {"title": "Child A", "parent": "p", "status": "in_progress",
              "done_when": [{"text": "A works", "ticked": True}]},
    }, "approvals": []}


class TasksTest(unittest.TestCase):
    def test_review_request_refuses_an_unticked_line(self):
        s = store()
        s["items"]["a"]["done_when"][0]["ticked"] = False
        with self.assertRaises(tasks.Refused):
            tasks.review_request(s, "a")

    def test_review_request_brief(self):
        self.assertIn("A works", tasks.review_request(store(), "a"))

    def test_merge_needs_an_approval(self):
        with self.assertRaises(tasks.Refused):
            tasks.merge(store(), "a")

    def test_merge_marks_open_children_done(self):
        s = store()
        s["approvals"].append({"item": "p", "by": "rev"})
        tasks.merge(s, "a")
        self.assertEqual({v["status"] for v in s["items"].values()}, {"done"})

    def test_review_request_covers_every_open_item_merge_will_mark(self):
        s = store()
        s["items"]["b"] = {"title": "Child B", "parent": "p", "status": "in_progress",
                           "done_when": [{"text": "B works", "ticked": False}]}
        with self.assertRaises(tasks.Refused):
            tasks.review_request(s, "a")
        s["items"]["b"]["done_when"][0]["ticked"] = True
        brief = tasks.review_request(s, "a")
        self.assertIn("B works", brief)
        self.assertIn("A works", brief)


if __name__ == "__main__":
    unittest.main()
