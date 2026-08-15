# Contributing

## Workflow

The order of work - issue, branch, commits, PR, pre-merge check, merge, close - is stated
in full in `skills/pr-rules/SKILL.md` -> Workflow, and lined up against the pipeline
stage, the state the issue is in and the skills that apply in `AGENTS.md` -> Lifecycle
map. Follow those two; this file does not carry a third version of them.

## Commits and branches

Conventional Commits. The message format, the type vocabulary, the body and the branch
name pattern are owned by `skills/commit-rules/SKILL.md` - read it before the first
commit rather than copying the shape of a nearby one.

Two of its rules are enforced rather than left to the reader: this checkout's pre-commit
hook rejects a commit made directly on a protected branch (`main`, `master`, `dev`,
`develop`), and the `commit-trailer-guard` tool blocks
a `git commit` an agent runs with an AI-attribution trailer in the message.

## Hook and tool scripts

Node built-ins only, and no shell logic inside a script - the only shell is the `node -e`
launcher in `settings.json`; no hardcoded paths, `process.env.CLAUDE_CONFIG_DIR ||
path.join(os.homedir(), '.claude')` instead; exit `0` to allow or warn on stdout and `2`
to block on stderr, never `1`. That is the short form of
`skills/hook-scripts/SKILL.md` -> Hard Rules and Exit Codes, which the rest of a patch to
`hooks/` or `tools/` is read against.

A new tool also has to be routed to and covered by a test, or nothing ever runs it - see
`AGENTS.md` -> Adding a new tool check for the steps.

## Skills

A skill is one file, `skills/<name>/SKILL.md`, plain Markdown loaded at runtime with no
build step. Keep its content to rules and patterns, not explanations of why Claude Code
behaves the way it does.

Creating that file is not the whole job: the frontmatter decides when the skill is
triggered and at which tier, the ownership map states its boundary against its
neighbours, and `config/CLAUDE.md` carries its auto-apply line, which the session-start
check warns about while it is missing. `AGENTS.md` -> Adding a skill carries the steps,
from the pre-flight check against that map through to `node install.js`;
`AGENTS.md` -> Renaming or retiring a skill covers the other direction.

## Tests

Run `npm test` before opening a PR. Conventions for the files under `test/` are in
`skills/node-testing/SKILL.md`.
