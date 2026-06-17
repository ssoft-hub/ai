---
name: api-design
version: "1.0.0"
description: Apply when designing new API, adding public headers, or reviewing public interface
license: Unlicense
metadata:
  author: ssoft
  tags:
    - cpp
    - api
---

# Skill: C++ API Design

Apply when designing new API, adding public headers, or reviewing public interface changes.

## Structural Rules

- **Namespace hierarchy**: public symbols in consistent `lib::` or `lib::module::` namespace; check project `AGENTS.md` for exact namespace.
  **Why:** a consumer including the library should be able to predict where a symbol lives without grepping — inconsistent namespacing forces them to search instead of guess.
- Identifier and comment language: follow project AGENTS.md

## Dependencies

- **No runtime dependencies in public API.** A public header that pulls in a third-party type leaks that dependency to every consumer — they now need it on their include path too, and an upgrade on either side can break the other.
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

Breaking change = removing or renaming any public symbol, or changing its observable behaviour.
- Requires `MAJOR` version bump (semver)
- Document in `CHANGELOG.md` under `### Removed` or `### Changed`
- Prefer deprecation (`[[deprecated("use X instead")]]`) before removal
- Avoid unless necessary

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
2. Add `#pragma once` (classic headers) — C++20+ module projects use `export module <name>;` instead; the two are mutually exclusive
3. Add Doxygen `@defgroup` or `@ingroup` (see `doxygen` skill)
4. Add a test file alongside the implementation
