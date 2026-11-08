"""Command line for feature flags.

    python3 flagctl.py set <root> <flag> on|off --as <who>
    python3 flagctl.py check <root>      exit 1 if an unapproved flag is on
    python3 flagctl.py migrate <root>    fold a v1 flags.d into flags.json
    python3 flagctl.py ledger verify <root>    check a v1 flags.d against its ledger
    python3 flagctl.py ledger rebuild <root>   write a ledger for a v1 flags.d as it is
"""
import argparse
import sys

import flags
import v1ledger


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
    led = sub.add_parser("ledger")
    led.add_argument("action", choices=["verify", "rebuild"])
    led.add_argument("root")
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
        elif a.cmd == "ledger":
            if not flags.is_v1(a.root):
                print("not a v1 deployment; v2 needs no ledger")
                return 0
            if a.action == "verify":
                print("ledger ok" if flags.verify_v1(a.root) else "no ledger")
            else:
                n = v1ledger.rebuild(a.root, flags.v1_files(a.root))
                print(f"ledger rebuilt over {n} events")
    except flags.FlagError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
