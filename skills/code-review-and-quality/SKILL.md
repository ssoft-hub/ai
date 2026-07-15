---
name: code-review-and-quality
version: "1.0.0"
description: Apply when reviewing code changes for correctness, readability, architecture, security, and performance
license: Unlicense
metadata:
  author: ssoft
  tags:
    - review
    - quality
---

# Skill: Code Review and Quality

Apply when reviewing code changes for correctness, readability, architecture, security,
and performance. This skill covers the substance of a review — what to look for. Process
around opening/merging the PR the review attaches to → `pr-rules` skill.

- Public API shape and breaking-change review → `api-design` skill.
- Access-specifier and encapsulation review → `encapsulation` skill.
- Security-specific review depth (auth, input validation, secrets) → `security-and-hardening` skill.
- Performance-specific review depth (complexity, allocations) → `performance-optimization` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own review criteria, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Review Axes

Every review checks these, in this order — a change that fails an earlier axis is not
worth reviewing on a later one (a beautifully readable function that's wrong is still
wrong):

| Axis | Question |
|------|----------|
| Correctness | Does it do what it claims, including edge cases and error paths? |
| Readability | Can a reader not familiar with this change follow it without asking the author? |
| Architecture fit | Does it belong where it is, or does it leak a concern into the wrong layer/module? |
| Security | Does it trust input, environment, or a caller it shouldn't? |
| Performance | Does it introduce a cost (allocation, copy, O(n²)) disproportionate to what it does? |

## Correctness

- Trace at least one success path and one failure path by hand — don't just read that a
  `try`/`catch` exists, check what happens inside it.
- Check every changed boundary condition against `cpp-testing`'s Boundary Cases table —
  a review that doesn't check for off-by-one/empty/null is incomplete.
- A bug fix without a regression test (`debugging` → Regression Test First) is not done,
  regardless of how correct the fix looks by inspection.

## Readability

- Naming should make the reviewer's next question unnecessary — if a comment is needed
  to explain what a variable holds, the name is wrong (see `comments` skill).
- A function doing more than one thing at one level of abstraction is a readability
  defect, not just a style preference — it hides which of the several things broke.
- Flag surprising control flow (early returns buried in the middle of a long function,
  deeply nested conditionals) even when the logic is technically correct.

## Architecture Fit

- Check whether the change adds a new responsibility to an existing type/module or
  introduces a new one — see `ddd` and `architecture` for where a concept belongs.
- A change that's correct in isolation but duplicates logic that already exists
  elsewhere in the codebase is still a defect — point at the existing implementation.
- Prefer reuse of an existing abstraction over a parallel one, unless the existing one
  would need to be distorted to fit — a distorted abstraction is worse than a new one.

## Security

- Any input crossing a trust boundary (user input, network, file, subprocess argument)
  gets checked against `security-and-hardening` before anything else in the diff.
- Secrets, credentials, or tokens appearing in code, logs, or test fixtures block the
  review regardless of how minor the rest of the change is.

## Change Size

A review's reliability drops as diff size grows — a reviewer skims rather than traces
past a certain size. As a rough signal: under ~100 changed lines is comfortably
reviewable in one pass; ~300 is acceptable for a single logical change; past ~1000,
split it (see `pr-rules` → PR Size). Watch total file size too, not just the diff — a
small addition that pushes an already-large file further past a healthy size is a
decomposition opportunity, not something to wave through because the diff itself is
small.

## Dependency Changes

Review a version bump with the same rigor as a code change, since it *is* one:

- Read the changelog for the new version, not just the version number — semver is a
  convention the maintainer may not have followed exactly, and even a patch bump can
  carry a behavioral change.
- One dependency per change. A bundled "bump everything" change that breaks something
  afterward leaves no way to tell which package caused it.
- Review the lockfile diff, not just the manifest — most of what actually changes is
  transitive, and that's exactly what a human skim of the manifest alone would miss.

## Now-Orphaned Code

After a change removes the last caller of a function, type, or constant, check whether
anything is now unreachable. Point it out explicitly rather than letting it linger — a
change that leaves dead code behind isn't finished, even if what it added is correct.

## Performance

- A change on a hot path (per-request, per-frame, per-iteration of a large loop) gets
  checked for unnecessary allocation/copy before merge — see `performance-optimization`.
- Do not request a performance change on a cold path without measurement — an
  unmeasured "this could be faster" comment is a nitpick, not a blocker.

## Giving Feedback

- State the problem and the concrete fix, not just the problem — "this can be null"
  without "add a check before line N" leaves the author to reconstruct the fix.
- Distinguish a blocking issue from a suggestion explicitly (e.g. "blocking:" vs
  "nit:") — an author should not have to guess which comments gate merge.
- Review the diff for what it claims to do, not for what you would have done instead —
  a differently-shaped but equally correct approach is not a review finding.

## When to Approve

Approve when every blocking finding on the axes above is resolved. Outstanding nits do
not block approval unless the author explicitly asked for a full pass before merge.
