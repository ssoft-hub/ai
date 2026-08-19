# AGENTS.md — claude-config

Configuration repository for Claude Code.

## Repository layout

```
hooks/      Event dispatcher scripts (PreToolUse, PostToolUse, Stop, SessionStart,
            UserPromptSubmit), and hooks/git/ which install writes to .git/ instead
tools/      Atomic tool scripts invoked by hooks
skills/     Skill definitions loaded by /skill-name slash commands
agents/     Persona subagent definitions (one markdown file per agent)
commands/   Slash command definitions (one markdown file per command)
config/     What install deploys as configuration: settings.json, the CLAUDE.md it
            writes to ~/.claude/, and retired.json — paths this repo no longer ships
lib/        Pure helpers shared by install.js and uninstall.js
templates/  Starting points for a new skill, agent or command
test/       One test file per unit, run by npm test
install.js  Bootstrap script — copies files to ~/.claude/
```

## Hook architecture

Hooks follow dispatcher → tool separation:

- `hooks/<Event>.js` — reads stdin JSON, routes to one or more tools
- `tools/<action>.js` — one responsibility, no side effects outside its purpose

`hooks/PreToolUse.js` routes on the payload rather than the tool name: a `command` string
reaches the command guards (`bash-safety`, `commit-trailer-guard`, `review-publish-guard`,
`secret-guard`, `skill-gate`), a write target arriving with its content reaches the
write guards (`secret-guard`, `skill-gate`). Tool names are an open set — a second shell, an MCP server,
a plugin's edit tool — and a name-keyed guard is bypassed silently by anything not on the
list, since the dispatcher then finds no entry and exits 0. A payload carrying both a
command and a write target reaches both sets. The name map that remains holds the tools
whose payload alone would not say what they do: the four edit tools, whose call may name a
path with no content beside it.

`hooks/PostToolUse.js` reads the same rule for the write it runs after: a path arriving with
its content, or one of the four edit tools naming a path with no content field. The name
check it keeps is not a shortcut — `Read` carries `file_path` too, and formatting a file that
was only read would rewrite it — and it widens that one rule rather than standing in for
the payload, so no call is hidden from a route by the name it arrived under.

It carries a second route beside the write one: `run_in_background: true` reaches
`background-call-counter`, which `hooks/Stop.js` reads to hold its notification back until
the work is done. The route sits before the write target is read, since a background call
names no file. This is the event for it rather than `PreToolUse`, because a background call
returns at launch and the hook fires there — early enough that the count is written while
the work still runs, and never at all for a call that was refused, whether by a guard
exiting 2, by a JSON deny on exit 0, by a `deny` rule in `settings.json`, or by the user
declining the prompt. None of those reach `PostToolUse`, so the count needs no knowledge of
them: it counts calls that ran.

`tools/payload.js` states those rules for the tools, and each dispatcher states the ones it
routes on again for itself: reading them out of `tools/` would put a require the dispatcher
needs in order to start in front of every tool call, and one missing file there would take
the session with it. `test/payload.test.js` runs every copy over every payload shape and
fails when they disagree, so the duplication cannot drift.

A guard exports one entry, `verdict(payload)`, which returns nothing, `{ block }` for stderr
and exit 2, or `{ output }` for stdout. `hooks/PreToolUse.js` calls that entry in the
dispatcher's own process, and the guard's `require.main === module` hands the same function to
`runAsScript` in `tools/guard.js` — the single place a verdict becomes output, so the two
paths that reach a guard cannot answer one payload differently. `test/guard.test.js` runs
both over the same payloads and compares what each wrote and exited with. The dispatcher
loads a guard where it calls it, inside a try: a file that is missing, throws on load,
throws on the payload, or exports no `verdict` costs that one guard and a line on stderr
naming it, never the dispatcher and never the session. A guard that never returns is the one
failure that try cannot hold — a synchronous `verdict` cannot be interrupted from inside the
process it runs in, so it spends the hook's whole timeout and no guard decides at all; what
that costs a guard author is stated in `skills/hook-scripts/SKILL.md` → Tool Skeleton.
That is what the rule against requiring `tools/` was protecting, kept without a process per
guard: the pause in front of a guarded call is two node startups rather than one per guard
on top of two. `hooks/PostToolUse.js` still spawns its tools; they run after the call and
take no payload verdict.

