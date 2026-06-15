---
name: cpp-coding
version: "1.0.0"
description: Apply when writing or reviewing C++ implementation code
license: Unlicense
metadata:
  author: ssoft
  tags:
    - cpp
    - coding
---

# Skill: C++ Coding

Apply when writing or reviewing C++ implementation code.

Scope: project-level implementation conventions (not the C++ standard). Public API structure → `api-design`. Docs → `doxygen`. Naming, namespaces, file layout → project `AGENTS.md`.

Reference: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-philosophy

## Philosophy

- **Value semantics over pointers** — prefer values and move semantics; use references for observation, not ownership
- **Types express invariants** — make illegal states unrepresentable through the type system
- **Express ideas directly in code** — types must carry meaning:
  ```cpp
  Month month() const;  // correct — type expresses intent
  int   month() const;  // wrong   — caller must guess the unit
  ```
- **Local type aliases** — every type in a class's public interface must have a local alias:
  ```cpp
  using Counter         = int;
  using OptionalCounter = ::std::optional<Counter>;
  using Expected        = ::std::expected<Counter, ::std::error_code>;
  // use OptionalCounter everywhere — not std::optional<int>
  ```
- **Const by default** — declare everything `const` unless mutation is required
- **Composition over inheritance** — use virtual/inheritance only for runtime polymorphism

## Performance

Performance is a primary concern, not an afterthought.

- **Avoid unnecessary copies** — pass by `const&`, return by value with NRVO/move, apply `::std::move` on the last use of a named local
- **Prefer views over materialisation** — `::std::span`, `::std::string_view`, `::std::ranges::views::*` instead of allocating intermediate containers
- **Lazy algorithms** — compose `::std::ranges::views::filter` / `transform` / `take` / `drop` pipelines that defer work until consumed
- **Reserve capacity** — `vector::reserve` / `string::reserve` when the final size is known or bounded
- **Hot-path discipline** — no allocations in tight loops; prefer stack buffers and small-buffer-optimised types

## Include Order

Applies to `.cpp` / `.cc` files. Alphabetical within each group.

```cpp
// 1. Same-named own header — ""
#include "foo.h"

// 2. All project and 3rdparty API headers — <> even from the same repo
#include <bar/baz.h>
#include <qux/qux.h>

// 3. Standard library — <>
#include <optional>
#include <vector>

// 4. Private / implementation-detail headers — ""
#include "detail/foo_impl.h"
#include "foo_detail.h"

// 5. Export / DLL-visibility macro header — last, "", separate group
#include "export.h"
```

In public API headers: include only what the header directly uses.

## Header Guards

Every header file starts with `#pragma once` before any other content.

## Type Safety

- `enum class` not plain `enum` — scoped, no implicit conversion to `int`; if C compatibility is required, declare outside class scope and document why
- `nullptr` not `NULL` or `0`
- Explicit casts only: `static_cast`, `reinterpret_cast`, `const_cast` — no C-style `(T)x`
- No `dynamic_cast` — redesign with virtual dispatch or `::std::variant`/`::std::visit`
- Prefer smart wrapper types over raw pointers: `::std::reference_wrapper`, `::std::polymorphic`, `::std::indirect`, or custom RAII types

## Resource Management

- No naked `new` / `delete` — RAII only
- `std::unique_ptr` by default; `std::shared_ptr` only when multiple owners required
- RAII wrappers for all OS handles (file descriptors, sockets, mutexes, etc.)
- Prefer smart wrappers (`reference_wrapper`, `polymorphic`, `indirect`, custom) over raw pointer members
- No mutable global state

## Function Qualifiers

- `const` on member functions that do not mutate observable state
- `noexcept` on functions that cannot throw; compute it where correct:
  ```cpp
  void swap(Foo& other) noexcept(noexcept(::std::swap(value_, other.value_)));
  ```
- `constexpr` on functions where compile-time evaluation is possible
- `explicit` on single-argument constructors and conversion operators

## Attributes

Standard attributes — apply where appropriate:

| Attribute | When |
|-----------|------|
| `[[nodiscard("reason")]]` | Return value must not be discarded (error codes, resources) |
| `[[maybe_unused]]` | Parameter or variable intentionally unused |
| `[[likely]]` / `[[unlikely]]` | Branch probability hint for hot paths |
| `[[deprecated("use X")]]` | Mark obsolete API before removal |

Library and project attribute macros (e.g. `Q_INVOKABLE`, `MY_LIB_EXPORT`, `BOOST_FORCEINLINE`) follow the same discipline: use only those declared in the project; document the full set in `AGENTS.md`.

## Modern Idioms

- Range-for over index loops when the index is not needed
- Structured bindings for pairs and tuples: `auto [key, val] = ...`
- `auto` preferred — use freely; avoid only when the type name itself carries important semantic intent
- `if constexpr` instead of SFINAE for compile-time branching
- `::std::move` — apply on the last use of a named object being passed or returned
- Prefer `::std::ranges::` algorithms over raw iterator pairs
