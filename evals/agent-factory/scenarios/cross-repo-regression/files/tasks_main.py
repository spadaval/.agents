"""tasks: the small tracker every repository on this machine uses.

Each repository keeps its store in `.tasks/items.json`:

    {"items": {"<id>": {"title": ..., "parent": <id or null>, "status": "todo" |
      "in_progress" | "done", "done_when": [{"text": ..., "ticked": bool}]}},
     "approvals": [{"item": <id>, "by": ...}]}

Children share their parent's branch, so the parent is a child's owner.

    python3 tasks.py review-request <id>   print the review brief for an item
    python3 tasks.py merge <id>            merge an approved owner: it and every
                                           open child become done
"""
import json
import sys
from pathlib import Path


class Refused(Exception):
    pass


def load(root="."):
    return json.loads((Path(root) / ".tasks" / "items.json").read_text())


def save(store, root="."):
    (Path(root) / ".tasks" / "items.json").write_text(json.dumps(store, indent=1))


def owner(store, item_id):
    """The item whose branch the work is on: the topmost parent."""
    items = store["items"]
    while items[item_id].get("parent"):
        item_id = items[item_id]["parent"]
    return item_id


def scope(store, owner_id):
    """The owner and every item under it."""
    items = store["items"]
    out = [owner_id]
    for i in out:
        out.extend(k for k, v in items.items() if v.get("parent") == i)
    return out


def unticked(item):
    return [l["text"] for l in item.get("done_when", []) if not l["ticked"]]


def review_request(store, item_id):
    """The review brief for one item, refused while its Done when is unticked."""
    item = store["items"][item_id]
    missing = unticked(item)
    if missing:
        raise Refused(f"{item_id}: {len(missing)} Done when line(s) unticked: " + "; ".join(missing))
    lines = [f"Review {item_id}: {item['title']}", f"Owner branch: {owner(store, item_id)}", "Done when:"]
    lines += [f"  - {l['text']}" for l in item.get("done_when", [])]
    return "\n".join(lines)


def merge(store, item_id):
    """Mark an approved owner and its open children done."""
    oid = owner(store, item_id)
    if not any(a["item"] in scope(store, oid) for a in store.get("approvals", [])):
        raise Refused(f"{oid}: no approval")
    for i in scope(store, oid):
        if store["items"][i]["status"] != "done":
            store["items"][i]["status"] = "done"
    return oid


def main(argv):
    cmd, item_id = argv[1], argv[2]
    store = load()
    try:
        if cmd == "review-request":
            print(review_request(store, item_id))
        elif cmd == "merge":
            print(f"merged {merge(store, item_id)}")
            save(store)
        else:
            raise Refused(f"unknown command {cmd}")
    except Refused as e:
        print(f"refused: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
