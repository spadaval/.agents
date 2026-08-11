# Authentication boundary

The encrypted credential store is the sole owner of authentication tokens.
Callers may ask it for the current token, but controllers must never retain a
decrypted token.

The migration is a clean ownership transfer. There must be no fallback to, or
dual reads from, the legacy token table. Missing credentials must remain visible
as `TokenUnavailable`.

The public `authorization_header(account_id, credential_store, legacy_tokens)`
API is temporarily frozen for compatibility. The legacy argument may remain in
the signature, but it must not be consulted.
