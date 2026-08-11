class TokenUnavailable(LookupError):
    """Raised when an account has no credential in the encrypted store."""


class CredentialStore:
    def __init__(self, tokens=None):
        self._tokens = dict(tokens or {})

    def token_for(self, account_id):
        try:
            return self._tokens[account_id]
        except KeyError as exc:
            raise TokenUnavailable(account_id) from exc

    def rotate(self, account_id, token):
        self._tokens[account_id] = token
