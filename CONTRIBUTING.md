# Contributing

## Commit format

Conventional Commits — see `skills/commit-rules/SKILL.md` for full rules.

```
type(scope): subject
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`.
Subject: imperative mood, lowercase after colon, ≤ 72 chars total.
Body: describe what changed and why. Do not enumerate file names or reference commit hashes.

No `Co-Authored-By` or AI-attribution trailers.

## Hook and tool scripts

- Node.js built-ins only — no npm, no third-party `require`
- No hardcoded paths — use `process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')`
- Exit codes: `0` = allow/warn (stdout), `2` = block (stderr). Never `1`.

See `skills/hook-scripts/SKILL.md` for full conventions.

## Skills

Each skill lives in `skills/<name>/SKILL.md`. Skills are plain Markdown loaded
by Claude Code at runtime — no build step.

Keep skill content focused on rules and patterns, not explanations of why
Claude Code works the way it does.

Use `templates/SKILL.md` as the starting template when creating a new skill:

1. Copy `templates/SKILL.md` to `skills/<name>/SKILL.md`
2. Fill in frontmatter (name, description, tags)
3. Write rules sections following the template structure
4. Add entry to the skill table in `README.md`
5. Run `node install.js` to deploy

## Branches

Work on feature branches. Direct commits to `main` are blocked by the pre-commit hook.

Branch naming: `<owner>/feat/<topic>`, `<owner>/fix/<topic>`, `<owner>/chore/<topic>`.
