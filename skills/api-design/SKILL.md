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

- **Namespace hierarchy**: public symbols in consistent `lib::` or `lib::module::` namespace; check project `AGENTS.md` for exact namespace
- Identifier and comment language: follow project AGENTS.md

## Dependencies

- No runtime dependencies in public API
- No external headers in public API headers
- No compiler-specific extensions directly — abstract via macro or type_traits helpers
- Use C++ feature test macros for version/compiler guards:
  ```cpp
  #if defined(__cpp_concepts) && __cpp_concepts >= 202002L
  // concepts-based overload
  #endif
  ```

## Compatibility

- Target the minimum C++ standard the project declares (check `AGENTS.md`)
- No UB, no implementation-defined behaviour in public paths

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

- Template parameters: prefer full descriptive names (`ValueType`, `Executor`, `Allocator`); use short conventional names (`T`, `Iter`) only for generic algorithms
- **No `void*` in public API** — use templates, `std::any`, or `std::variant`

## Adding a New Header

1. Create the header at the path the project declares (check `AGENTS.md`)
2. Add `#pragma once` (classic headers) — C++20+ module projects use `export module <name>;` instead; the two are mutually exclusive
3. Add Doxygen `@defgroup` or `@ingroup` (see `doxygen` skill)
4. Add a test file alongside the implementation
