---
description: Run code-reviewer and security-auditor in parallel on the current change, merge into a go/no-go, then hand off to release-manager
argument-hint: [optional scope, defaults to the current diff/branch]
license: Unlicense
metadata:
  author: ssoft
  tags:
    - pipeline
    - ship
---

Scope: $ARGUMENTS (default to the current diff or branch if not specified).

Run both of the following in parallel, each as its own subagent invocation:

1. `code-reviewer` subagent — review the scope for correctness, readability,
   architecture fit, security, and performance (Security/Performance axes are a first
   pass only; the dedicated audit below is authoritative for security).
2. `security-auditor` subagent — audit the same scope for trust-boundary, input
   validation, secrets, and least-privilege issues.

Merge both reports into a single verdict:

- **Go** — neither subagent reported a blocking finding.
- **No-go** — either subagent reported at least one blocking finding.

Report the merged verdict and every finding (with severity) to the user before doing
anything else.

On **go**, invoke the `release-manager` subagent to prepare the release (changelog
entry, version bump, shipping-readiness checklist).

On **no-go**, stop. Do not invoke `release-manager`, and do not attempt to fix the
findings yourself as part of this command — that goes back through `/build`.
