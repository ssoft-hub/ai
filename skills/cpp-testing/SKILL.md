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
  tags:
    - cpp
    - testing
---

# Skill: C++ Testing

Apply when writing, reviewing, or adding tests to C++ code.

The examples below are GoogleTest's, and a project on another framework substitutes that
framework's own macros.

- The fail, pass, refactor order these tests are written in → `test-driven-development` skill.
- The levels of verification, and what a unit test may reach → `testing` → Levels of Verification.
- One behaviour per test and the name stating it, the three phases and what the action may not arrange, what an assertion rests on, and the interface a test reaches the unit through → `testing` → The Shape of a Test.
- Test data and the environment, the boundary a test crosses, the mutation check on a passing test, and when a suite may be trusted → `testing` skill.

## What to Test

- Every public API function must have tests
- Every bug fix gets a regression test (`debugging` → Regression Test First)

## Test Structure — AAA

The three phases, written with the macro `TEST` of GoogleTest:

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

## Test Names as Documentation

GoogleTest states the behaviour in the suite and test names of the macro `TEST`, and
asserts it with `EXPECT_*` or `ASSERT_*`.

Name = `Subject_Condition_ExpectedOutcome`:

```
Money_AddSameCurrency_ReturnsSummedAmount
Money_AddDifferentCurrency_Throws
Money_DefaultConstructed_HasZeroAmount
Container_InsertBeyondCapacity_GrowsAutomatically
```

No `Test` prefix, no `test_` prefix.

## Boundary Cases in C++

The obligation to cover a boundary and the kinds of boundary there are: `testing` →
Boundary Cases. What each kind is in C++:

| Boundary | Examples |
|----------|---------|
| Empty or zero | empty string, 0, empty range |
| Minimum or maximum | `INT_MIN`, `INT_MAX`, single-element container |
| Off by one | size == capacity, index == last |
| Invalid input | null pointer, negative where positive expected |
| Exact threshold | values at `==`, `<`, `>` of a documented limit |

## Implementation-Defined Values in C++

The rule and what an assertion checks instead: `testing` → No Assertion on an
Implementation-Defined Value. Its instances in C and C++:

- `sizeof` of a built-in type other than the `char` types
- pointer width, `sizeof(void*)`
- byte order, `std::endian::native`
- the signedness of the type `char`, in place of which an assertion should check that
  the range the requirement states is representable

## Isolation and Determinism in C++

The clock a test reads, and what holds between two runs of one test:
`testing` → Determinism and Independence Between Runs.

The order to reach for a fake, a stub or a mock in place of a collaborator:
`test-driven-development` → Prefer the Real Thing Over a Test Double.

The means C++ and GoogleTest give for the clock and for independence between runs:

- A fixture class deriving from `::testing::Test`, with `SetUp` and `TearDown`, in place of a variable at namespace scope
- An injected clock in place of `std::this_thread::sleep_for`
