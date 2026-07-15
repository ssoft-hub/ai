---
name: deprecation-and-migration
version: "1.0.0"
description: Apply when retiring a public API, planning a breaking change, or writing a migration guide
license: Unlicense
metadata:
  author: ssoft
  tags:
    - api
    - migration
---

# Skill: Deprecation and Migration

Apply when retiring a public API, planning a breaking change, or writing a migration
guide for consumers moving off one.

- What counts as a breaking change and the version bump it requires → `api-design`
  skill (Breaking Changes section) — this skill covers the deprecation-to-removal
  process around that change, not the definition of "breaking" itself.
- The version bump and changelog mechanics of shipping the removal →
  `release`/`changelog` skills.
- A security vulnerability that forces retiring an unsafe API path →
  `security-and-hardening` skill for diagnosing the vulnerability; this skill for
  retiring the path itself.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own deprecation policy, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Why Announcing Isn't Enough

With enough consumers, every observable behavior of a public symbol becomes depended
on — including behavior never documented as a guarantee (this is Hyrum's Law). That is
why deprecation needs active migration support, not just an announcement: a consumer
can't "just switch" to a replacement that doesn't reproduce a behavior they happened to
rely on, even one this repo never promised.

## Deprecate Before Removing

Do not remove a public symbol in the same release that first marks it deprecated,
except when forced by an active security vulnerability. Consumers need a release where
the deprecation is visible (`[[deprecated("use X instead")]]`, a changelog entry) before
the removal release actually breaks their build.

## Compulsory vs Advisory

Default to **advisory**: consumers migrate on their own timeline, the deprecated path
keeps working with no fixed removal date. Reserve **compulsory** deprecation — a hard
removal date — for cases where leaving the old path in place carries its own cost that
justifies forcing the migration (an active security vulnerability, a maintenance burden
that has become unsustainable). Compulsory deprecation still requires providing a
migration guide and tooling; a deadline with no migration path is not a deprecation
policy, it's an ultimatum.

## State the Replacement, Not Just the Removal

A deprecation notice that says what's going away without saying what to use instead
forces every consumer to independently rediscover the replacement. Every deprecation
message and changelog entry names the replacement API or explicitly states there isn't
one and why.

```cpp
// Wrong: says what's gone, not what to do
[[deprecated]] void open(bool read_only);

// Correct: names the replacement
[[deprecated("use open(OpenMode) instead")]] void open(bool read_only);
```

## Grace Period

State how long the deprecated path will keep working (a number of minor releases, or a
calendar date) at the time it's deprecated, not decided ad hoc when someone asks. A
grace period announced late is functionally no grace period for anyone who already read
the original notice and didn't act on a vague "eventually."

## Migration Guide

For any deprecation likely to require more than a mechanical find-replace, write a
migration guide covering: what changed and why, a before/after example for the common
case, and what silently changes behavior (not just signature) if anything does. A
migration guide that only shows the new signature, without a behavior diff, misses the
cases that compile after migration but behave differently.

## Coexistence During the Grace Period

The deprecated and replacement paths must both work correctly during the grace period —
a "deprecated" path that's already subtly broken to encourage migration is a support
burden disguised as an incentive; consumers who haven't migrated yet still depend on it
working.

## Internal vs Public Deprecation

Deprecating an internal-only symbol (not part of the public API per `api-design`) does
not need a grace period or migration guide — update every internal call site in the
same change. This skill's ceremony is proportional to how many consumers outside this
repo are affected.

## Migrating a Persisted Format (Expand/Contract)

A change to a persisted schema — a config file format, a serialized data layout, a
database table — is riskier than an API deprecation: data cannot be rolled back by
reverting a deploy the way code can. The failure mode is coupling the format change to
the code change that starts relying on it — during the rollout window, old and new code
run against the same data, and whichever one expects the other's shape breaks. Never
change a persisted field in place; migrate in additive phases so both old and new code
stay valid at every step:

```
EXPAND ──────────→ MIGRATE ──────────→ CONTRACT
add the new field,  backfill existing    once nothing reads the
optional, beside    records to carry     old field, drop it in a
the old one          both                later, separate change
```

Each phase ships and bakes independently before the next begins; a rename is an add
(expand) followed by a drop (contract) in a later change, never a single in-place edit.
Every migration needs a tested path backward, and a large backfill runs in batches
rather than as one operation that locks everything else out.

## Tracking Removal

Open an issue for the actual removal at the same time the deprecation ships, targeted
at the release where the grace period ends (`issue-rules` → Milestone), so the removal
isn't forgotten and doesn't slip indefinitely once the deprecation notice stops being
visible in day-to-day work.
