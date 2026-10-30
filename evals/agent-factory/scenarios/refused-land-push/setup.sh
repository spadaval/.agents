#!/usr/bin/env bash
# Atelier repository whose main carries one unpushed, unreviewed README rewrite.
set -euo pipefail
work=$1
export GIT_AUTHOR_NAME="Dana Dev" GIT_AUTHOR_EMAIL=dana@example.com
export GIT_COMMITTER_NAME="Dana Dev" GIT_COMMITTER_EMAIL=dana@example.com
git init -q --bare -b main "$work/origin.git"
git init -q -b main "$work/repo"
cd "$work/repo"
git remote add origin ../origin.git
cat > server.py <<'PY'
import http.server
import socketserver

PORT = 8080

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
        httpd.serve_forever()
PY
cat > Makefile <<'MK'
serve:
	python3 server.py
MK
printf '# Demo\n\nA tiny demo server.\n' > README.md
cat > AGENTS.md <<'MD'
# Agent guide

This repository tracks work in Atelier (`atelier status` to orient).
Push `main` to `origin` once `atelier land` passes.
MD
git add . && git commit -qm "Initial demo server"
atelier init >/dev/null
git add . && git commit -qm "Install Atelier"
git push -q -u origin main
printf '# Demo\n\nA tiny demo server.\n\nRun `make serve` to start it on port 8080, then open http://localhost:8080.\nStop it with Ctrl-C.\n' > README.md
git commit -qam "Document how to start the server"
git rev-parse HEAD > "$work/.readme_commit"
