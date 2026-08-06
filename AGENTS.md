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

## Skill ownership map

One line per skill: the single concern it owns, then what it hands off. A rule belongs to
exactly one line. When a rule fits another line's concern, that skill states it and this
one references it — a second statement is not emphasis, it is a copy that drifts, and the
agent reading both has nothing telling it which one wins.

- `architecture` — how modules, services and processes fit together; ADR format; tradeoff axes. Hands off a single interface's own hygiene to `cpp-api-design`, modelling inside one context to `ddd`, the requirement behind the decision to `requirements`.
- `changelog` — the `CHANGELOG.md` file: subsections, bullet wording, what goes in, the release-time rename. Hands off the version number to `release`, the definition of a breaking change to `cpp-api-design`.
- `ci-cd-and-automation` — the pipeline producing the "CI green" signal: what it gates, stage order, flaky checks, who owns a red build. Hands off the per-language checks to `cpp-coding`/`hook-scripts`, merge gating to `pr-rules`, tag automation to `release`, pipeline credentials to `security-and-hardening`.
- `code-review-and-quality` — what a review looks for: the five axes, change size, dependency bumps, orphaned code. Hands off how a finding is worded to `pr-rules`, security depth to `security-and-hardening`, performance depth to `performance-optimization`, public-surface and access review to `cpp-api-design`/`cpp-encapsulation`.
- `comments` — a comment in any language, whatever marker opens it: whether one is justified at all, its length, its timeless character. Hands off Doxygen blocks to `cpp-doxygen`, case history to `commit-rules`.
- `commit-rules` — commit message format, the type vocabulary every artifact reuses, body, branch naming, fixups, banned trailers. Hands off the merge commit's subject and length to `pr-rules`, prose register to `writing-style`.
- `cpp-api-design` — the shape of a public C++ surface: namespacing, dependency leakage, `bool`/`void*` bans, and the definition of a breaking change. Hands off the header guard to `cpp-coding`, doc blocks to `cpp-doxygen`, access levels to `cpp-encapsulation`, retiring a symbol to `deprecation-and-migration`, the bump and the entry to `release`/`changelog`.
- `cpp-coding` — C++ implementation conventions: value semantics, include order, header guard, type safety, RAII, qualifiers, attributes, modern idioms, and the performance idioms always in effect. Hands off the public surface to `cpp-api-design`, comments to `comments`, a specific performance investigation to `performance-optimization`, naming and file layout to the project's `AGENTS.md`.
- `cpp-doxygen` — Doxygen blocks on public C++ headers: one block per type, placement, required tags, groups. Hands off header structure and namespaces to `cpp-api-design`, the guard to `cpp-coding`, every other comment to `comments`.
- `cpp-encapsulation` — the access level of each member of one type, and `friend`. Hands off the surface spanning headers and modules to `cpp-api-design`, aggregate-internal exposure to `ddd`.
- `cpp-testing` — C++ test structure: AAA, names, mandatory boundary cases, isolation, unit scope. Hands off the red-green-refactor order to `test-driven-development`, when a regression test is written to `debugging`.
- `ddd` — modelling inside one bounded context: ubiquitous language, value objects, entities, aggregates, domain services. Hands off where context boundaries fall to `architecture`, C++ mechanics to `cpp-coding`/`cpp-api-design`.
- `debugging` — investigation before a fix: reproduce, root cause, one hypothesis at a time, bisect, error output as evidence, regression test first. Hands off writing the fix to `cpp-coding`, the failing test's shape to `test-driven-development`, instrumentation that stays to `observability-and-instrumentation`.
- `deprecation-and-migration` — retiring a public path: deprecate before removing, compulsory vs advisory, grace period, migration guide, expand/contract for a persisted format. Hands off what counts as breaking to `cpp-api-design`, the bump and the entry to `release`/`changelog`.
- `editing` — the edit mechanic itself: a fresh read immediately before an edit, one read per turn, scope discipline. Owns nothing else and hands off nothing.
- `github-cli` — `gh` mechanics: what each command does, what it publishes, where the CLI help is silent. Hands off every question of what may be written or published to `issue-rules`/`pr-rules`.
- `gitlab-cli` — the same for `glab`.
- `hook-scripts` — writing this repo's hooks and tools: built-ins only, dispatcher/tool split, exit codes, `settings.json` registration. Hands off their tests to `node-testing`, their comments to `comments`.
- `issue-rules` — what an issue contains: title, description templates, labels, priority, milestone, lifecycle, progress comments. Hands off what each type means to `commit-rules`, the commands to the platform skill, the PR side of the workflow to `pr-rules`.
- `node-testing` — conventions for `test/*.test.js`: `node:test` only, flat tests, direct calls over subprocesses, temp-dir fixtures, what to cover. Hands off the red-green-refactor order to `test-driven-development`, the code under test to `hook-scripts`.
- `observability-and-instrumentation` — telemetry for production visibility: signal choice, log levels, structure, metric shape and cardinality, alerting, traces. Hands off bug-chasing instrumentation to `debugging`, secret redaction to `security-and-hardening`, a regression a metric reveals to `performance-optimization`.
- `performance-optimization` — the process around one performance problem: measure first, state the budget, complexity before constants, measure the fix. Hands off the default idioms to `cpp-coding`, review depth to `code-review-and-quality`, production signals to `observability-and-instrumentation`.
- `pr-rules` — the PR: workflow order, title, description structure, review comment and reply wording, pending-by-default, both checklists, merge strategy. Hands off commit and branch format to `commit-rules`, issue content to `issue-rules`, the commands to `github-cli`/`gitlab-cli`, prose register to `writing-style`, what a review should look for to `code-review-and-quality`.
- `project-planning` — stakeholder-facing planning: increments, estimation under uncertainty, dependencies and risk, milestones, status updates. Hands off settled requirements to `requirements`, per-PR size to `pr-rules`, the release tail to `release`.
- `release` — the version number and the mechanical steps to ship it, plus the pre-release checklist. Hands off the changelog edit to `changelog`, whether users may see the result to `shipping-and-launch`, the submodule ref to `submodule-sync`, commit format to `commit-rules`.
- `requirements` — turning an ask into a requirement: actor/goal/context, user stories, acceptance criteria, functional vs non-functional, definition of done, traceability. Hands off design to `architecture`, breakdown into work to `project-planning`, the vocabulary's afterlife to `ddd`.
- `security-and-hardening` — design-time security: trust boundaries, threat modelling, input validation, bounds and integer safety, secrets, least privilege, dependency posture. Hands off memory-safety idioms to `cpp-coding`, the review pass to `code-review-and-quality`, retiring an unsafe path to `deprecation-and-migration`, the investigation itself to `debugging`.
- `shipping-and-launch` — whether a built release may reach users, and how widely: readiness, staged rollout, advance/hold/roll-back thresholds, rollback plan, feature flags, post-launch verification. Hands off the version-bump mechanics to `release`, the monitoring it depends on to `observability-and-instrumentation`, telegraphing a break to `deprecation-and-migration`.
- `submodule-sync` — submodule ref discipline: what each `git submodule status` prefix means and the order of the two commits. `pr-rules` and `release` gate on its check rather than restating it.
- `test-driven-development` — the order of work: red, green, refactor, one behaviour per cycle, real collaborator over a mock. Hands off test structure, naming and coverage to the testing skill of the language being written, reproducing a bug to `debugging`.
- `writing-style` — prose register and vocabulary in any human language, and keyboard-reachable characters. Hands off the structure of every artifact to that artifact's own skill.

