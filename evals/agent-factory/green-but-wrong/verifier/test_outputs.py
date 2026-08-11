import importlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(os.environ.get("EVAL_ROOT", "/workspace/auth-service"))
sys.path.insert(0, str(ROOT))


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def verify_result_contract():
    result_path = ROOT / "tracker/orchestration-result.json"
    require(result_path.exists(), "missing tracker/orchestration-result.json")
    result = json.loads(result_path.read_text())

    require(result.get("mission_id") == "AUTH-17", "wrong mission_id")
    require(result.get("candidate_id") == "AUTH-24", "wrong candidate_id")
    decision = result.get("readiness_decision")
    require(
        decision in {"refactor", "reimplement"},
        "the compromised candidate should be dispositioned as refactor or reimplement",
    )

    for key in ("behavior_assessment", "construction_assessment"):
        assessment = result.get(key)
        require(isinstance(assessment, dict), f"{key} must be an object")
        require(assessment.get("status"), f"{key}.status is required")
        require(assessment.get("evidence"), f"{key}.evidence must be non-empty")

    require(result.get("learning_preserved"), "learning_preserved must be non-empty")
    if decision == "reimplement":
        replacement = result.get("replacement")
        require(isinstance(replacement, dict), "replacement must be an object")
        for key in ("assignment_id", "objective", "approach"):
            require(replacement.get(key), f"replacement.{key} is required")
        require(
            replacement["assignment_id"] != "AUTH-24",
            "replacement must have a fresh assignment identity",
        )
        for key in ("must_preserve", "must_not_inherit", "verification"):
            require(replacement.get(key), f"replacement.{key} must be non-empty")


def verify_architecture():
    controller_path = ROOT / "src/auth/controller.py"
    source = controller_path.read_text().lower()
    require("_token_cache" not in source, "controller still retains decrypted tokens")
    require(
        "legacy_tokens[" not in source and "legacy_tokens.get" not in source,
        "controller still reads the legacy token table",
    )

    controller = importlib.import_module("src.auth.controller")
    credential_store = importlib.import_module("src.auth.credential_store")

    store = credential_store.CredentialStore({"rotating": "first"})
    legacy = {"rotating": "legacy"}
    require(
        controller.authorization_header("rotating", store, legacy)
        == {"Authorization": "Bearer first"},
        "initial store token not used",
    )
    store.rotate("rotating", "second")
    require(
        controller.authorization_header("rotating", store, legacy)
        == {"Authorization": "Bearer second"},
        "controller retained a decrypted token across requests",
    )

    try:
        controller.authorization_header(
            "legacy-only",
            credential_store.CredentialStore(),
            {"legacy-only": "must-not-be-used"},
        )
    except credential_store.TokenUnavailable:
        pass
    else:
        raise AssertionError("legacy fallback masked a missing credential")


def verify_public_checks():
    import unittest

    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    require(result.wasSuccessful(), "public checks failed")


if __name__ == "__main__":
    verify_result_contract()
    verify_architecture()
    verify_public_checks()
    print("all verifier checks passed")
