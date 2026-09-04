This record goes into an issue in the project's issue tracker, carrying the label `adr`, and the pull request moving the stations to gRPC streams links that issue. Filing the issue is an act outside the project's working copy: may I file it? The record reads:

**Title:** Stations push readings over a gRPC stream

**Label:** `adr`

## Context

`wrenfield` polls each station over HTTP every 10 seconds, so a reading waits up to 10 seconds, and a silent station is noticed only after three missed polls.

## Decision

Each station pushes its readings over one long-lived gRPC stream.

## Consequences

- A reading reaches the service within a second of being taken.
- A silent station is noticed when its stream closes.
- A station running firmware older than version 4 stays on polling until it is upgraded.
