---
name: shipping-and-launch
version: "1.0.0"
description: Apply when preparing to ship a release to users, beyond the version-bump mechanics
license: Unlicense
metadata:
  author: ssoft
  tags:
    - release
    - operations
---

# Skill: Shipping and Launch

Apply when preparing to ship a release to users — the readiness, rollout, and rollback
concerns around a release, beyond the version-bump/changelog/tag mechanics already
covered by `release` skill. Use both together: `release` for the mechanical steps,
this skill for whether the release is actually safe to expose to users and how widely.

- Monitoring/alerting that must be in place before launch → `observability-and-instrumentation` skill.
- A breaking change being shipped → `deprecation-and-migration` skill for how it was
  telegraphed to consumers before this release.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own launch process, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Readiness Checklist

Before a release goes out, confirm:

- [ ] `release` skill's Pre-Release Checklist passes (version, changelog, CI green)
- [ ] Monitoring/alerting for the new or changed behavior is in place, not planned for
      after launch (`observability-and-instrumentation`)
- [ ] A rollback plan exists and has been exercised at least once (not just theorized)
- [ ] Any breaking change was already telegraphed per `deprecation-and-migration` — a
      launch is not the first time consumers hear about a break
- [ ] Whoever is on call during the launch window knows a release is happening

A release failing any of these is not blocked from being *built* — it's blocked from
being *exposed to users* until the gap is closed.

## Staged Rollout

Prefer exposing a risky change to a subset of traffic/users before full rollout —
percentage-based rollout, a canary environment, or an internal-only release first —
over an all-at-once release, when the blast radius of being wrong is large. Match the
rollout strategy to the actual risk: a low-risk documentation-only release doesn't need
a staged rollout; a change to a payment path does.

## Rollout Decision Thresholds

Decide the advance/hold/roll-back thresholds before the rollout starts, not by feel
once traffic is flowing — set them relative to a measured baseline, not an absolute
guess:

| Signal | Advance | Hold and investigate | Roll back |
|---|---|---|---|
| Error rate | within 10% of baseline | 10-100% above baseline | more than 2x baseline |
| p95 latency | within 20% of baseline | 20-50% above baseline | more than 50% above baseline |
| New error types | none | rare, low volume | appearing at meaningful volume |
| Business/behavior metric | neutral or better | small decline (may be noise) | clear decline |

Roll back immediately, without waiting for the next scheduled check-in, on: an error
rate more than 2x baseline, a severe latency regression, a data-integrity problem, or a
newly discovered security issue — these don't wait for the hold-and-investigate step.

## Rollback Plan

Before shipping, know how to undo it — which previous version to roll back to, whether
a data migration in this release is reversible, and how long rollback takes. A rollback
plan discovered under incident pressure is not a plan; if reverting is not
straightforward (irreversible migration, external side effects), say so explicitly
before launch, not after something goes wrong.

## Feature Flags

For a change too risky to expose to everyone at once but also not practical to hold in
a long-lived branch, ship it behind a flag defaulted off, enable it gradually, and
remove the flag once the change is fully rolled out and stable — a flag left in
indefinitely after full rollout is dead configuration surface, not a safety net anymore.

## Communication

Tell whoever needs to know before it happens, not after: consumers affected by a
breaking change (`deprecation-and-migration`), on-call/support if user-facing behavior
changes, and anyone depending on a deprecated path reaching its removal release. A
launch that surprises the people who have to support it is a process failure even if
the code itself is correct.

## Post-Launch Verification

After a release goes out, confirm — using the monitoring set up in the readiness
checklist, not by assuming — that it behaves as expected under real traffic for a
defined window before considering the launch complete. "It built and deployed" is not
the same claim as "it works in production."
