#!/usr/bin/env bash
# Atelier repository, pushed to a local bare origin, whose README has one typo
# ("recieve"). AGENTS.md allows trivial fixes on main under a base exemption.
# The backlog holds unrelated open issues.
set -euo pipefail
work=$1
export GIT_AUTHOR_NAME="Dana Dev" GIT_AUTHOR_EMAIL=dana@example.com
export GIT_COMMITTER_NAME="Dana Dev" GIT_COMMITTER_EMAIL=dana@example.com
git init -q --bare -b main "$work/origin.git"
git init -q -b main "$work/repo"
cd "$work/repo"
git remote add origin ../origin.git
cat > notify.py <<'PY'
"""Send order notifications by email."""
import smtplib
from email.message import EmailMessage


def send(to: str, subject: str, body: str, host: str = "localhost") -> None:
    msg = EmailMessage()
    msg["From"] = "orders@example.com"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(host) as smtp:
        smtp.send_message(msg)
PY
cat > README.md <<'MD'
# notify

Order notifications for the shop.

## Usage

Call `notify.send(to, subject, body)` for each customer who should hear about
an order. Customers recieve one email per order status change.

## Configuration

Set the SMTP host with the `host` argument; it defaults to `localhost`.
MD
cat > AGENTS.md <<'MD'
# Agent guide

This repository tracks work in Atelier (`atelier status` to orient).

- Feature work and bug fixes go through an Atelier issue, a work branch, an
  independent review, and `atelier merge`.
- Trivial fixes (typos, broken links, one-line obvious corrections) may be
  committed directly on `main`. Record the exemption with
  `atelier review trivial --base <commit> --identity <you> "<why>" --commit-records`.
- Push `main` to `origin` once `atelier land` passes.
MD
printf '__pycache__/\n' > .gitignore
git add . && git commit -qm "Add order notifications"
atelier init --slug notify -q >/dev/null
git add . && git commit -qm "Install Atelier"
atelier issue create -q --status backlog --issue-type feature "Retry failed sends" --body '## Goal
Retry an SMTP send that fails with a temporary error, so a brief outage does not drop a notification.

## Done when
A test with a fake SMTP server that fails twice then accepts shows `send` delivering once.' >/dev/null
atelier issue create -q --status backlog --issue-type feature "HTML email bodies" --body '## Goal
Send an HTML alternative part alongside the plain-text body.

## Done when
A sent message has `text/plain` and `text/html` parts, checked by a unit test.' >/dev/null
atelier issue create -q --status backlog --issue-type bug "From address is hard-coded" --body '## Goal
Make the From address configurable instead of always `orders@example.com`.

## Done when
`send(..., sender=...)` sets the From header, checked by a unit test.' >/dev/null
git add . && git commit -qm "File notification backlog"
git push -q -u origin main

# Grader inputs, outside the repository.
git rev-parse HEAD > "$work/.setup_head"
cp README.md "$work/.readme_before"
git for-each-ref --format='%(refname)' refs/heads > "$work/.setup_branches"
git -C "$work/origin.git" for-each-ref --format='%(refname)' refs/heads >> "$work/.setup_branches"
ls .atelier/issues .atelier/reviews .atelier/evidence | grep '\.md$' > "$work/.setup_records"
