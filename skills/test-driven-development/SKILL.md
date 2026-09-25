---
name: test-driven-development
version: "1.0.0"
description: Apply when implementing a feature or bug fix, before writing implementation code
license: Unlicense
metadata:
  author: ssoft
  tier: process
  bound-to:
    - universal
  tags:
    - testing
    - workflow
---

# Skill: Test-Driven Development

Apply when implementing a feature or bug fix, before writing implementation code. This
skill governs the order of work — fail, pass, refactor.

- The level a test sits at, its layout, its data, its determinism, and the mutation check on a passing test → `testing` skill.
- Reproducing a bug as a failing test before fixing it → `debugging` skill (Regression Test First).
- Once the tests pass and the implementation stands, reviewing it → `code-review-and-quality` skill.

## The Loop

1. **Fail** — write a test for the next small behavior, run it, watch it fail. A test
   that passes before the implementation exists is a defect of that test.
2. **Pass** — write the minimum implementation that makes the test pass. Do not
   implement behavior the current test doesn't require yet; that comes in its own
   fail step.
3. **Refactor** — with the tests passing, clean up duplication or naming introduced
   by the minimal implementation, re-running tests after each change. Never refactor
   with a failing test in the suite.

Repeat in small increments. A fail step that requires ten new tests before anything
passes again is too large a step — split it.

## One Behavior Per Fail Step

Each fail-pass cycle targets one new behavior or boundary case, matching `testing` → The
Shape of a Test. Do not write five tests up front and then implement
until all five pass.

## Minimal Implementation

"Minimum to pass" does not mean hardcoding the expected output — it means the simplest
general logic that satisfies the test without anticipating requirements no test has
demanded yet. If the minimal-looking implementation is suspicious (e.g. `return 42;`),
the next fail step should add a test that forces generalization.

- Bad: implementing configurable retry, backoff, and logging because the ticket
  mentions them, before any test requires the specific behavior
- Good: implementing exactly what the current failing test requires, adding the next
  test before adding the next behavior

## Refactor Is Not Optional

Refactor after every pass step, even when the change is small.

## Prefer the Real Thing Over a Test Double

When a fail step needs a collaborator that isn't the unit under test, reach for the
least artificial option that keeps the test fast and deterministic, in this order: the
real implementation, then an in-memory fake, then a stub returning canned data, and
only last a mock that asserts *which* calls were made. Reach for a mock only when the
real collaborator is slow, non-deterministic, or has a side effect the test can't
afford — what that excludes at the unit-test boundary is `testing` → Levels of
Verification.

## When TDD Doesn't Fit

Exploratory spikes, throwaway prototypes, and pure UI/layout work where behavior isn't
yet known are not test-first — write the test once the intended behavior is decided,
before that code is treated as production. Do not retrofit tests after the fact and
call it TDD; that is the coverage `testing` and the testing skill of the language being
written ask for, applied after the code was already written, which is a legitimate but
different practice.