Two pairs restate each other on purpose, because no task loads both: `cpp-testing` /
`node-testing` (a task edits one language's tests, and `node-testing` says not to mix the
conventions) and `github-cli` / `gitlab-cli` (a repository has one host). Their shared
principles are stated in each one's own runner and command vocabulary; routing a JS test
task through a `cpp-` prefixed skill for one line would cost more than the duplication.

## Adding a skill

0. Pre-flight check, before creating any file:
   - Confirm the concern isn't already covered by an existing skill here, or by a
     separate plugin (e.g. Qt/QML belongs to `qt-development-skills`, not here).
   - Confirm the new skill owns one clearly bounded concern with no overlap against
     adjacent skills (e.g. `cpp-encapsulation` covers access-specifier rules;
     `cpp-api-design` covers public surface shape — the two must not restate each other).
   - Both checks are read off the skill ownership map above. If the concern already sits
     on a line there, it is a rule for that skill, not a new skill.
1. Name it after the concern, and prefix it with the language when the rules are
   language-specific. The test a reviewer applies: take a rule out of the skill and try
   to state it for another language. If it survives and only the example changes, the
   name stays neutral (`comments`, `ddd`, `code-review-and-quality`). If the rule has to
   be rewritten to mean anything at all — `#pragma once`, `enum class` instead of `bool`,
   `friend`, a Doxygen tag — the name carries the language: `cpp-api-design`,
   `cpp-doxygen`, `cpp-encapsulation`, `node-testing`. A skill bound to a tool rather
   than a language is named after the tool (`hook-scripts`, `github-cli`).