A guard keyed on a command reads it as argv, never as text. `tools/shell-lex.js` lexes a
command string into the argv of every command it runs: a transparent prefix (`sudo`,
`env`, `xargs`, `VAR=x`) is dropped so the command word is the one that decides what runs,
a quoted argument stays one opaque token so prose naming a command gates nothing, and an
interpreter's own argument is read as a command string in its own right — `bash -c`,
`cmd /c`, `powershell -Command` and its base64 `-EncodedCommand`, and the string a
`node -e` or `python -c` script hands to its exec function, three quoting levels deep.
`tools/git-command.js` reads that argv as a git call: the global options git accepts
before the subcommand (`-C <dir>`, `-c <name>=<value>`, `--git-dir=<path>`, …) are skipped
and an alias is resolved to the subcommand it stands for, whether it was defined with
`-c alias.x=…` or in a git config file, so a rule states the subcommand alone. A rule
written as a regex over the raw command string inherits every defect at once: it misses
each form that spells the same call differently, and it fires on the call named inside a
commit message.

Only rules whose subject is not a command stay on the raw text — the SQL warnings in
`bash-safety`, since `psql -c "DROP TABLE users"` carries its subject inside the quotes
that argv makes opaque.

All paths resolved via `process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')`.
No hardcoded user paths anywhere. No npm dependencies.

`tools/statusline.js` is the exception to the dispatcher → tool split: `statusLine` in
`settings.json` calls its exported `main()` directly, with no dispatcher in between,
because there is only one such command and no routing to do. That single slot shapes the
rest: `lib/settings.js` treats `statusLine` as a replaced key so install records the
command it displaced and uninstall puts it back, and the tool prepends that command's
output rather than reimplementing what it drew. The command string is the only thing it
knows about it — never a path, a file, or a plugin name — and running it happens in a
detached process whose result lands in a cache the next render reads, so a third party's
cost never reaches the rendering path.

## Adding a new tool check

1. Create `tools/<name>.js` — reads stdin JSON, writes plain text to stdout (warn) or
   stderr+exit(2) (block)
2. Add it to the dispatcher of the event it belongs to — `hooks/PreToolUse.js`,
   `hooks/PostToolUse.js`, `hooks/SessionStart.js`, `hooks/UserPromptSubmit.js` or
   `hooks/Stop.js`. Which channel carries the text to the model is the event's, not the
   tool's: on `PreToolUse` and `PostToolUse` the dispatcher wraps it in the
   `additionalContext` the model reads, while on `SessionStart` and `UserPromptSubmit`
   plain stdout on exit 0 reaches the model as written and the dispatcher forwards it
   unchanged — so a tool that wrapped its own output there would have the wrapper read
   back as the text (see `skills/hook-scripts/SKILL.md` → Reaching the Model)
3. Export pure logic (regexes, helpers) and add tests under `test/<name>.test.js`
   (see `skills/node-testing/SKILL.md` for conventions: flat `test()`, fixtures, `CLAUDE_CONFIG_DIR` isolation)
4. Run `npm test`

Retiring one is the same list read backwards: drop it from the dispatcher, delete it and
its test, update every reference to it (`README.md` lists every tool under its hook
event), and add its installed path (`tools/<name>.js`) to `config/retired.json` — for
the same reason a retired skill goes there, stated under "Renaming or retiring a skill".

See `skills/hook-scripts/SKILL.md` for full hook development conventions.

## How a skill reaches the agent

Two paths, so that a skill arrives when it applies instead of every skill arriving on
every prompt:

- `tools/skills-reminder.js` (`UserPromptSubmit`) lists every skill except those that
  declare `reminder: false`, meaning their `paths:` are the whole trigger. Declaring
  `paths:` alone does not remove a skill from this list: most are triggered by intent
  too, and design work runs before the file that will carry it exists.
