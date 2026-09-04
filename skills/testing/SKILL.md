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
language. This skill states what each level checks, what a test runs against, and what
makes a suite's verdict worth acting on. The runner syntax, the naming scheme and the
coverage list of one language are stated by the testing skill of the language being
written.

- The order the test and the implementation are written in, and the preference order between a real collaborator, a fake, a stub and a mock → `test-driven-development` skill.
- Reproducing a defect as a failing test before the fix → `debugging` skill.
- The pipeline running these levels on a server, and the order it runs them in → `ci-cd-and-automation` skill, which hands the verdict on a test that varies to Determinism and Independence Between Runs.
- The acceptance criteria an end-to-end assertion is read off → `requirements` skill.
- The measurement behind a performance claim, and the benchmark carrying it → `performance-optimization` skill.

## Project Overrides

**Must**

Must follow the test conventions the repository's `AGENTS.md` file or a project skill
defines, instead of the rule here.

---

## Levels of Verification

**Should**

A test should sit at the level of the outermost boundary it is about, whatever the amount
of code behind it and whatever it reaches at run time: a test over one function that
opens a socket is an integration test rather than a unit test, and a test asserting a
recorded agreement is a contract test though it reaches nothing outside its process.

| Level | The boundary the test is about | What a test at this level may put in place of the other side |
|---|---|---|
| Unit | none — one process, one unit and the collaborators it calls in-process | every collaborator carrying a boundary, since none may be reached |
| Integration | a boundary between two parts the deployment itself carries — a process, a file system, a queue, a database | both sides are the parts that ship, a store the project deploys rather than builds included |
| Contract | the boundary with a party the project neither builds nor deploys — an external service, or its own interface as a published promise | the recorded agreement, on either side of it, or nothing where the test runs against that party itself |
| End-to-end | every boundary the system has, from the entry a user meets to the store behind it | nothing the deployment carries; a party outside it may stand in |

The number of tests should fall as the level rises — the pyramid — because a defect
catchable one level down is caught there for less: an end-to-end run pays for every
boundary before it reports anything, and reports a whole path as broken rather than one
unit.

Each level should be run by a command of its own, so a change touching one level does not
pay for the levels above it.

The names in use elsewhere for these levels:

| Name also in use | What it names |
|---|---|
| system test, acceptance test | end-to-end, where the outcome asserted is the one the requirement states for a user |
| component test | integration, where every part on both sides is one the project builds |
| smoke test | a subset of any level, run first to decide whether running the rest is worth it |

## One Behaviour per Test, Named by It

**Must**

Each test must cover one behaviour, and its name must state that behaviour. Several
assertions belong to one test only where they establish that one behaviour together.

A test whose failure admits two causes must be split, and a name stating the input rather
than the behaviour must be rewritten. The form a name takes, and the syntax carrying the
assertions, are stated by the testing skill of the language being written.

## Unit Test Isolation

**Must**

A unit test must reach nothing outside its own process: no network access, no disk access,
no database access, no clock it does not set, and no wait on wall-clock time. Each unit
test must complete in milliseconds, so the whole level runs on every edit.

The author must replace a collaborator carrying one of those, in the order
`test-driven-development` → Prefer the Real Thing Over a Test Double fixes. A test that
cannot be written that way is no unit test, and the author must name and run it at the
level whose boundary it is about.

## Test Data and the Environment

**Must**

| Subject | Rule |
|---|---|
| The data an assertion turns on | Must be built by the test that asserts on it or read from a checked-in fixture, never inherited from another test and never read off the machine the run happens on |
| A temporary directory | A test touching the file system must run against a directory created for that test alone, and must remove it whether the test passes or fails |
| A shared location | No test may write a fixed path, a shared database, a well-known port or a real account; the location must come from configuration the test sets |
| A checked-in fixture | Must be read and never written by the test using it; a test needing a changed copy must make the copy |
| Setup | Must establish every precondition the assertions name, so no assertion rests on a state the test did not put there |
| Teardown | Must run on the failing path as well as the passing one, and must restore what setup changed — an environment variable, a working directory, a registered handler, a global instance |
| A credential | Must be minted for the run and must reach no artifact the run leaves behind (the `security-and-hardening` skill states what handling one requires) |

## Crossing a Process or Network Boundary

**Must**

