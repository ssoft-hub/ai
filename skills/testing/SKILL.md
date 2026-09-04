---
name: testing
version: "1.0.0"
description: Apply when writing, reviewing or adding a test at any level of verification, in any language
license: Unlicense
metadata:
  author: ssoft
  tier: process
  bound-to:
    - universal
  rubric: applied
  tags:
    - testing
    - quality
---

# Skill: Testing

Apply when writing, reviewing or adding a test at any level of verification, in any
language. The testing skill of the language being written carries its runner syntax and
naming scheme, and, where it states them, what must be tested and its
implementation-defined instances.

- The order of work, and the preference among a real collaborator, a fake, a stub and a mock → `test-driven-development` skill.
- A defect reproduced as a failing test → `debugging` skill.
- The pipeline running the levels → `ci-cd-and-automation` skill.
- The criteria an end-to-end assertion is read off → `requirements` skill.
- A benchmark → `performance-optimization` skill.

## Levels of Verification

**Must**

What the code of a test reaches, directly or through the code it calls, fixes its lowest
level:

| Level | The test reaches | The stand-in it admits |
|---|---|---|
| Unit | nothing beyond its own process | one for any collaborator beyond the process |
| Integration | another process, a network endpoint, a file system, a queue or a database, none of them a party outside the project | none for the endpoint the test reaches |
| Contract | a party outside the project, or the recorded agreement that party is verified against as well | that recorded agreement for that party, and no other |
| End-to-end | every boundary from the entry a user meets to the store behind it | one for a party outside the deployment, and none for a part the deployment carries |

Reading a checked-in fixture reaches no file system.

A test reaching what the Integration, Contract or End-to-end row names must not be named,
filed or run as a unit test — by its name, directory, build target, label or tag.

## Unit Tests and the Pyramid

**Should**

A unit test should take its stand-ins in the order `test-driven-development` → Prefer the
Real Thing Over a Test Double fixes from the in-memory fake on, and should complete in
milliseconds. The number of tests should fall as the level rises.

## Boundary Cases

**Should**

The tests of a unit should cover each kind of boundary below that applies to it:

| Kind | What it is |
|---|---|
| Empty or zero | an input carrying nothing |
| Minimum or maximum | the extreme the type or the requirement admits |
| Off by one | each side of a limit |
| Invalid input | what the requirement rejects |
| Exact threshold | the value a documented limit states |

No other kind belongs to the table.

## The Shape of a Test

**Should**

| Subject | Rule |
|---|---|
| Behaviour | A test should cover one, however many assertions establish it |
| A failure with two causes | The author should split the test |
| Name | The name should state the behaviour, not the input |
| Phases | A test should hold an arrangement, one action, which includes any wait, and an assertion |
| The action | It should arrange nothing it is checked against |
| An action returning the value compared | It may stand inside the assertion |
| The assertion | It should compare the outcome with the requirement, never the way it was reached |
| A recorded call across a boundary | It is the outcome where the requirement names that call |
| Assertions | A test should hold at least one, in its body or in a helper it calls |
| The unit | A test should reach it through its public interface |
| A private member | A test should call none |
| Production code | A test should carry no copy of it |

## Test Data and the Environment

**Should**

| Subject | Rule |
|---|---|
| The data an assertion turns on | The test should build it or read it from a checked-in fixture, never off the machine |
| A checked-in fixture | The test should change a copy, never the fixture |
| An endpoint, a database, a port or an account | The test should take it from configuration it sets |
| A party outside the project | A contract or end-to-end test may reach it through that configuration |
| Setup | Setup should establish every precondition the assertions name |
| Teardown | Teardown should run on the failing path as well as the passing one |
| What setup changed | Teardown should undo it |
| What the test allocated beyond its process | Teardown should release it |

## Crossing a Boundary

**Must**

| Subject | Rule |
|---|---|
| A write to the file system | A test must write only under a directory created for it, or for its file of tests, alone |
| That directory | The test or its file's teardown must remove it on the passing and the failing path |
| A credential | A credential must reach no report and no uploaded CI artifact |
| The rest of a credential's handling | `security-and-hardening` → Secrets and Credentials |
| A wait for a condition | A test must wait on the condition itself, up to a limit the test states, never sleep a fixed span in its place |
| A call whose return is the outcome | It is no such wait |
| A retry of a call across the boundary, inside the test | A retry must state its maximum attempts and its maximum total wait |

## No Assertion on an Implementation-Defined Value

**Must**

An assertion must not rest on a value the language leaves to the implementation or the
platform — what its specification lists as implementation-defined, and where it carries
no such list, what the specification or the implementation's documentation names as
varying between implementations or platforms — and must check the relation the
requirement fixes instead:

| Instead of | Assert |
|---|---|
| a size or a width, against a number | the type holds every value the requirement names, minimum and maximum included |
| the byte order | the value survives a round trip through the encoding the requirement fixes |
| an address width | an address read back equals the one written |

## Determinism and Independence Between Runs

**Should**

| Subject | Rule |
|---|---|
| A varying input, such as the clock, the locale or the random seed | A test should fix it, or assert what holds for every value it takes |
| Elapsed time | A bound on it should sit above the correct code's and below the defect's, on every supported platform |
| Other tests | A test should pass alone and in any order, reading no state another test left |
| An order the requirement leaves open | An assertion should name the set of outcomes it admits, whichever thread, process or crossing completes first |
| A verdict varying between runs of one commit on one platform, or between supported platforms | `ci-cd-and-automation` → Flaky Checks |

## The Mutation Check on a Passing Test

**Should**

Once a test passes, the author should run it under each mutation below, the second where
the code offers one, and should revert each before changing the code further:

| The mutation | The test should |
|---|---|
| removes the behaviour the test covers | fail |
| leaves that behaviour intact, such as a renamed local | pass |

## When a Suite May Be Trusted

**Should**

A suite's result should be reported as a verdict on a change only where:

- the run covered the commit carrying the change;
- every test the run declares ran, or is disabled under an issue naming it;
- every test the change adds or changes has passed The Mutation Check on a Passing Test;
- a change crossing a boundary ran the level of that boundary, not only the level below;
- the cause of each failure is stated where the change is reviewed.

Nothing else belongs to the list.
