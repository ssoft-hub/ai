# claude-config

[![CI](https://github.com/ssoft-hub/ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ssoft-hub/ai/actions/workflows/ci.yml)

Personal Claude Code configuration — hooks, tools, skills, and an idea-to-release
pipeline of persona agents and commands built on top of them.

## Contents

| Directory | Purpose |
|-----------|---------|
| `hooks/`  | Claude Code event dispatchers (`PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `UserPromptSubmit`) |
| `tools/`  | Atomic tool scripts invoked by hooks |
| `skills/` | Skill definitions (SKILL.md files loaded by `/skill-name`) |
| `agents/` | Persona subagent definitions (one markdown file per agent) |
| `commands/` | Slash command definitions (one markdown file per command) |
| `config/settings.json` | Portable global configuration (hooks + permissions) |

## Hooks

**`PreToolUse`** — runs before every tool call:
- `bash-safety.js` — blocks destructive shell commands (`rm -rf /`, `format C:`), warns on reversible-but-risky ones (`git reset --hard`, `DROP TABLE`)
- `commit-trailer-guard.js` — blocks `git commit` commands containing banned AI-attribution trailers (`Co-Authored-By`, `Generated-by`)
- `review-publish-guard.js` — prompts for confirmation before a `gh` command that publishes review feedback on the spot (`gh pr review --comment/--approve/--request-changes`, `gh pr comment`, REST `in_reply_to`, an `event` field on `POST /pulls/{n}/reviews`, `submitPullRequestReview`, and a thread reply carrying no `pullRequestReviewId`); the pending-review path stays unprompted
- `secret-guard.js` — blocks writes (`Edit`/`Write`/`MultiEdit`/`NotebookEdit`) containing private keys, AWS keys, GitHub PATs; warns on probable credentials
- `skill-gate.js` — on the same write tools, and on `Bash` when a command writes a file (redirection, `tee`, `Set-Content`/`Add-Content`/`Out-File`, `cp`/`mv` destination), names the skills that claim the written file (their `paths:` frontmatter) plus the ones they list in `with:`, minus whatever is already loaded this session; the first offending call is denied until the skills are loaded, a repeat of the same file and missing set only warns

**`PostToolUse`** — runs after `Edit` / `Write` / `MultiEdit` / `NotebookEdit`; the three lint tools only on C++ files (`.h`, `.hpp`, `.cpp`, `.cc`, `.cxx`):
- `comment-check.js` — runs on every file whose comment syntax it knows (`//`, `/* */`, `#`, `--`, `;`, `%`, `<!-- -->`), no config file needed; reminds to check any newly added non-doc comment against the `comments` skill
- `clang-format.js` — formats in-place; requires `.clang-format` in this repository (searched from the edited file up to the git root, never into a parent repo) — skips silently if missing, or if `clang-format` isn't in PATH
- `clang-tidy.js` — runs static analysis; requires `.clang-tidy` (uses `compile_commands.json` when found)
- `cppcheck.js` — runs `cppcheck --enable=warning,style,performance,portability --std=c++20 --error-exitcode=1 …`; requires `.cppcheck`, passed as `--suppressions-list`

**`Stop`** — fires when Claude Code finishes a response turn:
- `stop-notify.js` — desktop notification (Windows toast / macOS notification / Linux notify-send); deferred until all background agents (`run_in_background: true`) have completed

**`SessionStart`** — fires once when a session begins, warn-only:
- `submodule-status-check.js` — warns if any git submodule is ahead/uninitialized/conflicted
- `claude-md-skills-sync-check.js` — warns if `CLAUDE.md`'s skill list has drifted from `skills/`

**`UserPromptSubmit`** — runs on every user message:
- `skills-reminder.js` — injects a reminder of the available skills, generated live from `skills/*/SKILL.md` frontmatter; a skill declaring `reminder: false` is left to `skill-gate.js` alone

## Skills

Each skill declares in its frontmatter how it is triggered and how it ranks against the
others: `tier` (`process` sets the approach, `domain` shapes the code, `narrow` rules one
topic), optional `paths` globs naming the files it owns, optional `with` naming the
skills that always apply alongside it, and optional `reminder: false` for a skill whose
`paths` are its whole trigger. When several fire on one task they are loaded
`process` → `domain` → `narrow`, and the narrower one wins on its own topic.

| Skill | Description |
|-------|-------------|
| `architecture` | System/module architecture design, ADRs, tradeoffs |
| `changelog` | Keep a Changelog format |
| `ci-cd-and-automation` | CI/CD pipeline design and quality gates |
| `code-review-and-quality` | Review substance — correctness, readability, architecture, security, performance |
| `comments` | Code comment style in any language, Doxygen aside (brief, general, no fix narration) |
| `commit-rules` | Conventional Commits format and branch naming |
| `cpp-api-design` | C++ public API structure and hygiene |
| `cpp-coding` | C++ implementation conventions |
| `cpp-doxygen` | Doxygen tag coverage for public C++ headers |
| `cpp-encapsulation` | C++ access-specifier discipline (public/protected/private) |
| `cpp-testing` | Unit test structure (AAA, naming, coverage) |
| `ddd` | Domain-Driven Design patterns in C++ |
| `debugging` | Root-cause investigation before proposing a fix |
| `deprecation-and-migration` | Retiring a public API and writing a migration guide |
| `editing` | File editing workflow (re-read before edit) |
| `github-cli` | `gh` mechanics — issues, PRs, labels, pending review threads, merges |
| `gitlab-cli` | `glab` mechanics — issues, MRs, labels, draft notes, merges |
| `hook-scripts` | Writing Claude Code hooks and tools |
| `issue-rules` | Tracker issue title, description, labels, priority, lifecycle |
| `node-testing` | Conventions for this repo's `test/*.test.js` (node:test) |
| `observability-and-instrumentation` | Logging, metrics, tracing for production visibility |
| `performance-optimization` | Profile-measure-optimize workflow for a reported performance problem |
| `pr-rules` | PR title, description, review comments, merge strategy |
| `project-planning` | Scoping, estimation, milestones, risk, status updates |
| `release` | Semver release workflow |
| `requirements` | Requirements gathering, user stories, acceptance criteria |
| `security-and-hardening` | Trust boundaries, input validation, secrets, least privilege |
| `shipping-and-launch` | Release readiness, staged rollout, rollback planning |
| `submodule-sync` | Git submodule sync discipline |
| `test-driven-development` | Red-green-refactor workflow, before writing implementation code |
| `writing-style` | Prose register and vocabulary — no slang, no unnecessary borrowings, per language |

## Agents

Persona subagents forming an idea-to-release pipeline. Each is scoped to one stage and
points at the skills it applies — see `AGENTS.md` → "Adding an agent".

| Agent | Stage | Skills applied |
|-------|-------|-----------------|
| `spec-architect` | Idea → spec → architecture | `requirements`, `ddd`, `architecture`, `cpp-api-design` |
| `implementer` | Implementation (TDD) | `test-driven-development`, `cpp-coding`, `ddd`, `cpp-encapsulation`, `cpp-testing` |
| `code-reviewer` | Review | `code-review-and-quality`, `cpp-encapsulation`, `cpp-api-design`, `comments`, `cpp-doxygen` |
| `security-auditor` | Security audit | `security-and-hardening` |
| `release-manager` | Release | `changelog`, `release`, `shipping-and-launch` |

## Commands

Slash commands orchestrating the agents above into the idea-to-release pipeline.

| Command | Orchestrates |
|---------|---------------|
| `/spec <idea>` | `spec-architect` — produces a specification (and ADR when warranted) |
| `/build <task>` | `implementer` — implements one task by TDD from an existing spec |
| `/ship [scope]` | `code-reviewer` + `security-auditor` in parallel → go/no-go → `release-manager` on go |
| `/review-loop <tool(s)> [quick..ultra] [scope]` | caller-chosen tool(s) at a tool-agnostic depth, review → fix → re-review until clean or 3 passes, in the current checkout or an isolated worktree |

## Installation

Requires Node.js (no npm packages needed).

```
node install.js
```

Copies `hooks/`, `tools/`, `skills/`, `agents/`, and `commands/` into `~/.claude/` and
merges `config/settings.json` into `~/.claude/settings.json` (existing machine-specific
settings are preserved). `agents/` and `commands/` are optional — installing without
either is not an error. `CLAUDE.md` and `.git/hooks/pre-commit` are overwritten with
backups.

`install.js` writes a manifest at `~/.claude/.claude-config-manifest.json` recording every
created file, every backup, and exactly which hooks and permissions it merged into
`settings.json`. `uninstall.js` reads the manifest and reverses each: created files are
removed, backed-up files (`CLAUDE.md`, `pre-commit`) are restored, and `settings.json` is
reverted by **subtracting only the entries install added** — so hooks or permissions added
to it afterwards by other tools or by hand are kept intact.

Re-running `install.js` performs an in-place **upgrade**: files are refreshed, files a
previous install created but the current repo no longer ships are pruned, and the
`settings.json` merge is re-synced — a hook whose launcher command changed is replaced
rather than duplicated. The manifest tracks `installedAt` and `updatedAt`.

```
node install.js --dry-run      # preview without writing
node install.js --no-git-hook  # skip .git/hooks/pre-commit copy
node uninstall.js              # full restore using manifest
node uninstall.js --dry-run    # preview what would be restored
```

## Tests

```
npm test
```

Uses node's built-in `node:test` runner. Covers safety regexes, shell-escape functions,
and install/uninstall round-trip in a temporary `CLAUDE_CONFIG_DIR`.

See [install.js](install.js) for details.

## Manual setup

Copy the directories manually:

```
# Windows (PowerShell)
Copy-Item -Recurse hooks $env:USERPROFILE\.claude\hooks
Copy-Item -Recurse tools $env:USERPROFILE\.claude\tools
Copy-Item -Recurse skills $env:USERPROFILE\.claude\skills
Copy-Item -Recurse agents $env:USERPROFILE\.claude\agents
Copy-Item -Recurse commands $env:USERPROFILE\.claude\commands

# Linux / macOS
cp -r hooks tools skills agents commands ~/.claude/
```

Then copy or merge `settings.json` into `~/.claude/settings.json`.
