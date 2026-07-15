# Global Rules

## Actions outside working directory require confirmation

Before any action that affects state outside a git-controlled working directory — ask the user. This includes but is not limited to:
- `git push` (any form), `gh` CLI, `glab` CLI, GitHub/GitLab API calls
- Writing or modifying files outside the current project (e.g. `~/.config`, `/etc/`, system paths)
- Installing or updating system packages (winget, choco, npm -g, pip, apt, brew)
- Any operation the user cannot roll back with standard VCS tools

Local commits, local file edits within a git repo, and read operations do not require confirmation.

## Skills — auto-apply

When writing or reviewing C++ implementation code → apply `cpp-coding` skill.
When writing, reviewing, or adding tests to C++ code → apply `cpp-testing` skill.
When designing public API, adding public headers, or reviewing public interface → apply `api-design` skill.
When choosing access specifiers or reviewing member visibility → apply `encapsulation` skill.
When adding or modifying Doxygen comments on public headers → apply `doxygen` skill.
When writing or reviewing non-Doxygen code comments → apply `comments` skill.
When modelling domain objects, aggregates, or bounded contexts → apply `ddd` skill.
When writing commit messages or naming branches → apply `commit-rules` skill.
When creating or reviewing tracker issues → apply `issue-rules` skill.
When opening, reviewing, or preparing a PR → apply `pr-rules` skill.
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
