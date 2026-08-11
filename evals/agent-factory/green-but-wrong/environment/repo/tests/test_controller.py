import unittest

from src.auth.controller import authorization_header
from src.auth.credential_store import CredentialStore


class ControllerCompatibilityTests(unittest.TestCase):
    def test_public_api_returns_bearer_header(self):
        store = CredentialStore({"acct-1": "new-token"})
        self.assertEqual(
            authorization_header("acct-1", store, {"acct-1": "old-token"}),
            {"Authorization": "Bearer new-token"},
        )

    def test_repeated_request_keeps_header_shape(self):
        store = CredentialStore({"acct-2": "same-token"})
        legacy = {"acct-2": "old-token"}
        self.assertEqual(
            authorization_header("acct-2", store, legacy),
            authorization_header("acct-2", store, legacy),
        )


if __name__ == "__main__":
    unittest.main()
