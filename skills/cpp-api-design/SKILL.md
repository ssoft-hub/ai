---
name: cpp-api-design
version: "1.0.0"
description: Apply when designing a new C++ API, adding public C++ headers, or reviewing a public C++ interface
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  paths:
    - "**/*.h"
    - "**/*.hpp"
  tags:
    - cpp
    - api
---

# Skill: C++ API Design

Apply when designing a new C++ API, adding public C++ headers, or reviewing public C++ interface changes.

## Structural Rules

- **Namespace hierarchy**: public symbols in consistent `lib::` or `lib::module::` namespace; check project `AGENTS.md` for exact namespace.
  **Why:** a consumer including the library should be able to predict where a symbol lives without grepping — inconsistent namespacing forces them to search instead of guess.
- Identifier language: follow project `AGENTS.md` — comment language belongs to
  `cpp-doxygen` (documentation) and `comments` (everything else)

## Dependencies

- **No runtime dependencies in public API.** Whether a reuse may expose a third-party type across a public boundary at all → `architecture` skill, Common Tradeoff Axes → Build vs buy/reuse. What C++ adds is two costs no dependency manifest absorbs for the consumer: there is nothing for your header to declare the requirement in, so the consumer puts the third-party headers on its own include path by hand and the failure arrives as a compile error inside a header it did not write; and an upgrade on either side can break the other through link-time ABI and ODR breakage, which has no analogue where a stable module ABI carries the type across versions.
- **No external headers in public API headers.** Forward-declare or wrap; push the actual `#include` into the `.cpp` file. Keeps the dependency private to the implementation.
- **No compiler-specific extensions directly** — abstract via macro or type_traits helpers, so the header still compiles for consumers on a different compiler.
- Use C++ feature test macros for version/compiler guards:
  ```cpp
  #if defined(__cpp_concepts) && __cpp_concepts >= 202002L
  // concepts-based overload
  #endif
  ```

## Compatibility

- Target the minimum C++ standard the project declares (check `AGENTS.md`) — a public header compiled at a higher standard than the project promises silently breaks consumers stuck on the older one.
- No UB, no implementation-defined behaviour in public paths — these are exactly the bugs that only show up on the consumer's compiler/platform, not yours.

## Breaking Changes

Breaking change = removing or renaming any public symbol, or changing its observable
behaviour. This skill owns that definition; everything that follows from a change
meeting it is owned elsewhere:

- Avoid one unless it is necessary — an addition beside the existing symbol is almost
  always available.
- Retiring the old path (deprecate before removing, grace period, migration guide) →
  `deprecation-and-migration` skill.
- The version bump it forces → `release` skill → Step 1 — Decide Version.
- The entry announcing it → `changelog` skill.

## API Hygiene

- **No `bool` parameters in public API** — use `enum class` instead:
  ```cpp
  // Wrong: caller can't tell what true/false means at call site
  void open(bool read_only);
  open(true);

  // Correct: intent visible without reading declaration
  enum class OpenMode { ReadWrite, ReadOnly };
  void open(OpenMode mode);
  open(OpenMode::ReadOnly);
  ```
  Exception: predicates returning `bool` are fine — the rule applies to parameters, not return types.

- Template parameters: prefer full descriptive names (`ValueType`, `Executor`, `Allocator`); use short conventional names (`T`, `Iter`) only for generic algorithms.
  **Why:** a descriptive name doubles as documentation at the call site and in compiler errors; `T` only reads fine when the algorithm is generic enough that no more specific name would help.
- **No `void*` in public API** — use templates, `std::any`, or `std::variant`. A `void*` parameter erases the type at the boundary, so the compiler can no longer catch a caller passing the wrong thing — the bug surfaces at runtime, in the consumer's code, far from where it was introduced.

  ```cpp
  // Wrong: caller and callee must agree on the real type out-of-band
  void process(void* data, int type_tag);

  // Correct: type is part of the signature, checked at compile time
  template <typename T>
  void process(T data);
  // or, when the set of types is closed and known up front:
  void process(std::variant<Foo, Bar, Baz> data);
  ```

## Adding a New Header

1. Create the header at the path the project declares (check `AGENTS.md`)
2. Add the header guard (`cpp-coding` → Header Guards)
3. Add Doxygen `@defgroup` or `@ingroup` (see `cpp-doxygen` skill)
4. Add a test file alongside the implementation
