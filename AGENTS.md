# AGENTS.md — claude-config

Configuration repository for Claude Code.

## Repository layout

```
hooks/      Event dispatcher scripts (PreToolUse, PostToolUse, Stop)
tools/      Atomic tool scripts invoked by hooks
skills/     Skill definitions loaded by /skill-name slash commands
agents/     Persona subagent definitions (one markdown file per agent)
commands/   Slash command definitions (one markdown file per command)
settings.json   Portable global Claude Code configuration
install.js  Bootstrap script — copies files to ~/.claude/
```

## Hook architecture

Hooks follow dispatcher → tool separation:

- `hooks/<Event>.js` — reads stdin JSON, routes to one or more tools
- `tools/<action>.js` — one responsibility, no side effects outside its purpose

All paths resolved via `process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')`.
No hardcoded user paths anywhere. No npm dependencies.

## Adding a new tool check

1. Create `tools/<name>.js` — reads stdin JSON, writes to stdout (warn) or stderr+exit(2) (block)
2. Add it to the appropriate dispatcher in `hooks/PreToolUse.js` or `hooks/PostToolUse.js`
3. Export pure logic (regexes, helpers) and add tests under `test/<name>.test.js`
   (see `skills/node-testing/SKILL.md` for conventions: flat `test()`, fixtures, `CLAUDE_CONFIG_DIR` isolation)
4. Run `npm test`

See `skills/hook-scripts/SKILL.md` for full hook development conventions.

## How a skill reaches the agent

Two paths, so that a skill arrives when it applies instead of every skill arriving on
every prompt:

- `tools/skills-reminder.js` (`UserPromptSubmit`) lists every skill except those that
  declare `reminder: false`, meaning their `paths:` are the whole trigger. Declaring
  `paths:` alone does not remove a skill from this list: most are triggered by intent
  too, and design work runs before the file that will carry it exists.
- `tools/skill-gate.js` (`PreToolUse` on `Edit`/`Write`/`MultiEdit`/`NotebookEdit`)
  matches the edited file against every skill's `paths:`, adds the skills named in
  their `with:`, subtracts the ones already loaded in this session's transcript, and
  warns with what's left. Loaded skills are tracked per session in
  `session-env/<session_id>.skill-gate.json` against a transcript byte cursor.

Both read `tools/skill-catalog.js`, which parses `tier`/`paths`/`with` out of each
`SKILL.md` frontmatter — the frontmatter is the only place a skill's triggers are
declared, so there is no second list to keep in sync.

When several skills fire on one task they are ordered `process` → `domain` → `narrow`.
The narrower skill rules its own topic and must not restate the wider one.

## Adding a skill

0. Pre-flight check, before creating any file:
   - Confirm the concern isn't already covered by an existing skill here, or by a
     separate plugin (e.g. Qt/QML belongs to `qt-development-skills`, not here).
   - Confirm the new skill owns one clearly bounded concern with no overlap against
     adjacent skills (e.g. `encapsulation` covers access-specifier rules;
     `api-design` covers public surface shape — the two must not restate each other).
1. Copy `templates/SKILL.md` to `skills/<name>/SKILL.md`
2. Fill in frontmatter (name, description, tags), then decide how it is triggered:
   - `tier` — `process`, `domain`, or `narrow` (see "How a skill reaches the agent")
   - `paths` — the files this skill owns, when a kind of file should trigger it
   - `reminder: false` — only when those files are the *whole* trigger; it drops the
     skill from the every-prompt reminder and leaves it to the edit-time gate
   - `with` — skills that must arrive together with this one, so the pair is never
     half-applied
3. Write rules sections following the template structure
4. Add an entry to the skill table in `README.md`
5. Add the skill's trigger line to `config/CLAUDE.md`'s "Skills — auto-apply" section
   (this file is static prose, not regenerated — `tools/skills-reminder.js` reads
   `skills/` directly so it never goes stale, but this file must be updated by hand;
   `tools/claude-md-skills-sync-check.js` warns at session start if you forget)
6. Run `node install.js` to deploy

A skill is one file: `install.js` copies `skills/<name>/SKILL.md` and nothing else from
the skill directory, so a sibling reference file never reaches `~/.claude/` and the
installed skill silently loses whatever it pointed at. Splitting a long skill means
changing that copy loop first.

## Adding an agent

1. Copy `templates/AGENT.md` to `agents/<name>.md`
2. Fill in frontmatter (`name`, `description`, `tools`) and the persona's system prompt
3. Name the skill(s) the persona must apply in the body, so it doesn't have to
   rediscover them from scratch each invocation, and state the boundary — what this
   persona does not do, and which other persona picks that up
4. Write the Composition section: when to invoke the persona directly, which command
   invokes it otherwise, and the standing rule that it must not invoke another persona
   itself — orchestration between personas belongs to commands only
5. Add an entry to the agents table in `README.md`
6. Run `node install.js` to deploy — copied to `~/.claude/agents/<name>.md`

## Adding a command

1. Copy `templates/COMMAND.md` to `commands/<name>.md`
2. Fill in frontmatter (`description`, `argument-hint`) and the orchestration prompt
3. Keep a command's job to *orchestrating* existing skills/agents, not duplicating their
   rules inline
4. Add an entry to the commands table in `README.md`
5. Run `node install.js` to deploy — copied to `~/.claude/commands/<name>.md`

## Idea-to-Release Pipeline

The persona agents (`agents/`) and commands (`commands/`) compose the skill catalog
into a pipeline carrying a task from idea to release:

```
idea → /spec (spec-architect) → /build (implementer) → /ship (code-reviewer + security-auditor → release-manager)
```

| Stage | Command | Agent(s) | Invoke the agent directly, without the command, when… |
|-------|---------|----------|---------------------------------------------------------|
| Spec | `/spec` | `spec-architect` | only a spec or ADR is needed, with no follow-on build |
| Build | `/build` | `implementer` | resuming work on one task that already has a spec |
| Review | (part of `/ship`) | `code-reviewer` | reviewing a diff that isn't ready to ship yet |
| Security audit | (part of `/ship`) | `security-auditor` | auditing a change touching a trust boundary, outside a full ship pass |
| Release | (part of `/ship`) | `release-manager` | cutting a release whose review/audit already happened elsewhere |

Each command is a thin wrapper — see the corresponding `commands/<name>.md` for the
exact handoff. Skills keep auto-applying contextually per `config/CLAUDE.md`'s "Skills
— auto-apply" section regardless of which agent or command is active; an agent exists
to bundle several skills under one persona for a specific pipeline stage, not to
replace skill auto-apply.

## Installation

```
node install.js              # install to ~/.claude/
node install.js --dry-run    # preview without writing
node install.js --no-git-hook # skip .git/hooks/pre-commit copy
node uninstall.js            # full restore to pre-install state
```

`settings.json` is JSON-merged into `~/.claude/settings.json`; existing machine-specific settings are preserved (`defaultMode`, user `allow`/`ask`/`deny` entries). `CLAUDE.md` and git pre-commit hook are overwritten with backups. A manifest at `~/.claude/.claude-config-manifest.json` records every created file and every backup so `uninstall.js` can restore the exact prior state byte-for-byte.

## Tests

```
npm test
```

Tests live in `test/<name>.test.js` using node's built-in `node:test` runner. They cover regex correctness (bash-safety, secret-guard), escape functions (stop-notify), and install/uninstall round-trip against a temp `CLAUDE_CONFIG_DIR`.

## Commit conventions

See `skills/commit-rules/SKILL.md`. Direct commits to `main` are blocked — use feature branches.
