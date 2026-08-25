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
            carry the steps for adding one, and SKILL.md will once GH-183 moves the
            skill steps out of this file
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
- `ci-cd-and-automation` — the pipeline producing the "CI green" signal.
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
- `editing` — the edit mechanic itself.
- `github-cli` — `gh` mechanics.
- `gitlab-cli` — `glab` mechanics.
- `hook-scripts` — writing this repository's hooks and tools.
- `issue-rules` — what a tracker issue contains.
- `node-testing` — conventions for the tests under `test/`.
- `observability-and-instrumentation` — telemetry for production visibility.
- `performance-optimization` — the process around one performance problem.
- `pr-rules` — the pull request, from opening it to merging it.
- `project-planning` — stakeholder-facing planning.
- `release` — the version number and the mechanical steps to ship it.
- `requirements` — turning an ask into a requirement.
- `security-and-hardening` — design-time security.
- `shipping-and-launch` — whether a built release may reach users, and how widely.
- `submodule-sync` — submodule ref discipline.
- `test-driven-development` — the order a behaviour is built in, test first.
- `writing-style` — prose register and vocabulary in any human language.

Two pairs restate each other on purpose, because no task loads both: `cpp-testing` /
`node-testing` (a task edits one language's tests, and `node-testing` says not to mix the
conventions) and `github-cli` / `gitlab-cli` (a repository has one host). Their shared
principles are stated in each one's own runner and command vocabulary; routing a JS test
task through a `cpp-` prefixed skill for one line would cost more than the duplication.

## Binding Force

Two agents applying one skill reach one verdict only where the skill says which of its
statements bind. Every `##` section of a skill answers that with a marker on the line under
its heading, and every statement under it is written with the modal that matches.

What the four markers are, the order of force between them, what each entitles a reader to
do, and the ceiling on the modal a section may speak with are the reader's half, and they
are stated in `config/claude-config-rules.md` → Binding force of a skill section. That file is what
`install.js` copies to the config directory, so it reaches every project the installed
skills are read in; this repository's `AGENTS.md` does not. Nothing about what a marker
means is repeated here. What follows is the author's half: how to choose a marker, where to
put it, and what holds it.

The rubric scopes to the sections of a skill: `skills/*/SKILL.md` and the template they are
copied from. This file is not a skill and carries no markers — it states the rubric rather
than being checked by it.

`**Must**` is placed only where compliance can be checked. Every statement under a
`**Must**` section meets all three of these conditions:

1. It names a quantity, a closed list, a checkable pattern or a required artifact — 72
   characters, the commit type table, the shape of a branch name, a regression test.
2. It names what to look at to establish compliance — a test name, a file, a build task,
   a checklist item, a command. The artifact carries the verdict; reading it does not
   require the author's account of what was intended. The artifact under inspection
   counts as that named artifact when, and only when, the statement names the property
   to count in it: "a commit subject must be at most 72 characters" names the subject and
   the property (its length), so it passes, while "a commit subject must be clear" names a
   property nobody can count, so it fails. A statement naming no countable property of the thing
   under inspection needs an external artifact — a test, a command, a build task, a
   checklist item — before it can sit under `**Must**`.
3. It contains no adjective without a scale and no appeal to the reader's state of mind.
   "long", "deeply nested", "a reasonable default", "a careful reader would get it
   wrong" — each of these leaves the verdict with whoever happens to read it.

The other three markers carry no such requirement and are ordered by importance alone.
That is what the four steps buy over two: a statement can be central and unmeasurable at
the same time — "code documents itself" is what a whole skill derives from, and nothing
counts it — and it takes `**Should**` on its importance without being called advice and
without being given a force no check could back. A section no statement of which is
checkable does not carry `**Must**` however important it is, and marking it `**Must**`
does not make it checkable.

The conditions apply to the whole section rather than to its strongest sentence: a `##`
section takes `**Must**` when every statement under it meets all three, and one statement
short of them puts the section at `**Should**` or below. That is what keeps the verdict
reproducible — two people marking the same section reach the same word, because neither
has to pick which sentence the section is really about.

A checkable statement among unmeasurable neighbours is therefore raised by splitting it
into a `##` section of its own, never by strengthening the marker in place: the marker
covers every statement under its heading, so raising it where it stands would extend
`**Must**` over the very neighbours the conditions reject. Rewriting reaches a statement
that falls short of the conditions; splitting reaches one held down by the company it
keeps. Those two are the whole partition. Deleting or moving the weak neighbours would
raise the section just as well, and is not a third route: a neighbour that no longer earns
its place is dropped on its own merits, never as a way to promote the statement beside it.