2. Copy `templates/SKILL.md` to `skills/<name>/SKILL.md`
3. Fill in frontmatter (name, description, tags), then decide how it is triggered:
   - `tier` — `process`, `domain`, or `narrow` (see "How a skill reaches the agent")
   - `paths` — the files this skill owns, when a kind of file should trigger it
   - `reminder: false` — only when those files are the *whole* trigger; it drops the
     skill from the every-prompt reminder and leaves it to the edit-time gate
   - `with` — skills that must arrive together with this one, so the pair is never
     half-applied
   - `description` must name the language when the name does, so the one line the
     every-prompt reminder shows is unambiguous without opening the skill
4. Write rules sections following the template structure
5. Add an entry to the skill table in `README.md`
6. Add the skill's line to the skill ownership map above — the concern it owns and what it
   hands off, plus a hand-off line in every skill it takes a concern from
7. Add the skill's trigger line to `config/CLAUDE.md`'s "Skills — auto-apply" section
   (this file is static prose, not regenerated — `tools/skills-reminder.js` reads
   `skills/` directly so it never goes stale, but this file must be updated by hand;
   `tools/claude-md-skills-sync-check.js` warns at session start if you forget)
8. Run `node install.js` to deploy

A skill is one file: `install.js` copies `skills/<name>/SKILL.md` and nothing else from
the skill directory, so a sibling reference file never reaches `~/.claude/` and the
installed skill silently loses whatever it pointed at. Splitting a long skill means
changing that copy loop first.

## Renaming or retiring a skill

The directory name is the skill's identity: the name the Skill tool is called with, the
string `with:` and every cross-reference resolves against, and the path `install.js`
writes under `~/.claude/skills/`. A rename is therefore a repo-wide edit plus one step
for the machines that already carry the old name.

1. `git mv skills/<old> skills/<new>`, and set `name:` in the frontmatter to match the
   new directory — `tools/skill-catalog.js` keys the catalog on the directory, so a
   mismatch between the two is silent
2. Update every reference: `config/CLAUDE.md`, `README.md`, this file, `agents/*.md`,
   `commands/*.md`, the cross-reference lines of other skills, the `with:` frontmatter
   of any skill naming it, and tool comments. `grep -rn '<old>'` must come back empty
   outside `CHANGELOG.md` history
3. Add the old install path to `config/retired.json`
4. Record the rename in `CHANGELOG.md` under `### Changed`
5. Run `node install.js`

Step 3 exists because install can only clean up what its manifest records. On a machine
whose manifest is intact, the prune step deletes the old file install created, or gives
the path back to the content it had before install overwrote it. `config/retired.json`
covers the remaining case: the path survives untracked, so install names it and leaves
the removal to the user rather than deleting a file it may not own.

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
