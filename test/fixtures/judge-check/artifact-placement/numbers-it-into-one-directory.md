This record goes into the repository as `docs/decisions/0013-store-link-tokens-as-keyed-hashes.md`, next in the newer directory.

# 0013. Store the link tokens as keyed hashes

## Context

Link tokens are stored plain, so a leaked database dump exposes every token.

## Decision

Tokens are stored as keyed hashes; verifying a token costs one hash.

## Consequences

- A leaked dump exposes no token.
- A lost key makes every stored token unverifiable.
