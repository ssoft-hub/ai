---
name: encapsulation
version: "1.0.0"
description: Apply when choosing access specifiers, designing a class's public/protected/private surface, or reviewing member visibility
license: Unlicense
metadata:
  author: ssoft
  tags:
    - cpp
    - encapsulation
    - api
---

# Skill: Encapsulation

Apply when choosing access specifiers, designing a class's public/protected/private surface, or reviewing member visibility.

Public API structure across headers/modules → `api-design`. This skill covers access-level choice within a single type.

---

## Default Rule

**Private by default.** Every member starts `private`. Widen only when a real caller outside the class needs it.

- **`public`** — only members actually used from outside the class: the genuine external contract.
- **`protected`** — only members actually used by derived classes (extension points, never a substitute for `public` "just in case"). Prefer `protected` virtual methods over `protected` data members — derived classes should go through behavior, not touch raw state.
- **`private`** — everything else, including implementation helpers and internals derived classes don't need.
- **Reviewing existing code** — a `public` method with no external caller demotes to `private`; one only called by derived classes demotes to `protected`.
- **`friend`** — only for tightly-coupled pairs (e.g. a builder and its product), never as a shortcut to avoid picking the right access level.

**Why:** every `public` member is a promise to every caller — widening later is free, narrowing is a breaking change. Defaulting to `private` keeps that promise as small as possible until proven otherwise.

```cpp
class Shape {
public:
    // Used by callers outside the hierarchy — genuine external contract
    [[nodiscard]] double area() const { return compute_area(); }

protected:
    // Extension point — only derived classes override this
    virtual double compute_area() const = 0;

private:
    // Implementation detail — no external or derived-class caller
    void normalize_cache() const;
};
```

## Cross-References

- `ddd` — aggregate roots and internal-entity exposure
