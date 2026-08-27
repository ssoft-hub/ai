# Contributing

## Workflow

The order of work - issue, branch, commits, PR, pre-merge check, merge, close - is stated
in full in `skills/pr-rules/SKILL.md` -> Workflow. The pipeline stage each falls in, the
command or persona carrying it, the state the issue is in and the skills that apply are
in `AGENTS.md` -> Lifecycle map. Follow those two; this file does not carry a third
version of them.

## Commits and branches

Conventional Commits. The message format, the type vocabulary, the body and the branch
name pattern are owned by `skills/commit-rules/SKILL.md` - read it before the first
commit rather than copying the shape of a nearby one.

One of its rules is enforced rather than left to the reader: the `commit-trailer-guard`
tool blocks a `git commit` an agent runs with an AI-attribution trailer in the message.

## Hook and tool scripts

Node built-ins only, and no shell logic inside a script - the only shell is the `node -e`
launcher in `settings.json`; no hardcoded paths, `process.env.CLAUDE_CONFIG_DIR ||
path.join(os.homedir(), '.claude')` instead; exit `0` to allow or warn on stdout and `2`
to block on stderr, never `1`. That is the short form of
`skills/hook-scripts/SKILL.md` -> Hard Rules and Exit Codes, which the rest of a patch to
`hooks/` or `tools/` is read against.

A new tool also has to be routed to and covered by a test, or nothing ever runs it - see
`skills/hook-scripts/SKILL.md` -> Adding or Retiring a Tool for the steps, and
`README.md` -> Hooks for what each dispatcher here routes where.

## Skills

A skill is one file, `skills/<name>/SKILL.md`, plain Markdown loaded at runtime with no
build step. Keep its content to rules and patterns, not explanations of why Claude Code
behaves the way it does.

Creating that file is not the whole job: the frontmatter is the only place a skill's
triggers are declared - the tier it loads in, whether it is announced on every prompt or
only when a file it owns is edited, and the skills that must arrive with it - and the
ownership map states its boundary against its neighbours.
`skills/skill-authoring/SKILL.md` carries the steps for adding, renaming and
retiring; `AGENTS.md` -> Adding a skill, an agent, a command or a tool states where this
repository indexes one and how it deploys it.

## Tests

Run `npm test` before opening a PR. Conventions for the files under `test/` are in
`skills/node-testing/SKILL.md`.
