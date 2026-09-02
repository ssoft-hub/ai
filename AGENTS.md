# AGENTS.md — claude-config

Claude Code configuration: the hooks and tools that run on a tool call, the skills
carrying the rules an agent works under, and the persona agents and commands composing
them into an idea-to-release pipeline. `node install.js` copies them into `~/.claude/`,
which is what Claude Code reads — the working tree is the source, never what is running.

## Repository layout

```
hooks/      One dispatcher per Claude Code event (PreToolUse, PostToolUse, Stop,
            SessionStart, UserPromptSubmit)
tools/      Atomic tool scripts the dispatchers route to
skills/     Skill definitions loaded by /skill-name slash commands
agents/     Persona subagent definitions (one markdown file per agent)
commands/   Slash command definitions (one markdown file per command)
config/     What install deploys as configuration: settings.json, the
            claude-config-rules.md it writes to ~/.claude/ and imports from the
            CLAUDE.md there, and retired.json — paths this repo no longer ships;
            plus skill-contexts.json, the contexts a skill's bound-to draws from
lib/        Pure helpers shared by install.js and uninstall.js
templates/  Starting points for a new skill, agent or command; AGENT.md and COMMAND.md
            carry the steps for adding one, and skill-authoring carries them for
            a skill
test/       One test file per unit, run by npm test
install.js  Bootstrap script — copies files to ~/.claude/
```

## Conventions

- Node built-ins only: no npm package in a hook, a tool, `install.js` or a test.
- `install.js`, `lib/` and `test/` follow the same two hard rules a hook or a tool does,
  built-ins and no hardcoded user path — `skills/hook-scripts/SKILL.md` → Hard Rules.
- Commit and branch format: `skills/commit-rules/SKILL.md`. Direct commits to `main` are
  blocked — work on a feature branch.

## Hook architecture

Writing a hook or a tool: `skills/hook-scripts/SKILL.md` — the dispatcher/tool split, the
verdict a guard states, exit codes, which channel reaches the model, reading a command as
argv, and the steps for adding or retiring a tool. What each dispatcher here routes
where: `README.md` → Hooks. What holds a routing rule's two copies in step, and how a
guard is reached: `hooks/README.md`.

## How a skill reaches the agent

| Path | What it delivers | When |
|---|---|---|
| `tools/skills-reminder.js` (`UserPromptSubmit`) | every skill except those declaring `reminder: false` | every user prompt |
| `tools/skill-gate.js` (`PreToolUse`) | the skills whose `paths:` claim the file being written, plus the ones their `with:` names, minus what the agent making the call has already loaded | an edit tool, or a command that writes a file |

`reminder: false` is for a skill whose `paths:` are its whole trigger; `paths:` alone
leaves the skill in the reminder, since most are triggered by intent too and design work
runs before the file that will carry it exists. The gate denies the first call left with
missing skills and warns on a repeat of the same file and set, so an agent without the
Skill tool is slowed once, never deadlocked; it tracks loads and denials per agent. Both
paths read `tools/skill-catalog.js`, and a skill's frontmatter is the only place its
triggers are declared.

Several skills firing on one task are ordered `process` → `domain` → `narrow`, and the
narrower one rules its own topic and must not restate the wider one.

Neither path reaches a persona agent on its own: a persona invocation is no user prompt,
so the reminder never reaches one, and the edit-time gate fires only for a persona that
writes a file, never for a read-only one. A persona loads the skills its body names —
`templates/AGENT.md`. The deny-once rule above is for an agent that cannot load a skill,
not for a persona.

## Skill ownership map

One line per skill: the single concern it owns, and this repository's own index of the
skills that exist here. What a skill hands off is stated by that skill, where its reader
meets it. A rule belongs to exactly one line — a second statement is not emphasis, it is
a copy that drifts, and the agent reading both has nothing telling it which one wins.

- `architecture` — how modules, services and processes fit together.
- `changelog` — the `CHANGELOG.md` file.
- `ci-cd-and-automation` — the pipeline producing the checks-passed signal.
- `code-review-and-quality` — what a review looks for.
- `comments` — a comment in any language, whatever marker opens it.
- `commit-rules` — the commit message and the branch name.
- `cpp-api-design` — the shape of a public C++ surface.
- `cpp-coding` — C++ implementation conventions.
- `cpp-doxygen` — Doxygen blocks on public C++ headers.
- `cpp-encapsulation` — the access level of each member of one C++ type.
- `cpp-testing` — the structure of a C++ test.
- `ddd` — modelling inside one bounded context.
- `debugging` — the investigation that precedes a fix.
- `deprecation-and-migration` — retiring a public path.
- `editing` — the guard against a stale reading of a file, of a tracker or forge artifact, and of the branch head at a merge.
- `github-cli` — `gh` mechanics.
- `gitlab-cli` — `glab` mechanics.
- `hook-scripts` — writing this repository's hooks and tools.
- `issue-rules` — what a tracker issue contains.
- `node-testing` — conventions for the tests under `test/`.
- `observability-and-instrumentation` — telemetry for production visibility.
- `performance-optimization` — the process around one performance problem.
- `pr-rules` — the pull request, from opening it to merging it.
- `project-planning` — stakeholder-facing planning, and whether independent work runs at the same time.
- `release` — the version number and the mechanical steps to ship it.
- `requirements` — turning an ask into a requirement.
- `security-and-hardening` — design-time security.
- `shipping-and-launch` — whether a built release may reach users, and how widely.
- `skill-authoring` — writing a skill file — its concern, name, contexts, markers,
  rename — and the marker on a command's sections.