- `tools/skill-gate.js` (`PreToolUse` on `Edit`/`Write`/`MultiEdit`/`NotebookEdit`,
  and on any tool carrying a shell command for the file that command writes to — a redirection, `tee`,
  `Set-Content`/`Add-Content`/`Out-File`, or a `cp`/`mv` destination) matches the
  written file against every skill's `paths:`, adds the skills named in their `with:`,
  and subtracts the ones the agent making the call has already loaded. The first call
  left with missing skills is denied with instructions to load them and retry; a
  repeat of the same file and missing set warns instead, so an agent without the
  Skill tool is slowed once, never deadlocked.

  Loaded skills and spent denies are tracked per agent, against a transcript byte
  cursor. Which agent is making the call comes from `agent_id` in the payload, which
  Claude Code sets only inside a subagent — so the main thread keeps
  `session-env/<session_id>.skill-gate.json` and a subagent gets
  `session-env/<session_id>.<agent_id>.skill-gate.json`. Both halves of that split are
  needed: a subagent's turns are not written to `transcript_path` at all but to
  `<dirname(transcript_path)>/<session_id>/subagents/agent-<agent_id>.jsonl`, so a gate
  reading the session transcript sees every skill the main agent loaded and none of the
  ones the subagent did. Keyed on the session alone it answers the wrong agent in both
  directions — vouching for a persona's edit with the main agent's loads, and spending a
  persona's deny against the main agent's next call. That path is the construction Claude
  Code makes rather than a guess at it: it builds the session transcript as
  `<project dir>/<session_id>.jsonl` and the subagents directory as
  `<project dir>/<session_id>/subagents`, so the directory holding `transcript_path` is
  the project directory in both.

  One detail of that transcript is read off what Claude Code writes rather than off a
  documented contract: the skill name arrives under `input.skill` on a main thread but
  under `input.command` from a subagent, so both keys are read. It fails safe — a shape
  neither key matches leaves the transcript unreadable, which costs a deny and then
  warns, so the gate loses precision, never the ability to let work through.

  Every id the gate puts in one of those paths must be a plain identifier, and one that
  is not is carried as a digest of itself: `session_id` names a directory and part of a
  file name, `agent_id` names both a file and part of one, and neither may walk out of
  the tree it belongs to. Hashing rather than dropping keeps each agent distinct — an id
  dropped for being unplain would pool that agent back into the session, which is the
  case the check exists for.

  `tools/session-env-prune.js` takes a state file away once its session has gone a week
  without a gated call, and it runs on `SessionStart` rather than on the write. A sweep in
  the gate would put a directory listing in front of every gated call, growing with the
  files it exists to remove; session start costs the gate nothing and fires exactly when
  the directory can have grown, since a machine that starts no further session writes no
  further state either. The state of the session being started is kept whatever its age,
  including the `unknown` name a payload carrying no session id writes to, so resuming an
  old session does not spend its denials a second time. Only the two
  `.skill-gate.json` names above are taken: `session-env/` is Claude Code's directory, and
  the per-session directory it keeps there is not this repository's to delete. Losing a
  state file early costs a full transcript rescan and one deny spent again, never more —
  `size` and `skills` are a cache over the transcript and are rebuilt from it, and an empty
  `denied` denies where it would have warned, never the reverse.

  A state file carries a `version`. Version 1 is the first whose `denied` map belongs to
  a single agent; a file without one predates the agent key and pooled every agent in the
  session into that map, so the read that stamps it drops `denied` and keeps `size` and
  `skills`, which were the main agent's own all along. Dropping errs the safe way: a
  cleared key costs one extra deny and is then rewritten, while a kept one would credit
  the main agent with a persona's denial and downgrade its next genuine deny to a
  warning.

Both read `tools/skill-catalog.js`, which parses `tier`/`paths`/`with` out of each
`SKILL.md` frontmatter — the frontmatter is the only place a skill's triggers are
declared, so there is no second list to keep in sync.

When several skills fire on one task they are ordered `process` → `domain` → `narrow`.
The narrower skill rules its own topic and must not restate the wider one.

