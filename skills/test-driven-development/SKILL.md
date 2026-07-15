---
name: test-driven-development
version: "1.0.0"
description: Apply when implementing a feature or bug fix, before writing implementation code
license: Unlicense
metadata:
  author: ssoft
  tags:
    - testing
    - workflow
---

# Skill: Test-Driven Development

Apply when implementing a feature or bug fix, before writing implementation code. This
skill governs the order of work — red, green, refactor. Test structure, naming, and
coverage rules → `cpp-testing` skill.

- Reproducing a bug as a failing test before fixing it → `debugging` skill (Regression Test First).
- Once tests are green and the implementation stands, reviewing it → `code-review-and-quality` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own testing workflow, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## The Loop

1. **Red** — write a test for the next small behavior, run it, watch it fail. A test
   that passes before the implementation exists is testing nothing — it proves the test
   itself is wrong, not that the feature works.
2. **Green** — write the minimum implementation that makes the test pass. Do not
   implement behavior the current test doesn't require yet; that comes in its own
   red step.
3. **Refactor** — with tests green, clean up duplication or naming introduced by the
   minimal implementation, re-running tests after each change. Never refactor with a
   failing test in the suite — a failing baseline makes it impossible to tell whether
   a refactor broke something.

Repeat in small increments. A "red" step that requires ten new tests before anything
passes again is too large a step — split it.

## Why Test First, Not Test After

A test written after the implementation tends to confirm what the code already does,
including its bugs — the author unconsciously writes the assertion to match the
observed behavior. A test written first specifies the intended behavior independently,
so it can catch the implementation being wrong, not just being different.

## One Behavior Per Red Step

Each red-green cycle targets one new behavior or boundary case, matching `cpp-testing`'s
"One Reason to Fail" rule. Do not write five tests up front and then implement until all
five pass — that reintroduces the "test after" problem for tests 2 through 5, which sit
red for longer than necessary and stop guiding the implementation step by step.

## Minimal Implementation

"Minimum to pass" does not mean hardcoding the expected output — it means the simplest
general logic that satisfies the test without anticipating requirements no test has
demanded yet. If the minimal-looking implementation is suspicious (e.g. `return 42;`),
the next red step should add a test that forces generalization.

- Bad: implementing configurable retry, backoff, and logging because the ticket
  mentions them, before any test requires the specific behavior
- Good: implementing exactly what the current failing test requires, adding the next
  test before adding the next behavior

## Refactor Is Not Optional

Skipping refactor because "it works" accumulates the duplication and awkward naming
that minimal implementations produce step by step. Refactor after every green, even
when the change is small — a green suite is the only safe time to do it.

## Prefer the Real Thing Over a Test Double

When a red step needs a collaborator that isn't the unit under test, reach for the
least artificial option that keeps the test fast and deterministic, in this order: the
real implementation, then an in-memory fake, then a stub returning canned data, and
only last a mock that asserts *which* calls were made. A test built around call-sequence
assertions breaks the moment the implementation is refactored, even when the observable
behavior hasn't changed — assert on outcomes, not on how the outcome was reached. Reach
for a mock only when the real collaborator is slow, non-deterministic, or has a side
effect the test can't afford (see `cpp-testing` → Unit Test Scope for what that excludes
at the unit-test boundary).

## When TDD Doesn't Fit

Exploratory spikes, throwaway prototypes, and pure UI/layout work where behavior isn't
yet known are not test-first — write the test once the intended behavior is decided,
before that code is treated as production. Do not retrofit tests after the fact and
call it TDD; that's `cpp-testing` coverage applied after the code was already written,
which is a legitimate but different practice.
