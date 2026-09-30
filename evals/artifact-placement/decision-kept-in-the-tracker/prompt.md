---
max_turns: 6
allowed_tools: [Skill]
---

`plotwatch` is a Rust command-line tool that ingests readings from greenhouse sensors and answers queries over them, kept by three maintainers in its own repository holding `src/`, `Cargo.toml`, a `README.md` and a `CONTRIBUTING.md`. The `CONTRIBUTING.md` reads in full:

> Commits follow Conventional Commits. Every change goes through a pull request reviewed by one maintainer, with `cargo clippy` and `cargo test` passing. An architectural decision is recorded as an issue in the project's issue tracker, carrying the label `decision`, and the pull request making the change links that issue.

Until now the tool has written one CSV file per day of readings. The maintainers have settled on one SQLite database instead, reached through the crate `rusqlite` with its `bundled` feature: a query over a month no longer opens thirty files, a reader runs beside the ingesting process under WAL mode, and a backup is one file. The `bundled` feature compiles SQLite from source, which adds about 40 seconds to a clean build, and CSV output stays available as the subcommand `plotwatch export`. Keeping the CSV files and adding an index file per month was set aside, since a query would still open every file of its range. The maintainers count the choice as an architectural decision.

Write the decision record for this choice, and say where it goes. The repository is not checked out in this session; work from this description.
