---
name: cpp-testing
version: "1.0.0"
description: Apply when writing, reviewing, or adding tests to C++ code
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - cpp
  with:
    - "testing"
  tags:
    - cpp
    - testing
---

# Skill: C++ Unit Testing

Apply when writing, reviewing, or adding tests to C++ code.

The examples are GoogleTest's; a project on another framework substitutes that framework's
own macros (check `AGENTS.md`).

- The fail, pass, refactor order these tests are written in → `test-driven-development` skill.
- The levels of verification, the isolation of a unit test, test data and the environment, determinism between runs, the mutation check on a fail step, and an assertion resting on an implementation-defined value → `testing` skill.

## Project Overrides

**Must**

Must follow the C++ test conventions the repository's `AGENTS.md` file or a project skill
defines, instead of the rule here.

---

## What to Test

- Every public API function must have tests — private implementation details are not tested directly
- Test behaviour, not implementation: if internal refactoring breaks a test, the test was wrong
- Every bug fix gets a regression test (`debugging` → Regression Test First)

## Test Structure — AAA

The three phases and the rule that no two of them merge are stated by `testing` → Test
Layout - Arrangement, Action, Assertion. The three, written with the macro `TEST` of
GoogleTest:

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

## One Reason to Fail in GoogleTest

One behaviour per test, and the name stating it, are `testing` → One Behaviour per Test,
Named by It. GoogleTest's own means: several `EXPECT_*` in one body only where they
establish that one behaviour together.

- Bad: a test that checks addition, subtraction, and formatting in one body
- Good: three separate tests, each failing for a distinct reason

## Test Names as Documentation

Name = `Subject_Condition_ExpectedOutcome`:

```
Money_AddSameCurrency_ReturnsSummedAmount
Money_AddDifferentCurrency_Throws
Money_DefaultConstructed_HasZeroAmount
Container_InsertBeyondCapacity_GrowsAutomatically
```

No `Test` prefix, no `test_` prefix — the framework already marks it as a test.

## Boundary Cases in C++

The obligation to cover a boundary and the kinds of boundary there are: `testing` →
Boundary Cases. What each kind is in C++:

| Boundary | Examples |
|----------|---------|
| Empty / zero | empty string, 0, empty range |
| Minimum / maximum | `INT_MIN`, `INT_MAX`, single-element container |
| Off-by-one | size == capacity, index == last |
| Invalid input | null pointer, negative where positive expected |
| Exact threshold | values at `==`, `<`, `>` of a documented limit |

## Isolation and Determinism in C++

What a unit test may reach, and what holds between two runs of one: `testing` → Unit Test
Isolation and `testing` → Determinism and Independence Between Runs. A collaborator to be
replaced by a fake, a stub or a mock: `test-driven-development` → Prefer the Real Thing
Over a Test Double gives the order to reach for.

GoogleTest's own means for both:

- A fixture class deriving from `::testing::Test`, with `SetUp` and `TearDown`, in place of a variable at namespace scope
- An injected clock in place of `std::this_thread::sleep_for`

## Do Not

- Do not test private members directly — redesign if they need testing
- Do not copy production code into tests to "validate" it — test through the public interface
