# AGENTS.md — claude-config

Configuration repository for Claude Code.

## Repository layout

```
hooks/      Event dispatcher scripts (PreToolUse, PostToolUse, Stop)
tools/      Atomic tool scripts invoked by hooks
skills/     Skill definitions loaded by /skill-name slash commands
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
3. Run `node hooks/_test.js` (if present) or test manually

See `skills/hook-scripts/SKILL.md` for full hook development conventions.

## Adding a skill

1. Create `skills/<name>/SKILL.md`
2. Add an entry to the skill table in `README.md`
3. Run `node install.js` to deploy

## Installation

```
node install.js           # install to ~/.claude/
node install.js --dry-run # preview what would be copied
```

settings.json is skipped if `~/.claude/settings.json` already exists — merge manually.

## Commit conventions

See `skills/commit-rules/SKILL.md`. Direct commits to `main` are blocked — use feature branches.
