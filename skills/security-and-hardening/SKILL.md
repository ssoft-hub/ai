---
name: security-and-hardening
version: "1.0.0"
description: Apply when code accepts external input, crosses a trust boundary, or handles secrets/credentials
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - universal
  tags:
    - security
    - quality
---

# Skill: Security and Hardening

Apply when code accepts external input, crosses a trust boundary (network, file,
subprocess, IPC, config), or handles secrets/credentials. This skill covers design-time
decisions; mechanical, write-time enforcement of some of the same concerns is handled by
the `secret-guard` and `bash-safety` hooks (see `README.md` → Hooks) — this
skill is what to design for before those hooks would ever fire.

- Memory-safety idioms that also happen to prevent whole classes of vulnerability →
  the coding-conventions skill of the language being written.
- Security depth during review → `code-review-and-quality` skill (Security axis).
- A vulnerability found in already-shipped code → `deprecation-and-migration` skill for
  how to retire the unsafe path.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own security requirements (e.g. a specific compliance regime), follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Trust Boundaries

Identify every point where data crosses from a less-trusted source into code that acts
on it: network input, file contents, environment variables, command-line arguments,
subprocess output, IPC/shared memory, config files editable by another process. Data is
untrusted until validated, regardless of how internal the source looks — a config file
"nobody else touches" is still an attack surface if anything else can write to it.

## Threat Modeling Before Hardening

Controls added without first asking "how would this be misused" are guesses. Before
hardening a feature, spend a few minutes naming the trust boundaries and the assets
worth attacking (credentials, data, availability, elevated actions), then run STRIDE
over each boundary as a quick lens, not a ceremony:

| Threat | Ask | Typical mitigation |
|---|---|---|
| Spoofing | Can someone impersonate a user or service? | Authentication, signature verification |
| Tampering | Can data be altered in transit or at rest? | Integrity checks, parameterized queries |
| Repudiation | Can an action be denied afterward? | Audit logging of security-relevant events |
| Information disclosure | Can data leak? | Encryption, field allowlists, generic errors |
| Denial of service | Can the system be overwhelmed? | Rate limiting, input size caps, timeouts |
| Elevation of privilege | Can a caller gain rights it shouldn't have? | Authorization checks, least privilege |

If the trust boundaries for a feature can't be named, it isn't ready to be secured —
controls added at that point are bolted on, not designed in.

## Input Validation

- Validate at the boundary, not deep inside business logic — reject or normalize bad
  input as early as possible so invalid data never propagates.
- Validate shape (type, length, format) and range (bounds, allowed values) separately —
  a string that's syntactically a number can still be out of the range the code assumes.
- Treat size/length fields from untrusted input as untrusted too — do not `resize()` or
  `reserve()` a container to an attacker-controlled value without a domain ceiling, which
  is the bound Integer and Bounds Safety below distinguishes from the type's own limit.
- Never build a shell command, SQL query, file path, or format string by concatenating
  untrusted input — use parameterized APIs (prepared statements, `std::filesystem` path
  composition, argv arrays instead of a shell string).

Composing a path from an untrusted name is where those rules are most often got wrong, and
the control has an order: refuse, then resolve, then compare.

- **Refuse**, on the untrusted name and before any resolution: a `..` component, whatever
  its position; a component the platform rewrites before it opens the name, so that the
  name checked is not the name opened; and a component count above a ceiling the arriving
  format states. A `..` collapses lexically, ahead of every link on the way to it, so a
  resolve is not where it can be caught, and an unbounded resolve reports its refusal as a
  failure of the runtime rather than as a refusal of the name.
- **Resolve** from the base downward, one component at a time, following the links each
  component goes through rather than collapsing the name ahead of them. A resolution
  failure is a refusal unless it says the name does not exist yet: read as that, a
  component that could not be resolved at all becomes a name derived lexically and
  accepted. An upward walk from the target learns only that some prefix resolved, and
  excuses every failure below it.
- **Compare** the result against the base by components, never by strings: a string prefix
  admits a sibling directory whose name extends the base name, and a leading-`..` test over
  the relative string admits a component that merely begins with those dots. Resolve the
  base as well, since an unresolved base is not a prefix of a resolved candidate.
- **Take identity from the handle** the open returned, never from the input and never from
  the string the check gave back. The control establishes containment and nothing about
  identity: many names denote one file, and a link created after the check and before the
  open leads that open out of the base. Where that matters, containment is established on
  an open handle.

The base directory is the trusted half of the call: derive it from the authenticated
principal, never from a request parameter. Where the base is a tenant boundary, containment
inside it is the authorisation control, and a call taking the base from the request beside
the name satisfies every rule above while enforcing nothing.

The `..` refusal holds on the fully decoded name only. Decode exactly once, before the
check, so the bytes checked are the bytes the system call receives.

Resolution reaches only the link kinds the standard library follows, and a library
following none of the kinds its platform has reports every one of them as a plain
directory. Establish which kinds the library in hand follows on the platform the name is
opened on, and treat the resolution as unproven until you have; where it follows too few,
resolve through the platform's own API.

What establishes the control is the guard run over each input class below, presented with
the refusal or the contained name it produced. A guard read rather than run is not
evidence: every clause above is one some library makes unnecessary and some other one
defeats.