| Subject | Rule |
|---|---|
| Timeout | Every call crossing the boundary must carry a timeout the test sets, so a dependency that never answers fails that test instead of hanging the run |
| Waiting | A test must wait for the condition it is about — a reply, a file, a recorded state — and must not wait a fixed span of time instead |
| Retry | A retry must carry a bound stated in the test: a maximum number of attempts and a maximum total wait |
| Ordering | An assertion must not turn on the order two operations across the boundary complete in, unless the requirement fixes that order; where it does not, the assertion must name the set of outcomes admitted |
| Cleanup | Everything the test allocates beyond its own process — a record, a queue, a container, a port, a subprocess — must be released in teardown, on the failing path as well |
| Address | The endpoint must come from configuration the test sets, never from a host name compiled into the test |

## Determinism and Independence Between Runs

**Must**

| Subject | Rule |
|---|---|
| Repeatability | A test must return the same verdict on every run against the same commit, on every platform the project supports |
| Independence | Each test must pass run alone, and must pass in any order beside the others; no test may read state another test left behind |
| A varying input | The current time, the time zone, the locale, the random seed, the process identifier, the host name and the order a directory is listed in must be fixed by the test wherever an assertion turns on one |
| Concurrency | An assertion must not turn on the scheduling of threads or processes; a test over concurrent code must state the outcome the requirement admits, whatever the interleaving |
| A test that varies | A test whose verdict differs between runs of one commit is a defect of that test, and the author must repair it, remove it, or disable it under the condition When a Suite May Be Trusted states, rather than re-run it until it passes |

## The Fail Step Fails for the Intended Reason

**Must**

The fail step of `test-driven-development` → The Loop must fail for the behaviour the test
covers, and the check is a mutation of the code under test:

| The mutation | The test |
|---|---|
| removes the behaviour that test covers | must fail |
| leaves that behaviour intact — a local renamed, two independent statements reordered | must pass |

A test that fails on a missing fixture, an unresolved name or a typo in a path reports
nothing about the behaviour, and passes on a coincidence the moment the file appears. The
mutation is what separates the two: the author applies it to the code under test and must
revert it before the pass step, and it needs no tooling of its own.

## No Assertion on an Implementation-Defined Value

**Must**

An assertion must not rest on a value the implementation defines rather than the
requirement. The closed set:

- `sizeof` of a built-in type
- byte order
- pointer width
- the signedness of the type `char`
- the width of the type `long`

Each of those differs across the compilers, operating systems and architectures a build
matrix covers (`ci-cd-and-automation`), so an assertion resting on one states where it was
written rather than what the code owes. What replaces it is a relation or an invariant read
off the requirement:

| Instead of | Assert |
|---|---|
| a type's size against a number | the type holds every value the requirement names, its minimum and its maximum included |
| the byte order the machine happens to have | the value survives the round trip through the encoding the requirement fixes |
| a pointer's width | the pointer read back equals the pointer written |
| the signedness a character type happens to carry | the value range the requirement states is representable |

## Test Layout - Arrangement, Action, Assertion

**Must**

Each test must separate these phases, and must merge no two of them:

| Phase | Holds |
|---|---|
| Arrangement | the state the behaviour is checked against, built by this test |
| Action | one call of the thing under test |
| Assertion | the outcome, compared against what the requirement states |

An action written inside an assertion, or a state the action itself arranges, leaves a
failure that does not say which of the three broke. The syntax each phase is written in is
stated by the testing skill of the language being written.

## Boundary Cases

**Must**

Every unit under test must carry a test for each kind of boundary that applies to it:

| Kind | What it is |
|---|---|
| Empty or zero | the input carrying nothing |
| Minimum or maximum | the extreme value the type or the requirement admits |
| Off by one | the value on each side of a limit |
| Invalid input | the value the requirement rejects |
| Exact threshold | the value a documented limit is stated at |

Where the requirement states a precondition, the boundary just inside it and the one just
outside it must both carry a test. The example each kind takes in one language is given by
the testing skill of the language being written.

## When a Suite May Be Trusted

**Must**

A suite carries a verdict on a change only where every condition below holds; short of
one, its result says nothing about the change and must not be reported as if it did.

| Condition | What establishes it |
|---|---|
| The run covers the change | the run happened on the commit under review, per `work-sequence` → When a Check Runs |
| Every declared test ran | no test skipped, disabled or filtered out without an issue naming it and the release it is restored by |
| Every test can fail | no test without an assertion, and each new test failed at its fail step for the reason the section The Fail Step Fails for the Intended Reason names |
| The levels the change touches ran | a change crossing a boundary ran the level of that boundary, not the level below it alone |
| A failure was read, not re-run | the cause of each failure was established, per the `debugging` skill, and a test whose verdict varies was settled per Determinism and Independence Between Runs |