The marker sits alone on the first line under the heading it applies to:

```markdown
## Subject Length

**Must**

A commit subject must be at most 72 characters.
```

The heading text itself carries no marker, because the heading is what every
cross-reference resolves against — `skills/pr-rules/SKILL.md` points back at its own
`Project Overrides`, and the `<skill>` → `Section` form runs through this file. A marker
inside the heading would have to be reproduced in every such reference to keep it
quotable verbatim.

`test/rubric.test.js` holds all of it: exactly one marker per `##` section, drawn from the
four, on the first line under the heading and never inside it; no section speaking above its
own marker; and `config/claude-config-rules.md` naming the four, so a skill never ships a
marker whose meaning ships nowhere. It reads every `skills/*/SKILL.md` and checks the ones
declaring `rubric: applied` indented under `metadata:`, where `tools/skill-catalog.js` reads
every other key it needs, so a skill comes under the check in the pass that marks it and not
before. `templates/SKILL.md` is marked throughout, and is checked for both its markers and
its modals whatever it declares, so a skill copied from it is born marked and born
consistent; it defaults every section to `**Recommended**` — the weakest marker that still
states a norm, so force is something an author raises deliberately rather than something a
copied file confers.

What the modal check holds is the ceiling and only the ceiling. `Never write it. It is
required.` under `**May**` draws no fault, and neither does a bare imperative, because
deciding which sentences are normative at all is judgement rather than a match. So writing
each statement with its own modal is the author's to get right, and a green suite says that
no section speaks above its marker — never that every statement carries one.

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

   The prefix is a convention and nothing reads it: what the same test decides is the
   skill's `bound-to`, a non-empty list of contexts drawn from
   `config/skill-contexts.json`.

   | Subject | Rule |
   |---|---|
   | The list | A conjunction, so a skill needing two contexts names both (`hook-scripts` is `node` and `claude-code`); `universal` stands alone. |
   | Category | A context that, for the concern in question, one skill covers whole, so no sibling of it can appear (`commit-rules` covers git, svn and mercurial alike). |
   | Instance | A context whose siblings exist or are expected. |
   | Choosing the kind | Would a sibling appearing force an edit to the files naming a skill bound to this context? It would, `instance`; it could not, `category`; unclear, `instance`, since a wrong `category` surfaces only once the sibling arrives and every file naming the skill has to be corrected then. |
   | Kind and children | Decided by a node's siblings, never by whether it has children. |
   | An edge | A child refines and includes its parent, so a reader in the child is in the parent too; siblings are alternatives. |
   | A context that accumulates | A chain, not siblings: `cpp` → `cpp23` → `cpp26`. |
   | A new context | Added only when a skill is bound to it. |

   A skill names another skill in backticks where the named skill's context is a
   category, or is one of its own contexts or an ancestor of one; every other routing
   states a role — "the API-design skill of the language being written", the noun taken
   from that context's `role` — and names no skill. `test/skill-contexts.test.js` checks
   both halves.
2. Copy `templates/SKILL.md` to `skills/<name>/SKILL.md`
3. Fill in frontmatter (name, description, tags), then decide how it is triggered:
   - `bound-to` — the contexts of step 1, before anything else; it is required
   - `tier` — `process`, `domain`, or `narrow` (see "How a skill reaches the agent")
   - `paths` — the files this skill owns, when a kind of file should trigger it
   - `reminder: false` — only when those files are the *whole* trigger; it drops the
     skill from the every-prompt reminder and leaves it to the edit-time gate
   - `with` — skills that must arrive together with this one, so the pair is never
     half-applied
   - `description` must name the language when the name does, so the one line the
     every-prompt reminder shows is unambiguous without opening the skill
4. Write rules sections following the template structure, keeping the marker line the
   template puts under each `##` heading — see "Binding Force" for which of the
   four each section takes, and add `rubric: applied` to the frontmatter once every
   section carries one
5. Add an entry to the skill table in `README.md`
6. Add the skill's line to the skill ownership map above — the concern it owns — plus a
   hand-off line in every skill it takes a concern from
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

## Adding an agent, a command or a tool

| What | Steps stated in |
|---|---|
| A persona agent | `templates/AGENT.md` |
| A slash command | `templates/COMMAND.md` |
| A hook tool | `skills/hook-scripts/SKILL.md` → Adding or Retiring a Tool |