- a name climbing out of the base
- a name leaving the base through a link
- a name whose `..` cancels a link component rather than the directory that link resolves to
- a name under another root, on a platform that has more than one
- a name holding a component the platform rewrites before the open
- a name whose resolution fails for a reason other than the name not existing yet
- a name that is legitimate and has to come back: one merely beginning with the dots a
  `..` component is made of, and a base given relative to the working directory

What refutes it: a string comparison in place of the component one; a lexical collapse in
place of the resolve; an unresolved base on either side of the comparison; a resolution
failure read as a name that does not exist yet; a check on a name decoded after it; and a
guard refusing the last class along with the rest, which answers every class above it while
forbidding every name a caller may legitimately write.

## Integer and Bounds Safety

- Check for overflow before an arithmetic operation on attacker-influenced sizes, by
  testing an operand against the limit of the type the result is stored in. The bound is a
  hardening check, not defensive noise.
- Prefer a bounds-checked accessor (`.at()`) over `operator[]` at a trust boundary; the
  cost of a checked access is negligible next to the cost of an out-of-bounds read.
- Reject negative values for anything that becomes a size, count, or index before it
  reaches the container API, rather than relying on the container to reject it.

The rule governs fixed-width integer arithmetic; a language whose integers grow rather than
wrap is outside it. The control is three clauses, and their order is part of them:

- **Check shape before range.** An operand of the wrong shape passes every comparison in
  the bound and then behaves as something else in the operation, so a bound reached with an
  unchecked shape decides nothing.
- **Bound an operand, not the result**, against the limit of the type the result is stored
  in, before the operation runs. Read that limit off the storage rather than writing it
  out: a limit written out belongs to the width it was written for, and a limit taken from
  the type the arithmetic runs in belongs to what the operands promote to rather than to
  what holds the result. Where an operand may be negative, reject that first — it is the
  negative-size rule above, and it also keeps the limit test's own subtraction inside its
  type.
- **Keep the type limit apart from the domain ceiling.** Neither stands in for the other:

| Bound | Applied | Derived from | What it leaves open |
|---|---|---|---|
| the type limit | in front of the arithmetic | the type the result is stored in | the value: a checked sum handed straight to a container allocates whatever two length fields add up to |
| a domain ceiling | where the field is parsed | the protocol or the deployment | the arithmetic: a total within the ceiling still has to fit the type it is computed in |

An operation reporting the overflow an addition would cause, rather than performing it,
replaces the limit test and needs no precondition on the operand signs. The
language in hand may offer none, and one a compiler offers of its own is absent on the next
compiler; where there is none, the operand test is the whole guard. It answers the width
question alone either way, so an operand that becomes a size is still rejected when
negative.

What establishes the guard is the same guard retyped for a narrower type, still rejecting a
pair of operands the wider type held. What refutes it is a check that reads the sum, which
fails in two of the three cases and is worthless in the third: where the language leaves
the overflow undefined, the compiler may delete the check along with the addition; on an
unsigned type narrower than the one the operands promote to, the addition never wraps and
the check is never true; and where the wrap is defined and the check does fire, the stored
value is already the wrong number. A limit written out as a constant, a bound placed after
the operation, a shape checked after the range, and a guard rejecting every pair of
operands refute it the same way.

## Secrets and Credentials

- Never hardcode a credential, API key, or private key in source, config committed to
  the repo, logs, or test fixtures — see `secret-guard` for the mechanical check this
  backs up. Load secrets from environment or a secrets manager at runtime.
- Do not log a secret even at debug level — a debug log that's rotated to disk or
  shipped to a log aggregator is a leak, not a diagnostic aid (see
  `observability-and-instrumentation`).
- Redact or omit tokens/credentials in error messages surfaced to a user or exception
  text that a bug tracker will capture verbatim.
- **If a secret is ever committed, rotate it.** Deleting the line, or rewriting history
  to remove it, is not enough — treat it as compromised the moment it reaches a remote,
  since a mirror, fork, or cached view can retain it regardless of what the canonical
  history says. Revoke and reissue the credential first, then clean up the history.

## Least Privilege

- A process, file, or credential should have exactly the access it needs and no more —
  default to read-only, narrow-scoped tokens, and drop elevated privileges as soon as
  the operation requiring them completes.
- Do not add a broad permission (a wildcard scope, an "admin" flag) to make one specific
  operation simpler — grant the specific permission the operation needs.

## Dependencies

- Pin dependency versions; an unpinned transitive dependency can introduce a
  vulnerability between builds without any change to this repo's own code.
- Prefer well-maintained libraries with a security-disclosure process over
  unmaintained ones, even at a convenience cost.
- A package-manager audit reports known advisories — it does not prove the rest of a
  dependency is trustworthy. Triage by reachability, not severity alone: a critical
  finding in code that is never called on any path this project exercises is lower
  priority than a moderate finding on a path that runs on every request. Document the
  reason and set a review date whenever a fix is deferred rather than applied.

## When a Vulnerability Is Found

Run it through `debugging` skill like any other defect — reproduce, root-cause,
regression test. What is specific to a vulnerability: fix the class of weakness rather
than the exploit string that revealed it, and document that class. A silently patched
security bug leaves the next instance of the same weakness, in a different location,
undiscovered.
