---
name: ci-cd-and-automation
version: "1.0.0"
description: Apply when designing or reviewing a CI/CD pipeline, build automation, or a quality gate
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - universal
  tags:
    - ci
    - automation
---

# Skill: CI/CD and Automation

Apply when designing or reviewing a CI/CD pipeline, build automation, or a quality gate
that decides whether a change can merge or ship.

- The specific checks a gate should run (lint, format, static analysis) are project- and
  language-specific → the coding-conventions skill of the language being written, the
  hook-script skill of the agent tool, and the checks the project itself declares.
- Merge itself is still gated on the Pre-Merge Checklist → `pr-rules` skill; this skill is
  about the pipeline that produces the checks-passed signal that checklist requires.
- Release tagging and version bump automation → `release` skill.
- Secrets used by pipeline jobs (deploy keys, tokens) → `security-and-hardening` skill.

## What a Pipeline Should Gate

Every change that can merge or ship should pass, at minimum: build, test suite,
lint/format, and any static analysis the project declares. The gate should admit no
routinely used bypass, neither a flag nor a manual override.

## Reproducible Locally

A developer should be able to run the same checks the pipeline runs, locally, and get
the same result. Prefer a single script or command both the pipeline and a developer
invoke.

## Fast Feedback First

Order pipeline stages from fastest/cheapest to slowest/most expensive: lint before build,
then each level `testing` → Levels of Verification defines, cheapest first, and a
single-platform build before the full matrix.

A stage should launch its independent jobs at once by default. Which jobs qualify, what
bounds the degree, and how the launch squares with the ordering above are stated in
`project-planning` → Running Independent Work in Parallel.

## Matrix Coverage

Run the test matrix across every combination the project actually ships to (compiler
versions, OS, architecture). The project should fix or remove a matrix entry that stays
failing and ignored.

## What Blocks vs What Warns

Distinguish a hard gate (build failure, test failure, lint error) from a warning
(coverage dipped slightly, a non-critical static-analysis note) explicitly in the
pipeline configuration.

## Secrets in Pipelines

Pipeline credentials (deploy keys, registry tokens, signing keys) follow
`security-and-hardening`'s least-privilege rule: scope each credential to exactly the
job that needs it, never share one broad credential across every job in the pipeline.

## Flaky Checks

A check whose verdict differs between runs of one commit on one platform, a test
included, is a defect of that check. The project should fix it, remove it, or disable it
under an issue naming it, and should not re-run it until it passes, by hand or by a
configured retry.

A verdict differing between the platforms the project supports should be investigated
under `debugging` first. It is a defect of the check only where its assertion rests on a
value the language or the platform leaves to the implementation:
`testing` → No Assertion on an Implementation-Defined Value.

## Feeding a Pipeline Failure Back to an Agent

When CI fails under an agent-driven workflow, feed the agent the specific failure
output — not just "CI failed" — and let it apply `debugging` to root-cause it before
pushing again: a lint failure gets auto-fixed and re-run, a type/compile error gets
traced to its cited location, a test failure goes through the full debugging skill, not
a guess. The agent should reproduce the failure locally before pushing again.

## Keeping the Pipeline Fast

Once a pipeline exceeds a comfortable wait (rule of thumb: ~10 minutes), apply these in
order of impact before adding more hardware: cache dependencies between runs; skip jobs a
change can't affect (e.g. skip a full matrix build for a docs-only change); shard a large
test suite across runners; move slow, non-blocking checks to a scheduled run instead of
every push. Reach for a larger/faster runner last.

## Someone Owns a Failing Build

When the pipeline breaks on the shared branch, whoever is responsible for keeping it
passing (not necessarily whoever caused it) fixes or reverts immediately.

## Automation Beyond CI

The same "reproducible, fast-feedback, explicit gate" principles apply to any automated
check that gates a workflow, an agent's own hooks included (the hook-script skill of the
agent tool).
