# claude-config

Personal Claude Code configuration — hooks, tools, and skills.

## Contents

| Directory | Purpose |
|-----------|---------|
| `hooks/`  | Claude Code event dispatchers (`PreToolUse`, `PostToolUse`, `Stop`) |
| `tools/`  | Atomic tool scripts invoked by hooks |
| `skills/` | Skill definitions (SKILL.md files loaded by `/skill-name`) |
| `settings.json` | Portable global configuration (hooks + plugins) |

## Hooks

**`PreToolUse`** — runs before every tool call:
- `bash-safety.js` — blocks destructive shell commands (`rm -rf /`, `format C:`), warns on reversible-but-risky ones (`git reset --hard`, `DROP TABLE`)
- `secret-guard.js` — blocks writes containing private keys, AWS keys, GitHub PATs; warns on probable credentials

**`PostToolUse`** — runs after `Edit` / `Write` on C++ files (`.h`, `.hpp`, `.cpp`, `.cc`, `.cxx`):
- `clang-format.js` — formats in-place (skips silently if `clang-format` not in PATH)
- `clang-tidy.js` — runs static analysis (uses `compile_commands.json` when found)
- `cppcheck.js` — runs `cppcheck --enable=warning,style,performance,portability`

**`Stop`** — fires when Claude Code session ends:
- `stop-notify.js` — desktop notification (Windows toast / macOS notification / Linux notify-send)

## Skills

| Skill | Description |
|-------|-------------|
| `api-design` | C++ public API structure and hygiene |
| `changelog` | Keep a Changelog format |
| `commit-rules` | Conventional Commits format |
| `cpp-coding` | C++ implementation conventions |
| `cpp-testing` | Unit test structure (AAA, naming, coverage) |
| `ddd` | Domain-Driven Design patterns in C++ |
| `doxygen` | Doxygen tag coverage for public headers |
| `editing` | File editing workflow (re-read before edit) |
| `hook-scripts` | Writing Claude Code hooks and tools |
| `pr-rules` | PR title, description, merge strategy |
| `release` | Semver release workflow |
| `submodule-sync` | Git submodule sync discipline |

## Installation

Requires Node.js (no npm packages needed).

```
node install.js
```

Copies `hooks/`, `tools/`, and `skills/` into `~/.claude/` and optionally installs `settings.json`.

See [install.js](install.js) for options and dry-run mode.

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
