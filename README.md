# claude-config

[![CI](https://github.com/ssoft-hub/ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ssoft-hub/ai/actions/workflows/ci.yml)

Personal Claude Code configuration — hooks, tools, skills, and an idea-to-release
pipeline of persona agents and commands built on top of them.

## Contents

| Directory | Purpose |
|-----------|---------|
| `hooks/`  | Claude Code event dispatchers (`PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `UserPromptSubmit`) |
| `tools/`  | Atomic tools, one responsibility each: a guard states a verdict its dispatcher calls for; a tool that runs after the fact is spawned as a script |
| `skills/` | Skill definitions (SKILL.md files loaded by `/skill-name`) |
| `agents/` | Persona subagent definitions (one markdown file per agent) |
| `commands/` | Slash command definitions (one markdown file per command) |
| `config/` | What install deploys as configuration: `settings.json` (hooks, permissions, statusline), the `claude-config-rules.md` it writes to `~/.claude/` and imports from the `CLAUDE.md` there, and `retired.json` - paths this repo no longer ships, which install warns about but never deletes; plus `skill-contexts.json`, the contexts a skill's `bound-to` draws from, which install never deploys |

## Hooks

**`PreToolUse`** — runs before every tool call, routed by payload rather than by tool name: any tool carrying a `command` string reaches the command guards, and any tool naming a write target together with its content reaches the write guards. A command is checked for what it does, not for which tool was asked to run it, so a second shell or an MCP server cannot slip past by being spelled differently. The dispatcher calls each guard inside the dispatcher's own process instead of starting one process per guard, so the pause in front of a guarded call does not grow with the number of guards; a guard whose file is missing or broken costs that guard and a line on stderr, never the session:
- `bash-safety.js` — blocks destructive shell commands (`rm -rf /`, `format C:`), warns on reversible-but-risky ones (`git reset --hard`, `DROP TABLE`), and prompts before `git push`. Rules read the command as argv, so a prefix (`sudo`, `env`, `VAR=x`), a git global option (`git -C <dir> push`), a git alias, or an interpreter carrying the command (`bash -c`, `powershell -EncodedCommand`, `node -e`) does not hide it, and a command named inside a quoted argument does not trigger it
- `commit-trailer-guard.js` — blocks `git commit` commands containing banned AI-attribution trailers (`Co-Authored-By`, `Generated-by`)
- `review-publish-guard.js` — prompts for confirmation before a `gh` command that publishes review feedback on the spot (`gh pr review --comment/--approve/--request-changes`, `gh pr comment`, REST `in_reply_to`, an `event` field on `POST /pulls/{n}/reviews`, `submitPullRequestReview`, and a thread reply carrying no `pullRequestReviewId`); the pending-review path stays unprompted
- `secret-guard.js` — blocks writes (`Edit`/`Write`/`MultiEdit`/`NotebookEdit`) and shell commands containing private keys, AWS keys, GitHub PATs; warns on probable credentials
- `skill-gate.js` — on the same write payloads, and on any command that writes a file (redirection, `tee`, `Set-Content`/`Add-Content`/`Out-File`, `cp`/`mv` destination), names the skills that claim the written file (their `paths:` frontmatter) plus the ones they list in `with:`, minus whatever the agent making the call has already loaded; the first offending call is denied until the skills are loaded, a repeat of the same file and missing set only warns. A subagent is gated on its own loads, read from its own transcript, and the main agent's loads do not vouch for it

**`PostToolUse`** — runs after a tool call, on two routes read off the payload the same way: a path arriving with the content written to it, or one of `Edit` / `Write` / `MultiEdit` / `NotebookEdit` naming a path with no content field, reaches the write tools; a call marked `run_in_background: true` reaches the counter. A path named for reading reaches nothing. The three lint tools run only on C++ files (`.h`, `.hpp`, `.cpp`, `.cc`, `.cxx`):
- `background-call-counter.js` — counts a call started in the background, whichever tool made it, as work the `Stop` notification below must wait for. Such a call returns the moment it is launched, so this runs while the work is still going; a call refused at any gate never reaches this hook, and is never counted
- `comment-check.js` — runs on every file whose comment syntax it knows (`//`, `/* */`, `#`, `--`, `;`, `%`, `<!-- -->`), no config file needed; reminds to check any newly added non-doc comment against the `comments` skill
- `clang-format.js` — formats in-place; requires `.clang-format` in this repository (searched from the edited file up to the git root, never into a parent repo) — skips silently if missing, or if `clang-format` isn't in PATH
- `clang-tidy.js` — runs static analysis; requires `.clang-tidy` (uses `compile_commands.json` when found)
- `cppcheck.js` — runs `cppcheck --enable=warning,style,performance,portability --std=c++20 --error-exitcode=1 …`; requires `.cppcheck`, passed as `--suppressions-list`

**`Stop`** — fires when Claude Code finishes a response turn:
- `stop-notify.js` — desktop notification (Windows toast / macOS notification / Linux notify-send); deferred until every call started in the background (`run_in_background: true`) has completed

**`SessionStart`** — fires once when a session begins:
- `session-env-prune.js` — removes the `skill-gate.js` state of every session that has gone a week without a gated call, keeping the state of the session being started whatever its age; it runs here rather than in the gate so that no gated call ever pays for a directory listing, and it takes only the files the gate wrote, never the per-session directory Claude Code keeps beside them
- `submodule-status-check.js` — warns when a git submodule has a checked-out commit differing from the one the superproject records, is uninitialized, or is conflicted

**`UserPromptSubmit`** — runs on every user message:
- `skills-reminder.js` — injects a reminder of the available skills, generated live from `skills/*/SKILL.md` frontmatter; a skill declaring `reminder: false` is left to `skill-gate.js` alone

## Statusline

`statusline.js` renders the line under the prompt from the payload Claude Code writes to
its stdin — no API call, no transcript parsing:

```
[Opus 5 (1M context)] [effort high] [Context 34%] [5h 42% 2026-08-07T14:12] [7d 61% 2026-08-10T16:00] [main]
```

The model, effort and branch badges are dim; `Context` and the two rate-limit windows are
green below 60%, yellow to 84%, red from 85%. Each limit carries the moment it resets, in
local time. A badge is left out when the payload does not carry it — the rate-limit
windows only appear once the API has returned its usage headers, and the branch only
inside a repository (read from `.git/HEAD`, without spawning `git`, with control bytes
stripped and the length capped, since that file is writable by anything that can reach
the checkout).

Claude Code accepts a single `statusLine` command, so registering this one displaces
whatever was there — a plugin's own statusline included. That output is not lost: install
records the displaced command, and the line puts its text back in front of the badges.
Whose command it is, what it draws, and which files it reads are never the tool's business
— it knows one recorded command string, and `node uninstall.js` hands the slot back
untouched.

The displaced command never runs on the rendering path. Each render prints the text the
previous run left in `.statusline-displaced` — around half a millisecond, the payload and
two small file reads — and, when that cache is older than two seconds, leaves a detached
process behind to run the command and refresh it. A command taking a third of a second
therefore costs nothing per keystroke, and its badge trails by one render at most. If it
fails or times out its text is simply absent; nothing else about the line changes.

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
| `skill-authoring` | Writing a skill file — its concern, name, contexts, section markers, rename |
| `submodule-sync` | Git submodule sync discipline |
| `test-driven-development` | Fail-pass-refactor workflow, before writing implementation code |
| `writing-style` | Prose register and vocabulary — no slang, no unnecessary borrowings, per language |

## Agents

Persona subagents forming an idea-to-release pipeline. Each is scoped to one stage and
carries the `Skill` tool to load the skills it applies, rather than restating their rules
— see `templates/AGENT.md`. Where each stage sits against the issue lifecycle, and which
stages no agent or command covers, is mapped in `AGENTS.md` → Lifecycle map. When to
invoke a persona directly rather than through its command is stated in that persona's
own Composition section.

| Agent | Stage |
|-------|-------|
| `spec-architect` | Spec |
| `implementer` | Build |
| `code-reviewer` | Review |
| `security-auditor` | Security audit |
| `release-manager` | Release |

## Commands

Slash commands orchestrating the agents above into the idea-to-release pipeline.

| Command | Orchestrates |
|---------|---------------|
| `/spec <idea>` | `spec-architect` — produces a specification (and ADR when warranted) |
| `/build <task>` | `implementer` — implements one task by TDD from an existing spec |
| `/ship [scope]` | `code-reviewer` + `security-auditor` in parallel → go/no-go → `release-manager` on go |
| `/review-loop <tool(s)> [quick..ultra] [scope]` | caller-chosen tool(s) at a tool-agnostic depth, review → fix → re-review until clean or 3 passes, in the current checkout or an isolated one |

## Installation

Requires Node.js (no npm packages needed).

```
node install.js
```

Copies `hooks/` (without `hooks/README.md`, which is not part of `~/.claude/`), `tools/`,
`agents/` and `commands/` into `~/.claude/`, one `SKILL.md` per skill into
`~/.claude/skills/<name>/`, and `config/claude-config-rules.md` to
`~/.claude/claude-config-rules.md`;
`config/settings.json` is merged into `~/.claude/settings.json` (existing machine-specific
settings are preserved). `agents/` and `commands/` are optional — installing without
either is not an error. Every file install overwrites is backed up and recorded before it
is written — `settings.json` and `CLAUDE.md` are the two exemptions, because each is
merged and reverted by subtracting install's own additions rather than snapshot-replaced.
`~/.claude/CLAUDE.md` is the user's own file: install adds one `@claude-config-rules.md`
import line to it, or creates it holding that line alone, and uninstall subtracts exactly
what it added.

`install.js` writes a manifest at `~/.claude/.claude-config-manifest.json` recording every
created file, every backup, and exactly which hooks and permissions it merged into
`settings.json`. `uninstall.js` reads the manifest and reverses each: created files are
removed, every backed-up file is restored to its pre-install content byte for byte, and
`settings.json` is reverted by **subtracting only the entries install added** — so hooks
or permissions added to it afterwards by other tools or by hand are kept intact. A hook
command this repository ships counts as install's own even when install found it already
in the file: it launches a dispatcher uninstall removes, so leaving it registered would
leave a hook with nothing to run. A permission entry names no file install removes, so
one already in place stays the user's and survives uninstall.

Re-running `install.js` performs an in-place **upgrade**: files are refreshed, files a
previous install created but the current repo no longer ships are pruned, and the
`settings.json` merge is re-synced — a hook whose launcher command changed is replaced
rather than duplicated. The manifest tracks `installedAt` and `updatedAt`.

```
node install.js --dry-run      # preview without writing
node uninstall.js              # full restore using manifest
node uninstall.js --dry-run    # preview what would be restored
```

## Tests

```
npm test
```

Uses node's built-in `node:test` runner, so there is nothing to install first. Each
`test/<name>.test.js` takes one unit: a tool, the dispatcher that routes to it, a step of
install, or the body of a skill. Between them they exercise the payloads a guard decides
on and the decision it returns, the skill and agent frontmatter the routing reads, the
`settings.json` merge, an install/uninstall round trip against a temporary
`CLAUDE_CONFIG_DIR` rather than the real one, the rule that every script under `test/` is a
test file, since the runner loads each of them as one, the rule that no path
`config/retired.json` retires is one install still ships, the context each skill declares in
`bound-to` and what a routing may name or has to state by role under it, the force
marker under every `##` heading of the skill template and of each skill declaring
`rubric: applied`, and the rule that no colour word in `skills/*/SKILL.md` or `AGENTS.md`
stands for a state, the proper name of a practice aside.

## Manual setup

For a machine without Node, or to see exactly what lands where. The copies below place
the same files `node install.js` does; the two steps after them are the ones no copy
reproduces.

```powershell
# Windows (PowerShell)
$dest = "$env:USERPROFILE\.claude"
foreach ($d in 'hooks', 'tools', 'agents', 'commands', 'skills') {
    New-Item -ItemType Directory -Force "$dest\$d" | Out-Null
}
Get-ChildItem hooks -Exclude README.md | Copy-Item -Destination "$dest\hooks" -Recurse -Force
Copy-Item -Recurse -Force tools\*    "$dest\tools"
Copy-Item -Recurse -Force agents\*   "$dest\agents"
Copy-Item -Recurse -Force commands\* "$dest\commands"
Get-ChildItem skills -Directory | ForEach-Object {
    New-Item -ItemType Directory -Force "$dest\skills\$($_.Name)" | Out-Null
    Copy-Item "$($_.FullName)\SKILL.md" "$dest\skills\$($_.Name)\SKILL.md"
}
Copy-Item config\claude-config-rules.md "$dest\claude-config-rules.md"
# Import it from CLAUDE.md, once, keeping whatever that file already holds
$claudeMd = "$dest\CLAUDE.md"
if (-not (Test-Path $claudeMd)) { Set-Content $claudeMd "@claude-config-rules.md" }
elseif (-not (Select-String -Path $claudeMd -SimpleMatch "@claude-config-rules.md" -Quiet)) {
    Add-Content $claudeMd "`n@claude-config-rules.md"
}
```

```sh
# Linux / macOS
dest=~/.claude
mkdir -p "$dest"/hooks "$dest"/tools "$dest"/agents "$dest"/commands "$dest"/skills
for f in hooks/*; do
    case "$(basename "$f")" in README.md) continue;; esac
    cp -R "$f" "$dest/hooks/"
done
cp -R tools/* "$dest/tools/"
cp -R agents/* "$dest/agents/"
cp -R commands/* "$dest/commands/"
for d in skills/*/; do
    [ -f "$d/SKILL.md" ] || continue
    mkdir -p "$dest/skills/$(basename "$d")"
    cp "$d/SKILL.md" "$dest/skills/$(basename "$d")/SKILL.md"
done
cp config/claude-config-rules.md "$dest/claude-config-rules.md"
# Import it from CLAUDE.md, once, keeping whatever that file already holds
if ! grep -qF '@claude-config-rules.md' "$dest/CLAUDE.md" 2>/dev/null; then
    [ -s "$dest/CLAUDE.md" ] && printf '\n' >> "$dest/CLAUDE.md"
    printf '@claude-config-rules.md\n' >> "$dest/CLAUDE.md"
fi
```

`hooks/README.md` is left out on purpose: nothing under `~/.claude/` reads it, since it
documents the dispatchers for a reader of this repository. Each skill contributes its
`SKILL.md` and nothing else from its directory, which is why the skills are copied one at
a time rather than as a tree.

One step remains:

- **`config/settings.json`.** Copy it to `~/.claude/settings.json` if that file does not
  exist yet. If it does, merge by hand: add this repository's `hooks` entries and
  `permissions` to what is already there, and take over the single `statusLine` slot. A
  plain copy would drop every machine-local setting the file already holds.

Manual setup writes no manifest, so it cannot be undone by `node uninstall.js` - that
command reverses what `install.js` recorded, and knows nothing about files copied by
hand. Nothing is backed up either: an existing `~/.claude/settings.json` is overwritten
and gone. `~/.claude/CLAUDE.md` is the exception — the two commands above add one import
line to it and keep the rest, and skip even that where the line is already there, so
they can be re-run without stacking a second one. Re-running the copies upgrades the
files this checkout ships, but
leaves behind any file an earlier version installed and this one no longer has.