- `submodule-sync` — submodule ref discipline.
- `test-driven-development` — the order a behaviour is built in, test first.
- `work-sequence` — the order of work from a task to a closed issue.
- `writing-style` — prose register and vocabulary in any human language, above any mode the session runs in.

Two pairs restate each other on purpose, because no task loads both: `cpp-testing` /
`node-testing` (a task edits one language's tests, and `node-testing` says not to mix the
conventions) and `github-cli` / `gitlab-cli` (a repository has one host). Their shared
principles are stated in each one's own runner and command vocabulary; routing a JS test
task through a `cpp-` prefixed skill for one line would cost more than the duplication.

`## The Caller's Text` is copied byte for byte into every command and restated in
`config/claude-config-rules.md`: the boundary between an instruction and the text under
work has to sit immediately above that text, which a rule in a separate file cannot do
however reliably it ships.

## Adding a skill, an agent, a command or a tool

| What | Stated in |
|---|---|
| A skill | `skills/skill-authoring/SKILL.md` |
| A persona agent | `templates/AGENT.md` |
| A slash command | `templates/COMMAND.md` |
| A hook tool | `skills/hook-scripts/SKILL.md` → Adding or Retiring a Tool |

Here the overlap check a new skill starts from is read off the ownership map above.
Indexing one means a row in the skill table in `README.md` and a line in that map, plus a
hand-off line in every skill it takes a concern from; deploying it, added or renamed, is
`node install.js`.

## Idea-to-Release Pipeline

The persona agents in `agents/` and the commands in `commands/` compose the skill catalog
into one pass from idea to release, each command a wrapper over the personas its own
`commands/<name>.md` names.

### Lifecycle map

This table is the only place the pipeline stage, the command or persona carrying it, and
the `issue-rules` → Lifecycle state the issue sits in meanwhile are lined up against each
other. Where a stage carries a step's name, that step's condition and what it produces
are in `work-sequence` → The Sequence. Every rule stays in the skill that owns it, and a
stage with no command or persona of its own says so rather than naming the nearest one.

| Stage | Command / persona | Issue state | Skills |
|-------|-------------------|-------------|--------|
| Intake | — | not created yet | `requirements`, `project-planning` |
| Spec | `/spec` → `spec-architect` | `Open`, once it exists | `requirements`, `ddd`, `architecture`, `cpp-api-design` |
| Scope and issue | — | `Open` | `issue-rules`, `github-cli` / `gitlab-cli` |
| Branch | — | → `In Progress` | `commit-rules` → Branch Naming |
| Implement | `/implement` → `implementer` | `In Progress` | `work-sequence` → When a Check Runs, `test-driven-development`, `cpp-coding`, `ddd`, `cpp-encapsulation`, `cpp-testing`, `hook-scripts`, `node-testing`; `debugging` on a fix; `performance-optimization` on a reported performance problem; `deprecation-and-migration` when retiring a public path; `skill-authoring` on a skill or a command file; `project-planning` → Running Independent Work in Parallel on each launch that section names; `commit-rules` per commit |
| Publish | — | `In Progress` | `work-sequence` → When a Check Runs, `submodule-sync`, `changelog`, `commit-rules` |
| Offer for review | — | → `In Review` | `pr-rules`, `ci-cd-and-automation`, `github-cli` / `gitlab-cli` |
| Review | `/review`, or `/review-loop` to iterate → `code-reviewer` | `In Review` | `code-review-and-quality`, `cpp-api-design`, `cpp-encapsulation`, `comments` / `cpp-doxygen`, `pr-rules`; `changelog` when the change touches `CHANGELOG.md` |
| Security audit | `/review`, or `/review-loop` to iterate → `security-auditor` | `In Review` | `security-and-hardening`, `pr-rules` |
| Pre-merge issue check | — | `In Review` | `pr-rules` → Pre-Merge Checklist, `issue-rules` → Progress Comments, `github-cli` / `gitlab-cli` |
| Integrate | — | `In Review` | `pr-rules` → Merge Strategy, `commit-rules`, `github-cli` / `gitlab-cli` |
| Close issue | — | issue closed; not `Done` until deployed (`issue-rules` → Lifecycle), or left `In Review` with a follow-up linked | `issue-rules` → Lifecycle, `github-cli` / `gitlab-cli` |
| Release | — (`release-manager` directly) | → `Done` | `changelog`, `release`, `shipping-and-launch`, `submodule-sync` |

A second table follows, one row for each skill named in no `Skills` cell above. Its
`Stage` cell holds a stage name of the table above, or the word `cross-cutting` — itself
a declaration that the skill fires at more than one stage of the table above, not a
missing value.