Neither path reaches a persona agent on its own: a persona invocation is not a user
prompt, so the every-prompt reminder never reaches one. The edit-time gate is the only
mechanism that can, and it fires only for a persona that edits files — for a read-only
persona such as `code-reviewer` or `security-auditor`, neither does, and the skills its
body names are the only ones it starts from. Every persona in `agents/` therefore
carries the `Skill` tool and names the skills it loads, under the same rule that holds
between two skills — it names them and does not restate them. The deny-once rule above is
for an agent that genuinely cannot load a skill, not for a persona.

## Skill ownership map

One line per skill: the single concern it owns, then what it hands off. A rule belongs to
exactly one line. When a rule fits another line's concern, that skill states it and this
one references it — a second statement is not emphasis, it is a copy that drifts, and the
agent reading both has nothing telling it which one wins.

- `architecture` — how modules, services and processes fit together; ADR format; tradeoff axes; which quality a design may give up for another, under Quality Priorities. Hands off a single interface's own hygiene to `cpp-api-design`, modelling inside one context to `ddd`, the requirement behind the decision to `requirements`, and measuring a ranked quality rather than ranking it to `security-and-hardening`, `performance-optimization` and `observability-and-instrumentation`.
- `changelog` — the `CHANGELOG.md` file: subsections, bullet wording, what goes in, the release-time reconciliation and rename. Hands off the version number to `release`, the definition of a breaking change to `cpp-api-design`.
- `ci-cd-and-automation` — the pipeline producing the "CI green" signal: what it gates, stage order, flaky checks, who owns a red build. Hands off the per-language checks to `cpp-coding`/`hook-scripts`, merge gating to `pr-rules`, tag automation to `release`, pipeline credentials to `security-and-hardening`.
- `code-review-and-quality` — what a review looks for: the five axes, change size, dependency bumps, orphaned code. Hands off how a finding is worded to `pr-rules`, security depth to `security-and-hardening`, performance depth to `performance-optimization`, public-surface and access review to `cpp-api-design`/`cpp-encapsulation`.
- `comments` — a comment in any language, whatever marker opens it: whether one is justified at all, its length, its timeless character. Hands off Doxygen blocks to `cpp-doxygen`, case history to `commit-rules`.
- `commit-rules` — commit message format, the type vocabulary every artifact reuses, the body and its one-paragraph budget, branch naming, fixups, banned trailers. Hands off the merge commit's subject and length to `pr-rules`, prose register and the result-not-process rule to `writing-style`.
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
- `pr-rules` — the PR: workflow order, title, description structure and its per-section length budget, review comment and reply wording, pending-by-default, both checklists, merge strategy. Hands off commit and branch format to `commit-rules`, issue content to `issue-rules`, the commands to `github-cli`/`gitlab-cli`, prose register and the result-not-process rule to `writing-style`, what a review should look for to `code-review-and-quality`.
- `project-planning` — stakeholder-facing planning: increments, estimation under uncertainty, dependencies and risk, milestones, status updates. Hands off settled requirements to `requirements`, per-PR size to `pr-rules`, the release tail to `release`.
- `release` — the version number and the mechanical steps to ship it, plus the pre-release checklist. Hands off the changelog edit to `changelog`, whether users may see the result to `shipping-and-launch`, the submodule ref to `submodule-sync`, commit format to `commit-rules`.
- `requirements` — turning an ask into a requirement: actor/goal/context, user stories, acceptance criteria, functional vs non-functional, definition of done, traceability. Hands off design to `architecture`, breakdown into work to `project-planning`, the vocabulary's afterlife to `ddd`.
- `security-and-hardening` — design-time security: trust boundaries, threat modelling, input validation, bounds and integer safety, secrets, least privilege, dependency posture. Hands off memory-safety idioms to `cpp-coding`, the review pass to `code-review-and-quality`, retiring an unsafe path to `deprecation-and-migration`, the investigation itself to `debugging`.
- `shipping-and-launch` — whether a built release may reach users, and how widely: readiness, staged rollout, advance/hold/roll-back thresholds, rollback plan, feature flags, post-launch verification. Hands off the version-bump mechanics to `release`, the monitoring it depends on to `observability-and-instrumentation`, telegraphing a break to `deprecation-and-migration`.
- `submodule-sync` — submodule ref discipline: what each `git submodule status` prefix means and the order of the two commits. `pr-rules` and `release` gate on its check rather than restating it.
- `test-driven-development` — the order of work: red, green, refactor, one behaviour per cycle, real collaborator over a mock. Hands off test structure, naming and coverage to the testing skill of the language being written, reproducing a bug to `debugging`.
- `writing-style` — prose register and vocabulary in any human language, keyboard-reachable characters, result-not-process (no work log, no deliberation), and figures that go stale (run counts, coverage, timings, a hash from a branch under review). Hands off the structure of every artifact to that artifact's own skill, and each artifact's own length budget to that skill: the commit body's paragraph to `commit-rules`, the PR description's per-section budget to `pr-rules`.

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
7. Run `node install.js` to deploy

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
2. Update every reference: `README.md`, this file, `agents/*.md`, `commands/*.md`, the
   cross-reference lines of other skills, the `with:` frontmatter of any skill naming
   it, and tool comments. `grep -rn '<old>'` must come back empty outside
   `CHANGELOG.md` history
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
2. Fill in frontmatter (`name`, `description`, `tools`) and the persona's system prompt.
   `tools` must include `Skill`, or the persona cannot load a single one of the skills
   step 3 names
