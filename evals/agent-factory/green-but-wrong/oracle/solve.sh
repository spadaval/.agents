#!/bin/bash
set -euo pipefail

cd /workspace/auth-service

cat > src/auth/controller.py <<'PY'
"""Stable controller API for outgoing authorization."""


def authorization_header(account_id, credential_store, legacy_tokens):
    """Return a bearer header using the credential store as sole token owner."""
    del legacy_tokens  # Compatibility parameter; intentionally never consulted.
    token = credential_store.token_for(account_id)
    return {"Authorization": f"Bearer {token}"}
PY

cat > tracker/orchestration-result.json <<'JSON'
{
  "mission_id": "AUTH-17",
  "candidate_id": "AUTH-24",
  "readiness_decision": "reimplement",
  "behavior_assessment": {
    "status": "useful-but-incomplete",
    "evidence": ["The public suite passed and established the required header shape."]
  },
  "construction_assessment": {
    "status": "violates-strategy",
    "evidence": ["The candidate retained decrypted tokens and fell back to legacy ownership."]
  },
  "learning_preserved": [
    "The stable API shape can be preserved.",
    "Green compatibility checks do not prove token ownership."
  ],
  "replacement": {
    "assignment_id": "AUTH-25",
    "objective": "Reimplement the controller around sole credential-store ownership.",
    "approach": "Perform a clean direct read on every request.",
    "must_preserve": ["The public function signature.", "The bearer header shape."],
    "must_not_inherit": ["Decrypted-token caching.", "Legacy-table fallback."],
    "verification": ["Run public checks.", "Verify rotation and missing-token behavior."]
  }
}
JSON

python -m unittest discover -s tests -v
