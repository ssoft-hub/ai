# Skill: Doxygen

Apply when adding or modifying public C++ headers.

Header structure, namespace rules, `#pragma once` → `api-design` skill.

## Coverage

Every public entity must have a Doxygen block:
classes, structs, functions, type aliases, variables, enums, enum values.

## Required Tags

| Tag | When |
|-----|------|
| `@brief` | Always — one-line description |
| `@tparam Name` | Each template parameter |
| `@param name` | Each function parameter |
| `@return` | Return value; omit for `void` |
| `@ingroup GroupId` | Every entity — links to its group |

Optional: `@note`, `@warning`, `@throws`, `@pre`, `@post`, `@see`.

## Group System

Define groups in the top-level module header or a dedicated group header:
```cpp
/// @defgroup MyLib_Hash Hash utilities
/// @ingroup MyLib
```

Wrap group members:
```cpp
/// @{
// ... entities with @ingroup MyLib_Hash ...
/// @}
```

Every entity must declare `@ingroup` even when wrapped in `@{` / `@}`.

## Style Rules

- Language: English only
- Document the CONTRACT, not the implementation
- `@brief` is one line — no period at end
- `@param` and `@tparam` descriptions: lowercase start, no period
- Align tag columns for readability when there are multiple params

## Example

```cpp
/// @defgroup MyLib_Hash Hash utilities
/// @ingroup MyLib
/// @{

/// @brief Computes FNV-1a 64-bit hash over a byte range
/// @ingroup MyLib_Hash
/// @tparam Iter  input iterator over byte-sized elements
/// @param  first begin of range
/// @param  last  end of range
/// @return 64-bit FNV-1a digest
template <typename Iter>
constexpr uint64_t fnv1a(Iter first, Iter last) noexcept;

/// @}
```

## What to Skip

- Private / implementation-detail entities (inside `detail/` or `namespace detail`)
- Internal macros not part of the public API
- Trivial getters/setters that are self-explanatory — still document, keep `@brief` minimal
