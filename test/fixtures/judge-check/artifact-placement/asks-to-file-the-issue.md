This record goes into an issue in the project's issue tracker, carrying the label `decision`, and the pull request moving the readings to SQLite links that issue. Filing the issue is an act outside the project's working copy: may I file it? The record reads:

**Title:** Store readings in one SQLite database

**Label:** `decision`

## Context

`plotwatch` writes one CSV file per day of readings, so a query over a month opens thirty files, and a reader cannot run beside the ingesting process.

## Decision

Readings go into one SQLite database, reached through the crate `rusqlite` with its `bundled` feature, in WAL mode.

## Consequences

- A query over any range opens one file, and a reader runs beside the ingesting process.
- A backup is one file.
- A clean build takes about 40 seconds longer, since the `bundled` feature compiles SQLite from source.
- CSV output stays available as the subcommand `plotwatch export`.
- An index file per month over the CSV files was set aside, since a query would still open every file of its range.
