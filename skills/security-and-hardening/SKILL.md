---
name: security-and-hardening
version: "1.0.0"
description: Apply when code accepts external input, crosses a trust boundary, or handles secrets/credentials
license: Unlicense
metadata:
  author: ssoft
  tags:
    - security
    - quality
---

# Skill: Security and Hardening

Apply when code accepts external input, crosses a trust boundary (network, file,
subprocess, IPC, config), or handles secrets/credentials. This skill covers design-time
decisions; mechanical, write-time enforcement of some of the same concerns is handled by
the `secret-guard` and `bash-safety` hooks (see `AGENTS.md` → Hook architecture) — this
skill is what to design for before those hooks would ever fire.

- Memory-safety idioms that also happen to prevent whole classes of vulnerability
  (RAII, no naked `new`, no `void*`) → `cpp-coding` skill.
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
  `reserve()` a container to an attacker-controlled value without an upper bound.
- Never build a shell command, SQL query, file path, or format string by concatenating
  untrusted input — use parameterized APIs (prepared statements, `std::filesystem` path
  composition, argv arrays instead of a shell string).

```cpp
// Wrong: path traversal via unvalidated input
auto path = base_dir + "/" + user_supplied_name;

// Correct: reject any component that escapes base_dir
auto candidate = std::filesystem::weakly_canonical(base_dir / user_supplied_name);
if (!candidate.string().starts_with(base_dir.string()))
    throw std::invalid_argument("path escapes base directory");
```

## Integer and Bounds Safety

- Check for overflow before an arithmetic operation on attacker-influenced sizes, not
  after — `a + b < a` (unsigned wraparound) is a hardening check, not defensive noise.
- Prefer a bounds-checked accessor (`.at()`) over `operator[]` at a trust boundary; the
  cost of a checked access is negligible next to the cost of an out-of-bounds read.
- Reject negative values for anything that becomes a size, count, or index before it
  reaches the container API, rather than relying on the container to reject it.

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

Reproduce it, understand the root cause (`debugging` skill), fix the root cause rather
than the specific exploit string, and add a regression test that would have caught it.
Do not silently patch a security bug without documenting the class of issue — the next
similar bug in a different location depends on that being written down.