3. Name the skill(s) the persona must apply in the body and the order to load them in —
   a skill the body leaves out is one the persona may never load at all, for the reason
   "How a skill reaches the agent" states — then stop. A rule restated here is a copy of
   the one in `skills/<name>/SKILL.md`, and the persona reads only the copy. What the
   body carries is what no skill does: the boundary — what this persona does not do, and
   which other persona picks that up — and, for a persona whose output is a verdict or a
   set of findings rather than the edited files, the report format
4. Write the Composition section: when to invoke the persona directly, which command
   invokes it otherwise, and the standing rule that it must not invoke another persona
   itself — orchestration between personas belongs to commands only
5. Add an entry to the agents table in `README.md`
6. Run `npm test` — `test/agents.test.js` checks the frontmatter of every persona and
   that each skill a body names still exists under `skills/`
7. Run `node install.js` to deploy — copied to `~/.claude/agents/<name>.md`

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

Each command is a thin wrapper — see the corresponding `commands/<name>.md` for the
exact handoff. An agent exists to bundle several skills under one persona for a specific
pipeline stage, not to replace the way skills arrive; which of the two paths reaches a
persona at all, and which persona it leaves with nothing, is stated in "How a skill
reaches the agent". When to invoke a persona directly rather than through its command is
stated in that persona's own Composition section in `agents/<name>.md`.

### Lifecycle map

That pipeline is one axis of a lifecycle two other files state along their own:
`pr-rules` → Workflow as seven steps from a new task to a closed issue, and
`issue-rules` → Lifecycle as the four states the issue passes through. This table is the
only place the three are lined up against each other; every rule stays in the skill that
owns it, and a stage with no command, no persona or no step of its own says so rather
than naming the nearest one.

| Stage | Command / persona | `pr-rules` step | Issue state | Skills |
|-------|-------------------|-----------------|-------------|--------|
| Intake | — | before 1 | not created yet | `requirements`, `project-planning` |
| Spec | `/spec` → `spec-architect` | feeds 1 | `Open`, once it exists | `requirements`, `ddd`, `architecture`, `cpp-api-design` |
| Issue | — | 1 | `Open` | `issue-rules`, `github-cli` / `gitlab-cli` |
| Branch | — | 2 | → `In Progress` | `commit-rules` → Branch Naming |
| Build | `/build` → `implementer` | 3 | `In Progress` | `test-driven-development`, `cpp-coding`, `ddd`, `cpp-encapsulation`, `cpp-testing`; `debugging` on a fix; `commit-rules` per commit |
| PR | — | 4 | → `In Review` | `pr-rules`, `changelog`, `submodule-sync`, `ci-cd-and-automation`, `github-cli` / `gitlab-cli` |
| Review | `/ship`, or `/review-loop` to iterate → `code-reviewer` | none; step 6 waits on it | `In Review` | `code-review-and-quality`, `cpp-api-design`, `cpp-encapsulation`, `comments` / `cpp-doxygen`, `pr-rules`; `changelog` when the change touches `CHANGELOG.md` |
| Security audit | `/ship`, or `/review-loop` to iterate → `security-auditor` | none; step 6 waits on it | `In Review` | `security-and-hardening`, `pr-rules` |
| Pre-merge check | — | 5 | `In Review` | `pr-rules` → Pre-Merge Checklist, `issue-rules` → Progress Comments, `github-cli` / `gitlab-cli` |
| Merge | — | 6 | `In Review` | `pr-rules` → Merge Strategy, `commit-rules`, `github-cli` / `gitlab-cli` |
| Close | — | 7 | issue closed; not `Done` until deployed (`issue-rules` → Lifecycle), or left `In Review` with a follow-up linked | `issue-rules` → Lifecycle, `github-cli` / `gitlab-cli` |
| Release | `/ship` on a go verdict → `release-manager` | after 7 | → `Done` | `changelog`, `release`, `shipping-and-launch`, `submodule-sync` |

