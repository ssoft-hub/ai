# claude-config

[![CI](https://github.com/ssoft-hub/ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ssoft-hub/ai/actions/workflows/ci.yml)

Personal Claude Code configuration — hooks, tools, and skills.

## Contents

| Directory | Purpose |
|-----------|---------|
| `hooks/`  | Claude Code event dispatchers (`PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `UserPromptSubmit`) |
| `tools/`  | Atomic tool scripts invoked by hooks |
| `skills/` | Skill definitions (SKILL.md files loaded by `/skill-name`) |
| `config/settings.json` | Portable global configuration (hooks + permissions) |

## Hooks

**`PreToolUse`** — runs before every tool call:
- `bash-safety.js` — blocks destructive shell commands (`rm -rf /`, `format C:`), warns on reversible-but-risky ones (`git reset --hard`, `DROP TABLE`)
- `commit-trailer-guard.js` — blocks `git commit` commands containing banned AI-attribution trailers (`Co-Authored-By`, `Generated-by`)
- `secret-guard.js` — blocks writes (`Edit`/`Write`/`MultiEdit`/`NotebookEdit`) containing private keys, AWS keys, GitHub PATs; warns on probable credentials

**`PostToolUse`** — runs after `Edit` / `Write` / `MultiEdit` / `NotebookEdit` on C++ files (`.h`, `.hpp`, `.cpp`, `.cc`, `.cxx`):
- `clang-format.js` — formats in-place (skips silently if `clang-format` not in PATH)
- `clang-tidy.js` — runs static analysis (uses `compile_commands.json` when found)
- `cppcheck.js` — runs `cppcheck --enable=warning,style,performance,portability`

**`Stop`** — fires when Claude Code finishes a response turn:
- `stop-notify.js` — desktop notification (Windows toast / macOS notification / Linux notify-send); deferred until all background agents (`run_in_background: true`) have completed

**`SessionStart`** — fires once when a session begins, warn-only:
- `submodule-status-check.js` — warns if any git submodule is ahead/uninitialized/conflicted
- `claude-md-skills-sync-check.js` — warns if `CLAUDE.md`'s skill list has drifted from `skills/`

**`UserPromptSubmit`** — runs on every user message:
- `skills-reminder.js` — injects a reminder of available skills and their triggers, generated live from `skills/*/SKILL.md` frontmatter

## Skills

| Skill | Description |
|-------|-------------|
| `api-design` | C++ public API structure and hygiene |
| `architecture` | System/module architecture design, ADRs, tradeoffs |
| `changelog` | Keep a Changelog format |
| `commit-rules` | Conventional Commits format |
| `cpp-coding` | C++ implementation conventions |
| `cpp-testing` | Unit test structure (AAA, naming, coverage) |
| `ddd` | Domain-Driven Design patterns in C++ |
| `doxygen` | Doxygen tag coverage for public headers |
| `editing` | File editing workflow (re-read before edit) |
| `hook-scripts` | Writing Claude Code hooks and tools |
| `node-testing` | Conventions for this repo's `test/*.test.js` (node:test) |
| `pr-rules` | PR title, description, merge strategy |
| `project-planning` | Scoping, estimation, milestones, risk, status updates |
| `release` | Semver release workflow |
| `requirements` | Requirements gathering, user stories, acceptance criteria |
| `submodule-sync` | Git submodule sync discipline |

## Installation

Requires Node.js (no npm packages needed).

```
node install.js
```

Copies `hooks/`, `tools/`, and `skills/` into `~/.claude/` and merges `config/settings.json`
into `~/.claude/settings.json` (existing machine-specific settings are preserved).
`CLAUDE.md` and `.git/hooks/pre-commit` are overwritten with backups.

`install.js` writes a manifest at `~/.claude/.claude-config-manifest.json` recording every
created file and every backup. `uninstall.js` reads the manifest and restores the exact
pre-install state byte-for-byte.

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

# Linux / macOS
cp -r hooks tools skills ~/.claude/
```

Then copy or merge `settings.json` into `~/.claude/settings.json`.