## Idea-to-Release Pipeline

The persona agents in `agents/` and the commands in `commands/` compose the skill catalog
into one pass from idea to release, each command a wrapper over the personas its own
`commands/<name>.md` names.

### Lifecycle map

This table is the only place the pipeline stage, the command or persona carrying it, and
the `issue-rules` → Lifecycle state the issue sits in meanwhile are lined up against each
other; the order of the work itself is `pr-rules` → Workflow. Every rule stays in the skill
that owns it, and a stage with no command or persona of its own says so rather than naming
the nearest one.

| Stage | Command / persona | Issue state | Skills |
|-------|-------------------|-------------|--------|
| Intake | — | not created yet | `requirements`, `project-planning` |
| Spec | `/spec` → `spec-architect` | `Open`, once it exists | `requirements`, `ddd`, `architecture`, `cpp-api-design` |
| Issue | — | `Open` | `issue-rules`, `github-cli` / `gitlab-cli` |
| Branch | — | → `In Progress` | `commit-rules` → Branch Naming |
| Build | `/build` → `implementer` | `In Progress` | `pr-rules` → When a Check Runs, `test-driven-development`, `cpp-coding`, `ddd`, `cpp-encapsulation`, `cpp-testing`; `debugging` on a fix; `commit-rules` per commit |
| Push | — | `In Progress` | `pr-rules` → When a Check Runs, `submodule-sync`, `changelog`, `commit-rules` |
| PR | — | → `In Review` | `pr-rules`, `ci-cd-and-automation`, `github-cli` / `gitlab-cli` |
| Review | `/ship`, or `/review-loop` to iterate → `code-reviewer` | `In Review` | `code-review-and-quality`, `cpp-api-design`, `cpp-encapsulation`, `comments` / `cpp-doxygen`, `pr-rules`; `changelog` when the change touches `CHANGELOG.md` |
| Security audit | `/ship`, or `/review-loop` to iterate → `security-auditor` | `In Review` | `security-and-hardening`, `pr-rules` |
| Pre-merge check | — | `In Review` | `pr-rules` → Pre-Merge Checklist, `issue-rules` → Progress Comments, `github-cli` / `gitlab-cli` |
| Merge | — | `In Review` | `pr-rules` → Merge Strategy, `commit-rules`, `github-cli` / `gitlab-cli` |
| Close | — | issue closed; not `Done` until deployed (`issue-rules` → Lifecycle), or left `In Review` with a follow-up linked | `issue-rules` → Lifecycle, `github-cli` / `gitlab-cli` |
| Release | `/ship` on a go verdict → `release-manager` | → `Done` | `changelog`, `release`, `shipping-and-launch`, `submodule-sync` |

No row assigns an issue-state transition to a role: `issue-rules` → Lifecycle defines each
state by a condition rather than by an act with an actor. The acts reserved to the human
are the merge (`pr-rules` → Merge Strategy 2) and submitting review feedback (Pending by
Default); the issue comments the Scope and issue, Pre-merge issue check and Close issue
steps require are the one kind an agent publishes freely.

What the rows do not say on their own:

- **The Spec row may run before the Issue row.** `/spec` names no tracker, so a spec may
  precede the issue or be written against one that exists. An issue without a test plan,
  and acceptance criteria for a feature, is not ready to implement against.
- **The Build row runs once per task.** `/build` implements one, so a branch whose issue
  holds several runs it several times; it covers neither the Branch, the Push nor the
  PR row.
- **`/ship` spans rows that are not adjacent.** Its review pass covers the Review and
  Security audit rows and its hand-off the Release row; Pre-merge check, Merge and Close
  sit between them under no command at all.
- **Uncovered stages.** Intake, Issue, Branch, Push, PR, Pre-merge check, Merge and Close
  have no command and no persona, and are carried out directly under the skill their row
  names. Only the Merge row states why: Merge Strategy 2 gives the merge to the human.
- **The Release row does not run once per pass.** `changelog` → On Release renames one
  `[Unreleased]` section covering everything merged since the previous version.
- **The changelog entry has two owners.** `pr-rules` → Pre-Open Checklist requires
  `CHANGELOG.md` updated at the push; `commands/ship.md` has `release-manager` prepare the
  entry after review. Unresolved — see GH-105.

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
under it, a citation against the heading it resolves to. An assertion that reddens when a
sentence is rephrased while its rule stands checks text with text: it is a change
detector, not a check, and is not written.