| Skill | Stage | Trigger | Input | Output | Entry criterion | Exit criterion |
|-------|-------|---------|-------|--------|------------------|-----------------|
| `deprecation-and-migration` | Implement | retiring a public API, planning a breaking change, or writing a migration guide | the public symbol or path being retired | a deprecation marker, a migration guide, and a removal-tracking issue | the breaking-change classification `cpp-api-design` → Breaking Changes gives the symbol | the removal issue's milestone, set per `issue-rules` → Milestone |
| `editing` | cross-cutting | a write to a file, a tracker issue body or a PR description, and a merge | the artifact as it stands before the write | the artifact as it stands after the write | a reading of the artifact, per `editing` → Guard Against a Stale Reading | the checks a round of edits runs, per `work-sequence` → When a Check Runs |
| `hook-scripts` | Implement | writing or modifying a file under `hooks/` or `tools/` | the event or tool the change routes to | a dispatcher or tool file matching the Dispatcher or Tool Skeleton | the feature branch named per `commit-rules` → Branch Naming | the test file `node-testing` covers for the tool, `test/<name>.test.js` |
| `node-testing` | Implement | writing or reviewing a file under `test/*.test.js` | the pure logic exported by the hook or tool under test | a test file asserting that logic's behaviour | the tool's exported logic, per `hook-scripts` → Tool Skeleton | the tool covered and `npm test` run, per `hook-scripts` → Adding or Retiring a Tool |
| `observability-and-instrumentation` | cross-cutting | adding logging, metrics, or tracing, or checking a running system's reported behaviour | the question an on-call engineer needs answered | a structured log line, metric, or trace answering it | the non-functional requirement `requirements` → Functional vs Non-Functional records | the Readiness Checklist item `shipping-and-launch` → Readiness Checklist for monitoring |
| `performance-optimization` | Implement | diagnosing a reported performance problem, or evaluating a change's performance cost | a profiler or benchmark baseline for the hot path | a measured before/after comparison for the fix | the symptom and cost the bug template of `issue-rules` → Description Template asks for | the hot-path check `code-review-and-quality` → Performance runs before merge |
| `skill-authoring` | Implement | adding, marking, renaming or retiring a skill, or marking a command | the skill or command file and its frontmatter | a skill or command file matching the rubric, or its removal | the tracked issue's title naming the skill, per `issue-rules` → Title | the `### Changed` or `### Removed` entry `changelog` → Subsections requires |
| `writing-style` | cross-cutting | writing documentation, an issue, a PR, a commit, or any text artifact | a draft sentence or document | prose in the technical register with its force word named | the draft of the artifact whose structure `issue-rules`, `pr-rules` or `commit-rules` fixes | the re-read `writing-style` → Self-Check Before Sending requires before the text is sent |

No row assigns an issue-state transition to a role: `issue-rules` → Lifecycle defines each
state by a condition rather than by an act with an actor. The acts reserved to the human
are the merge (`pr-rules` → Merge Strategy 2) and submitting review feedback (Pending by
Default); the issue comments `work-sequence` requires are the one kind an agent
publishes freely.

What the rows do not say on their own:

- **The Spec row may run before the Scope and issue row.** `/spec` names no tracker, so
  a spec may precede the issue or be written against one that exists. An issue without a
  test plan, and acceptance criteria for a feature, is not ready to implement against.
- **The Implement row runs once per task.** `/implement` implements one, so a branch
  whose issue holds several runs it several times; it covers neither the Branch, the
  Publish nor the Offer for review row.
- **`/review` covers two adjacent rows and stops there.** It reports a verdict and
  prepares nothing: the Release row sits four rows below it, behind the merge.
- **Uncovered stages.** Intake, Scope and issue, Branch, Publish, Offer for review,
  Pre-merge issue check, Integrate and Close issue have no command, and Release has none
  either — `release-manager` is invoked directly once the change is merged. Each is
  carried out under the skill its row names. Only the Integrate row states why: Merge
  Strategy 2 gives the merge to the human.
- **The Release row does not run once per pass.** `changelog` → On Release renames one
  `[Unreleased]` section covering everything merged since the previous version.
- **The changelog entry has one owner.** `pr-rules` → Pre-Open Checklist requires
  `CHANGELOG.md` updated at the Publish step. What `release-manager` does at the Release
  row is the `[Unreleased]` rename of `changelog` → On Release, not a second entry —
  GH-105.

## Installation

```
node install.js              # install to ~/.claude/
node install.js --dry-run    # preview without writing
node uninstall.js            # full restore to pre-install state
```

What lands where, how `settings.json` and `CLAUDE.md` are merged rather than replaced, and
what the manifest lets `uninstall.js` put back are stated in `README.md` → Installation.

## Tests

```
npm test
```

One `test/<name>.test.js` per unit, on node's built-in runner; the conventions are in
`skills/node-testing/SKILL.md` and what the suite covers in `README.md` → Tests.

A test over a skill holds a relation between two artifacts with different authors — a
frontmatter key against the context vocabulary, a section's marker against the modals
under it, a citation against the heading it resolves to. An assertion that fails when a
sentence is rephrased while its rule stands checks text with text: it is a change
detector, not a check, and is not written.
