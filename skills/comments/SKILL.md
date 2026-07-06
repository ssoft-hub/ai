---
name: comments
version: "1.0.0"
description: Apply when writing or reviewing non-Doxygen code comments (inline notes, implementation comments)
license: Unlicense
metadata:
  author: ssoft
  tags:
    - cpp
    - comments
    - style
---

# Skill: Code Comments

Apply when writing or reviewing non-Doxygen code comments (inline notes, implementation comments).

Doc comments on public headers → `doxygen` skill. This skill covers everything else: comments inside function bodies, `.cpp` files, private implementation.

---

## Philosophy

Code documents itself. A comment is a fallback for what naming, structure, and types cannot express — not a first resort.

- **Write a comment only when actually required** — first try to make the code self-explanatory (better names, extracted function, clearer types). If that succeeds, no comment is needed.
- **Keep it short** — one line. No multi-line prose blocks outside Doxygen.
- **General character, not case history** — state a timeless fact about the code (an invariant, a constraint, a non-obvious reason), not the story of how it got that way.

## When a Comment Is Justified

Only for something the code cannot say itself:
- A hidden constraint or external requirement (e.g., a protocol quirk, a platform limitation)
- A subtle invariant the reader could otherwise break by "simplifying"
- A workaround, stated in general terms (what breaks and why), not as a changelog entry
- Behavior that would genuinely surprise a careful reader

## What Never Belongs in a Comment

- **References to the current task, ticket, bug ID, or "just fixed"** — that belongs in the commit message, not the code. A comment describing the fix for an error introduced moments ago is a diary entry, not documentation, and it rots the moment the surrounding code changes again.
- **What the code already says** — if removing the comment loses no information, delete it.
- **Narration of a specific decision's private context** ("we chose X because the other team asked", "temporary until Y ships") — write the general constraint instead, or put case-specific context in the commit message / PR description.
- **Multi-paragraph explanations** — a sign the design needs fixing: extract the invariant into a named function or type instead of writing a wall of prose around it.

```cpp
// Wrong — narrates a private fix history, will rot, belongs in commit message
// Fixed crash reported in issue #482: connection was null after close.
if (connection == nullptr) return;

// Correct — general, timeless fact about the code
// Upstream API returns null once the connection is closed.
if (connection == nullptr) return;
```

## Cross-References

- `commit-rules` — where task/fix/ticket context actually belongs
