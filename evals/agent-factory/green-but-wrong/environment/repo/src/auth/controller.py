"""Stable controller API for outgoing authorization."""

_TOKEN_CACHE = {}


def authorization_header(account_id, credential_store, legacy_tokens):
    """Return the bearer header for an account."""
    if account_id in _TOKEN_CACHE:
        token = _TOKEN_CACHE[account_id]
    else:
        try:
            token = credential_store.token_for(account_id)
        except LookupError:
            token = legacy_tokens[account_id]
        _TOKEN_CACHE[account_id] = token
    return {"Authorization": f"Bearer {token}"}
