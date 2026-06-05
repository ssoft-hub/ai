# Skill: Domain-Driven Design

Apply when designing domain models, domain APIs, or structuring a module around a business domain.

C++ mechanics → `cpp-coding`, `api-design`. This skill covers domain modelling only.

Reference: Eric Evans, *Domain-Driven Design* (2003). Patterns below are the strategic and tactical core.

---

## Ubiquitous Language

Code speaks the domain language. Developers and domain experts share the same vocabulary.

- Identifiers use domain terms, not technical jargon:
  ```cpp
  invoice.submit(payment);   // domain term
  dataProcessor.process(r);  // technical noise — avoid
  ```
- No generic suffixes unless the domain itself uses them: avoid `Manager`, `Handler`, `Processor`, `Helper`, `Util` in domain layer types
- When a domain expert reads the code, the intent must be clear without translation

---

## Value Objects

Defined by their value, not identity. Immutable.

**Rules:**
- Equality by value — all fields equal → objects equal
- No identity field (no `id`)
- Immutable — no setters; operations return new objects
- Copyable and cheap to copy (or move)

**C++ pattern:**
```cpp
class Money {
public:
    using Amount   = std::int64_t;   // in minor currency units
    using Currency = std::string_view;

    constexpr Money(Amount amount, Currency currency) noexcept;

    [[nodiscard]] bool  operator==(const Money&) const noexcept = default;
    [[nodiscard]] Money operator+(const Money& other) const;    // returns new value

private:
    Amount   amount_;
    Currency currency_;
};
```

Examples: `Money`, `DateRange`, `Temperature`, `EmailAddress`, `Coordinates`.

---

## Entities

Defined by identity, not value. Mutable lifecycle.

**Rules:**
- Identity field (e.g., `Id`) determines equality — two objects with same `id` are the same entity even if other fields differ
- Mutable state — encapsulate mutations through methods that reflect domain operations

**C++ pattern:**
```cpp
class Order {
public:
    using Id = std::uint64_t;

    [[nodiscard]] bool operator==(const Order& other) const noexcept { return id_ == other.id_; }

    void add_line(OrderLine line);    // domain operation — not setLine
    void submit();                    // domain operation — not setStatus(Status::Submitted)

    Order(const Order&)            = delete;
    Order& operator=(const Order&) = delete;

private:
    Id id_;
    // ...
};
```

---

## Aggregates and Bounded Context

### Aggregate

A cluster of domain objects (entities + value objects) treated as a unit for consistency.

**Rules:**
- One **aggregate root** per aggregate — the only externally reachable entry point
- External objects hold references only to the root, never to internal members
- All mutations go through the root; the root enforces invariants
- Small aggregates — one or a few entities per aggregate; avoid large clusters

**C++ pattern:**
```cpp
class Order {                         // aggregate root
public:
    void add_line(Product, Quantity); // modifies internal OrderLine — caller never touches OrderLine directly
    void remove_line(LineId);
    [[nodiscard]] Money total() const;

private:
    std::vector<OrderLine> lines_;    // internal — not exposed
};
```

### Bounded Context

A module, library, or subsystem with its own model. The same word can mean different things in different contexts.

**Rules:**
- Each bounded context owns its model — do not share domain types across contexts
- Cross-context integration uses an **anti-corruption layer** (ACL): a translation layer that maps foreign models to the local ubiquitous language
- Bounded context boundary = module/namespace boundary in code

---

## Domain Services

Stateless domain operations that do not naturally belong to a single entity or value object.

**Rules:**
- Stateless — no mutable members; prefer free functions or static methods
- Named after the domain operation, not technical role:
  ```cpp
  Money calculate_tax(const Invoice&, const TaxPolicy&);  // domain operation
  // not: TaxService::process(...)
  ```
- Accept and return domain types, not raw primitives
- Live in the domain layer — no infrastructure dependencies (no DB, no HTTP)

**C++ pattern:**
```cpp
// Free function — stateless domain operation
[[nodiscard]] TransferResult transfer_funds(Account& from, Account& to, Money amount);
```
