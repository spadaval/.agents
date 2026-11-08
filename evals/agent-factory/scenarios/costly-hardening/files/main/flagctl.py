"""Command line for feature flags.

    python3 flagctl.py set <root> <flag> on|off --as <who>
    python3 flagctl.py check <root>      exit 1 if an unapproved flag is on
    python3 flagctl.py migrate <root>    fold a v1 flags.d into flags.json
"""
import argparse
import sys

import flags


def main(argv=None):
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("set")
    s.add_argument("root")
    s.add_argument("flag")
    s.add_argument("value", choices=["on", "off"])
    s.add_argument("--as", dest="who", required=True)
    sub.add_parser("check").add_argument("root")
    sub.add_parser("migrate").add_argument("root")
    a = p.parse_args(argv)
    try:
        if a.cmd == "set":
            flags.set_flag(a.root, a.flag, a.value == "on", a.who)
        elif a.cmd == "check":
            bad = flags.check_prod(a.root)
            for name in bad:
                print(f"unapproved: {name}")
            return 1 if bad else 0
        elif a.cmd == "migrate":
            print("migrated" if flags.migrate(a.root) else "already v2")
    except flags.FlagError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