No file assigns issue-state transitions to a role: `issue-rules` → Lifecycle defines each
state by a condition — branch exists, PR open, merged and deployed — rather than by an
act with an actor. The acts reserved to the human are the merge (`pr-rules` → Merge
Strategy 2) and submitting review feedback (Pending by Default), which Merge Strategy 2
names as the lighter act it follows. The issue comments steps 1, 5 and 7 require
are the one kind of issue comment `pr-rules` → Pending by Default leaves an agent free to
publish.

Where the two axes do not line up one-to-one:

- **`/spec` against step 1.** `commands/spec.md` takes an idea or a task description and
  names no tracker, so the spec may be written before the issue exists or against one
  that already does. What both sides fix is the issue's content rather than the order: an
  issue without a test plan (and, for features, acceptance criteria) is not ready to
  implement against — the criteria from `requirements`, the test plan from `issue-rules`
  → Description Template.
- **`/build` against step 3.** It implements one task from the spec, so a branch whose
  issue holds several tasks runs it several times. It neither names the branch (step 2)
  nor opens the PR (step 4).
- **`/ship` against steps 5 and 6.** It neither replaces them nor wraps them: its review
  pass is what step 6 waits on, its `release-manager` hand-off is the Release row, and
  steps 5, 6 and 7 sit between the two under no command at all.
- **Uncovered stages.** Intake, and steps 1, 2, 4, 5, 6 and 7 — issue, branch, PR,
  pre-merge check, merge, close — have no command and no persona; they are carried out
  directly under the skill the row names. Only step 6 states why: Merge Strategy 2 gives
  the merge to the human.
- **The Release row does not run once per pass.** `changelog` → On Release renames one
  `[Unreleased]` section covering everything merged since the previous version, so one
  release gathers the closed issues of many passes.
- **The changelog entry sits on both axes.** `pr-rules` → Pre-Open Checklist requires
  `CHANGELOG.md` updated before step 4; `commands/ship.md` has `release-manager` prepare
  the entry after review. Unresolved — see GH-105.

## Installation

```
node install.js              # install to ~/.claude/
node install.js --dry-run    # preview without writing
node install.js --no-git-hook # skip .git/hooks/pre-commit copy
node uninstall.js            # full restore to pre-install state
```

`settings.json` is JSON-merged into `~/.claude/settings.json`; existing machine-specific settings are preserved (`defaultMode`, user `allow`/`ask`/`deny` entries). Every file install overwrites is copied into `.claude-config-backups` and recorded before it is written — `settings.json` alone is exempt, because it is merged and reverted by subtracting install's own additions rather than snapshot-replaced. A manifest at `~/.claude/.claude-config-manifest.json` records every created file and every backup so `uninstall.js` can restore the exact prior state byte-for-byte.

What the git-hook step installs, and the single repository it applies to, is stated in `README.md` → Installation.

## Tests

```
npm test
```

Tests live in `test/<name>.test.js` using node's built-in `node:test` runner. What the suite covers is stated in `README.md` → Tests.

## Commit conventions

See `skills/commit-rules/SKILL.md`. Direct commits to `main` are blocked — use feature branches.
