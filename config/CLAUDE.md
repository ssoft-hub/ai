# Global Rules

## Actions outside working directory require confirmation

Before any action that affects state outside a git-controlled working directory — ask the user. This includes but is not limited to:
- `git push` (any form), `gh` CLI, `glab` CLI, GitHub/GitLab API calls
- Writing or modifying files outside the current project (e.g. `~/.config`, `/etc/`, system paths)
- Installing or updating system packages (winget, choco, npm -g, pip, apt, brew)
- Any operation the user cannot roll back with standard VCS tools

Local commits, local file edits within a git repo, and read operations do not require confirmation.

## Skills — auto-apply

Applying a skill means loading it with the Skill tool. Recalling that a skill exists, or
having read it in an earlier session, is not applying it.

Several skills apply to most tasks. Load them all, in this order: process skills
(`requirements`, `architecture`, `project-planning`, `debugging`,
`test-driven-development`, `code-review-and-quality`) settle the approach, then the
domain skill for the code at hand, then narrow-scope skills (`comments`, `cpp-doxygen`,
`cpp-encapsulation`, `commit-rules`, `issue-rules`, `pr-rules`, `changelog`,
`writing-style`). Where two overlap, the narrower one rules its own topic.

When writing or reviewing C++ implementation code → apply `cpp-coding` skill.
When writing, reviewing, or adding tests to C++ code → apply `cpp-testing` skill.
When designing a C++ API, adding public C++ headers, or reviewing a public C++ interface → apply `cpp-api-design` skill.
When choosing C++ access specifiers or reviewing member visibility → apply `cpp-encapsulation` skill.
When adding or modifying Doxygen comments on public C++ headers → apply `cpp-doxygen` skill.
When writing or reviewing a code comment in any language, Doxygen blocks aside → apply `comments` skill.
When modelling domain objects, aggregates, or bounded contexts → apply `ddd` skill.
When writing commit messages or naming branches → apply `commit-rules` skill.
When creating or reviewing tracker issues → apply `issue-rules` skill.
When opening, reviewing, or preparing a PR → apply `pr-rules` skill.
When running `gh` — creating an issue or PR, labelling, review threads, merging → apply `github-cli` skill.
When running `glab` — creating an issue or MR, labelling, draft notes, merging → apply `gitlab-cli` skill.
When updating CHANGELOG.md → apply `changelog` skill.
When preparing a release, bumping version, or tagging → apply `release` skill.
When writing or modifying hook scripts in hooks/ or tools/ → apply `hook-scripts` skill.
When editing any file → apply `editing` skill.
When syncing git submodules → apply `submodule-sync` skill.
When writing or reviewing tests under `test/*.test.js` (node:test) → apply `node-testing` skill.
When eliciting requirements, writing user stories, or defining acceptance criteria → apply `requirements` skill.
When designing system/module architecture, evaluating tradeoffs, or writing an ADR → apply `architecture` skill.
When scoping work, estimating, sequencing milestones, or writing a project plan/status update → apply `project-planning` skill.
When investigating a bug, test failure, or unexpected behavior, before proposing a fix → apply `debugging` skill.
When reviewing code changes for correctness, readability, architecture, security, or performance → apply `code-review-and-quality` skill.
When implementing a feature or bug fix, before writing implementation code → apply `test-driven-development` skill.
When code accepts external input, crosses a trust boundary, or handles secrets/credentials → apply `security-and-hardening` skill.
When diagnosing or fixing a reported performance problem → apply `performance-optimization` skill.
When adding logging, metrics, or tracing, or reviewing how a running system reports its own behaviour → apply `observability-and-instrumentation` skill.
When designing or reviewing a CI/CD pipeline, build automation, or a quality gate → apply `ci-cd-and-automation` skill.
When retiring a public API, planning a breaking change, or writing a migration guide → apply `deprecation-and-migration` skill.
When preparing to ship a release to users, beyond version-bump mechanics → apply `shipping-and-launch` skill.
When writing documentation, issue/PR/commit text, or communicating with the user, in any human language → apply `writing-style` skill.
