---
name: ci-cd-and-automation
version: "1.0.0"
description: Apply when designing or reviewing a CI/CD pipeline, build automation, or a quality gate
license: Unlicense
metadata:
  author: ssoft
  tags:
    - ci
    - automation
---

# Skill: CI/CD and Automation

Apply when designing or reviewing a CI/CD pipeline, build automation, or a quality gate
that decides whether a change can merge or ship.

- The specific checks a gate should run (lint, format, static analysis) are project- and
  language-specific → `cpp-coding`/`hook-scripts` and the project's `AGENTS.md`.
- Merge itself is still gated on the Pre-Open/Pre-Merge Checklists → `pr-rules` skill;
  this skill is about the pipeline that produces the "CI green" signal those checklists
  require.
- Release tagging and version bump automation → `release` skill.
- Secrets used by pipeline jobs (deploy keys, tokens) → `security-and-hardening` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own CI/CD stack and gates, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## What a Pipeline Should Gate

Every change that can merge or ship should pass, at minimum: build, test suite,
lint/format, and any static analysis the project declares. A gate that's easy to bypass
(a flag, a manual override used routinely) is not a gate — it's documentation of intent.

## Reproducible Locally

A developer should be able to run the same checks the pipeline runs, locally, and get
the same result — a check that only exists in CI and can't be reproduced locally forces
a slow push-and-wait debugging loop for anything that fails there. Prefer a single script
or command both the pipeline and a developer invoke (see this repo's own
`npm test` / `hooks/git/pre-commit` as an example of the pattern).

## Fast Feedback First

Order pipeline stages from fastest/cheapest to slowest/most expensive (lint before
build, unit tests before integration tests, single-platform build before the full
matrix) so a broken change fails in seconds, not after a 20-minute matrix build.

## Matrix Coverage

Run the test matrix across every combination the project actually ships to (compiler
versions, OS, architecture) — see this repo's own workflow (`.github/workflows/`) running
`npm test` on multiple Node versions as a minimal example. A matrix entry that's
perpetually red and ignored is worse than not having it — either fix it or remove it.

## What Blocks vs What Warns

Distinguish a hard gate (build failure, test failure, lint error) from a warning
(coverage dipped slightly, a non-critical static-analysis note) explicitly in the
pipeline configuration. A pipeline where warnings and failures look the same in the UI
trains contributors to ignore both.

## Secrets in Pipelines

Pipeline credentials (deploy keys, registry tokens, signing keys) follow
`security-and-hardening`'s least-privilege rule: scope each credential to exactly the
job that needs it, never share one broad credential across every job in the pipeline.

## Flaky Checks

A check that fails intermittently without a code change is a defect in the check, not
noise to route around with retries-until-green. Quarantine it (mark known-flaky,
tracked with an issue) rather than letting an intermittent red build normalize ignoring
CI failures generally.

## Feeding a Pipeline Failure Back to an Agent

When CI fails under an agent-driven workflow, feed the agent the specific failure
output — not just "CI failed" — and let it apply `debugging` to root-cause it before
pushing again: a lint failure gets auto-fixed and re-run, a type/compile error gets
traced to its cited location, a test failure goes through the full debugging skill, not
a guess. Re-pushing without first reproducing the failure locally just moves the same
guess-and-check loop into the pipeline, which is slower per iteration than reproducing
it locally first.

## Keeping the Pipeline Fast

Once a pipeline exceeds a comfortable wait (rule of thumb: ~10 minutes), apply these in
order of impact before adding more hardware: cache dependencies between runs; split
independent checks (lint, build, test) into parallel jobs instead of one long sequential
job; skip jobs a change can't affect (e.g. skip a full matrix build for a docs-only
change); shard a large test suite across runners; move slow, non-blocking checks to a
scheduled run instead of every push. Reach for a larger/faster runner last — it hides
the cost instead of removing it.

## Someone Owns a Red Build

When the pipeline breaks on the shared branch, whoever is responsible for keeping it
green (not necessarily whoever caused it) fixes or reverts immediately — waiting for the
original author, or assuming someone else will handle it, lets a broken baseline
accumulate further broken changes on top of it.

## Automation Beyond CI

The same "reproducible, fast-feedback, explicit gate" principles apply to any automated
check that gates a workflow — this repo's own `PreToolUse`/`PostToolUse` hooks (see
`hook-scripts` skill) are automation in this same sense, just running locally instead of
in a remote pipeline.
