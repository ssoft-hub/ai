---
name: cpp-testing
version: "1.0.0"
description: Apply when writing, reviewing, or adding tests to C++ code
license: Unlicense
metadata:
  author: ssoft
  tags:
    - cpp
    - testing
---

# Skill: C++ Unit Testing

Apply when writing, reviewing, or adding tests to C++ code.

Framework choice is project-specific (check `AGENTS.md`). This skill covers principles only.

---

## What to Test

- Every public API function must have tests — private implementation details are not tested directly
- Test behaviour, not implementation: if internal refactoring breaks a test, the test was wrong
- Every bug fix gets a regression test that reproduces the bug before the fix

## Test Structure — AAA

Each test follows three clearly separated phases:

```cpp
TEST(Money, AdditionProducesSumInSameCurrency) {
    // Arrange
    const Money a{100, "USD"};
    const Money b{200, "USD"};

    // Act
    const Money result = a + b;

    // Assert
    EXPECT_EQ(result, Money(300, "USD"));
}
```

Never merge phases. "Arrange" sets up state. "Act" calls exactly one thing. "Assert" checks outcome.

## One Reason to Fail

Each test checks one behaviour — one logical assertion. Multiple `EXPECT_*` are allowed only when they together verify a single concept.

- Bad: a test that checks addition, subtraction, and formatting in one body
- Good: three separate tests, each failing for a distinct reason

When a test fails, the name alone must tell the reader what broke.

## Test Names as Documentation

Name = `Subject_Condition_ExpectedOutcome`:

```
Money_AddSameCurrency_ReturnsSummedAmount
Money_AddDifferentCurrency_Throws
Money_DefaultConstructed_HasZeroAmount
Container_InsertBeyondCapacity_GrowsAutomatically
```

No `Test` prefix, no `test_` prefix — the framework already marks it as a test.

## Boundary Cases Are Mandatory

For every function, write tests for:

| Boundary | Examples |
|----------|---------|
| Empty / zero | empty string, 0, empty range |
| Minimum / maximum | `INT_MIN`, `INT_MAX`, single-element container |
| Off-by-one | size == capacity, index == last |
| Invalid input | null pointer, negative where positive expected |
| Exact threshold | values at `==`, `<`, `>` of a documented limit |

If the function documents a precondition, test the boundary just inside and just outside it.

## Test Isolation

- Tests must not share mutable state — each test starts from a clean, deterministic state
- No global variables mutated across tests; use fixtures (setup/teardown) instead
- No order dependency — tests must pass in any execution order

## Unit Test Scope

Unit tests are fast and isolated:

- No network, no disk I/O, no database — mock or stub infrastructure at the boundary
- No `sleep` or time-based waits — use injectable clocks or time abstractions
- Each test completes in milliseconds

## Do Not

- Do not test private members directly — redesign if they need testing
- Do not copy production code into tests to "validate" it — test through the public interface
- Do not suppress or ignore failing tests — fix or explicitly skip with a documented reason
- Do not write tests that always pass (assertion-free tests)
