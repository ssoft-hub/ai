---
name: doxygen
version: "1.0.0"
description: Apply when adding or modifying Doxygen comments for public C++ headers
license: Unlicense
metadata:
  author: ssoft
  tags:
    - cpp
    - doxygen
    - docs
---

# Skill: Doxygen

Apply when documenting public C++ headers.

Header structure, namespace rules, `#pragma once` → `api-design` / `cpp-coding` skills.
Non-Doxygen implementation comments → `comments` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own documentation conventions, follow those instead. This skill is the fallback for projects that do not specify their own.

## Core Rule — document the type, not its members

One Doxygen block sits **on the type declaration** — the class, struct, or enum. Its **members** (methods, fields, enum values) carry **no** Doxygen: clear names and types speak for them. "Clean" means a clean body, not an undocumented type.

- **The type block** — `@brief`, `@ingroup`, and `@tparam` for templates — sits directly above the declaration.
- **Members get nothing.** No `///` on any method, field, or enumerator.
- Keep the header block short. Longer type-level prose (invariants, algorithm, examples, `@note` / `@warning`) can move to the `.cpp` to keep the header lean — see Placement.

## Placement

- **Type block → on the declaration** in the header:
   ```cpp
   /// @brief Fixed-capacity single-producer/single-consumer ring buffer
   /// @ingroup mylib_containers
   /// @tparam T element type
   template <class T>
   class RingBuffer { /* members: no Doxygen */ };
   ```
- **Longer type-level prose → the `.cpp`.** Attach it to the type from another file with an explicit `@class` / `@struct` / `@enum`, so the header keeps only `@brief` + tags:
   ```cpp
   // ring_buffer.cpp — @brief/@ingroup stay on the declaration; add prose only
   /**
    * @class mylib::RingBuffer
    *
    * Lock-free for one producer and one consumer. push/pop return false
    * when full/empty instead of blocking.
    */
   ```
- **Special case — no public declaration to hang the block on.** The real type lives in `detail` and the public API is a `using` alias. Document the alias with a `#ifdef DOXYGEN` guard (or the `@class` form above):
   ```cpp
   namespace mylib::detail { template <class T> class WidgetImpl; }
   namespace mylib { using Widget = detail::WidgetImpl<int>; }

   #ifdef DOXYGEN
   /// @class mylib::Widget
   /// @brief Owning handle to a rendered widget
   /// @ingroup mylib_core
   #endif
   ```
   The guard needs Doxyfile support so only Doxygen sees the block:
   `ENABLE_PREPROCESSING = YES` (default) plus `PREDEFINED = DOXYGEN`. The compiler and cppcheck run with `DOXYGEN` undefined (cppcheck via `-UDOXYGEN`) and skip it.

## Required tags

On the type block:

| Tag | When |
|-----|------|
| `@brief` | Always — one line, no trailing period |
| `@ingroup GroupId` | Always — links the type to its group |
| `@tparam Name` | Each template parameter of a class template |
| `@class` / `@struct` / `@enum` `Qualified::Name` | Only when the block is detached from the declaration (`.cpp` or guarded) — it must name its target |

Free functions are documented on their own declaration and add `@param` / `@return`; omit `@return` for `void`. Optional: `@note`, `@warning`, `@pre`, `@post`, `@see`.

## Group System

Define groups in the module header:
```cpp
/// @defgroup mylib_containers Containers
/// @ingroup mylib
```
Every documented type declares `@ingroup`.

## Style Rules

- Language: follow the project's `AGENTS.md`
- Document the CONTRACT of the type, not its implementation
- `@brief` is one line, no period at the end
- Never document a member — if you are writing `///` on a method or field, delete it

## What to Skip

- Private / `detail` entities (inside `detail/` or `namespace detail`)
- Internal macros not part of the public API
- Per-member documentation — never write it
