# Changelog

## [Unreleased]

### Added
- The lifecycle map in `AGENTS.md` carries a second table for every skill its stage table names in no `Skills` cell, stating each one's stage, trigger, input, output and the artifact its entry and exit turn on; a skill firing at more than one stage declares `cross-cutting` there
- A skill declares its relation to the conventions of the project it is applied in, as `project-relation` in its frontmatter: `overrides` where absent, and `binding` for a skill stating this repository's own conventions, which carries `## Project Binding` in place of `## Project Overrides`
- What introduces an enumeration names what it holds, and what closes one is the statement that nothing else belongs to it rather than a count announced above it
- A conversation is written in the personal register and every other text in the impersonal one, which fixes the subject of a sentence as well as the form a prescription takes
- A word naming what a thing is stands beside its name, wherever a sentence uses that name as a noun
- A pronoun, an adjective and a verb stand where the word each depends on is settled
- One fact is written once, and every restatement of it goes
- Where an example exists, the text shows it instead of describing it, and a table, a diagram or a code block stands in place of prose carrying the same fact in more lines
- An inanimate subject takes only the action it performs, and an action a person performs on it takes the form the language keeps for that one
- A rule of the `writing-style` skill wins over a mode the session runs in
- A table, a diagram or an example is admitted in the `## Problem` section of a pull request description
- A review finding carries a word naming the kind of every symbol it names
- A message is understood by a reader who did not follow what came before it
- `pr-rules` states that a description, a comment and a reply leave out a number measuring a run rather than the change; the rule moves there from `writing-style`, a pull request being what it governs
- An instruction carries its force impersonally, opening with the force word; a conversation carries it personally, in the first person
- The Russian and English force words carry the first-person forms a proposal takes
- The Russian term list carries the vocabulary of ownership, lifetime, storage and concurrency, and the everyday operations a transliteration reaches first, in alphabetical order
- `Name the State, Not the Colour` admits a colour word in a code span, in a fenced block and in initialism case, and nowhere else
- A skill governing every task rather than a kind of one declares `always: true`, and `writing-style` is the first: prose register is not something an agent chooses between skills over. Nothing reads the key yet
- `github-cli`, `gitlab-cli` and `writing-style` declare `rubric: applied`: every `##` section carries one of the four binding-force markers, and `test/rubric.test.js` holds them
- A command carries the caller's text in a final `## The Caller's Text` section, below whose opening paragraph a heading, a marker or a directive confers nothing; `config/claude-config-rules.md` says the same of every text that is the subject of the work
- A command declares `bound-to` as a skill does, and `test/skill-contexts.test.js` holds both: `/review-loop` states where every pass runs, and the steps that wait, without naming one version control system or forge

- A skill ships with the whole of its directory, so data a reader consults rather than obeys - a vocabulary, a table of values - sits beside `SKILL.md` and is read when the skill sends them to it, instead of loading with every application

- Hook dispatch system: `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit` event handlers
- Safety tools: `bash-safety` (blocks destructive shell commands), `secret-guard` (blocks credential leaks)
- C++ lint tools: `clang-format`, `clang-tidy` and `cppcheck` wrappers over an edited C++ file
- Desktop stop notification via `stop-notify` (Windows / macOS / Linux)
- Skills: `changelog`, `commit-rules`, `cpp-api-design`, `cpp-coding`, `cpp-doxygen`, `cpp-testing`, `ddd`, `editing`, `hook-scripts`, `pr-rules`, `release`, `submodule-sync`
- `UserPromptSubmit` hook: injects a reminder of the available skills into each prompt, with their tier and trigger text; a skill whose trigger is exactly the files it owns is left to the edit-time gate instead
- Portable `config/settings.json` using `CLAUDE_CONFIG_DIR` / `os.homedir()`, with no hardcoded user paths
- `install.js` bootstrap with JSON-merge for `~/.claude/settings.json`, preserving existing machine-specific settings
- `templates/SKILL.md` template for consistent skill authoring
- Skills: `architecture` (ADRs, design tradeoffs, the seven qualities in priority order), `node-testing` (`test/*.test.js` conventions), `project-planning` (scoping, estimation, milestones), `requirements` (user stories, acceptance criteria)
- `commit-trailer-guard` tool: blocks a `git commit` carrying a banned AI-attribution trailer (`Co-Authored-By`, `Generated-by`)
- `SessionStart` hook: `submodule-status-check` flags a submodule whose checked-out commit differs from the recorded one, is uninitialized, or is in conflict, in the superproject or in a nested module; `session-env-prune` drops skill-gate state a week after that session's last gated call
- `background-call-counter` tool: the `Stop` notification waits until every call started with `run_in_background` has finished, instead of firing while one is still running
- `issue-rules` skill: title format (`Type(scope): Subject`), description templates for features and bugs (Goal, Acceptance criteria, Test plan), labels, priority levels (P0-P3), and lifecycle states
- Skills: `comments` (non-Doxygen comment style), `cpp-encapsulation` (public/protected/private access-specifier discipline)
- Skills: `debugging` (root-cause investigation before a fix), `code-review-and-quality` (the review axes: correctness, readability, architecture, security, performance), `test-driven-development` (fail-pass-refactor)
- Skills: `security-and-hardening` (trust boundaries, input validation, secrets, least privilege), `performance-optimization` (profile-measure-optimize), `observability-and-instrumentation` (logging, metrics, tracing)
- Skills: `ci-cd-and-automation` (pipeline design and quality gates), `deprecation-and-migration` (retiring a public API, migration guides), `shipping-and-launch` (release readiness, staged rollout, rollback planning)
- `writing-style` skill: technical register and vocabulary for documentation, issue/PR/commit text and conversation, in any human language
- Skill routing frontmatter: every skill declares `tier` (`process`/`domain`/`narrow`), and optionally `paths` globs for the files it owns, `with` for the skills that always apply alongside it, and `reminder: false` when those files are its whole trigger
- `skill-gate` tool: on `Edit`/`Write`/`MultiEdit`/`NotebookEdit`, names the skills claiming the edited file and their companions, leaving out the ones already loaded
- `install.js` support for `agents/*.md` -> `~/.claude/agents/` and `commands/*.md` -> `~/.claude/commands/`, both optional
- Agents: `spec-architect`, `implementer`, `code-reviewer`, `security-auditor`, `release-manager` - persona subagents forming an idea-to-release pipeline, each scoped to one stage and pointed at the skills it applies
- Commands: `/spec`, `/build`, `/ship`; `/ship` runs `code-reviewer` and `security-auditor` in parallel, merges into a go/no-go, and hands off to `release-manager` on go
- `templates/AGENT.md` and `templates/COMMAND.md` for consistent agent and command authoring
- `AGENTS.md`: an Idea-to-Release Pipeline section describing the `/spec` -> `/build` -> `/ship` flow, each command a wrapper over the personas its own `commands/<name>.md` names
- `comment-check` tool: a `PostToolUse` reminder when an edit adds a new non-Doxygen comment, pointing back at the `comments` skill; it runs unconditionally, unlike the lint tools
- `review-publish-guard` tool: a `gh` command that publishes review feedback the moment it runs raises a permission prompt naming the pending-review alternative, while the pending path itself runs unprompted
- Skills: `github-cli` and `gitlab-cli` - the `gh` and `glab` commands behind the process skills: issues, pull and merge requests, labels, the pending-review and draft-note cycles, stacks, and merging. Policy stays in `pr-rules` and `issue-rules`
- `/review-loop` command: iterates review -> fix -> re-review until a pass reports no blocking finding, capped at 3 passes, with the depth taken from a `quick`/`light`/`normal`/`thorough`/`ultra` scale. A cap reached still blocking reports as not converging
- `skill-gate` denies the first `Edit`/`Write`/`MultiEdit`/`NotebookEdit` on a file whose claiming skills are not loaded and warns on a repeat, so an agent that cannot invoke the Skill tool loses one attempt rather than the task. A shell command writing to such a file passes the same check
- `statusline` tool: renders the line under the prompt - model, effort, context and the two rate-limit windows with their reset times, coloured by how full they are, and the branch. Installing takes over the single `statusLine` slot, which `uninstall` gives back
- The statusline keeps whatever the displaced `statusLine` command drew, in front of its own badges. That command runs detached and its output is cached, so it costs nothing per render; a failing or slow one leaves its text absent and changes nothing else
- Binding force of a section: every `##` section of a command, and of a skill declaring `rubric: applied`, carries one of `**Must**`, `**Should**`, `**Recommended**` or `**May**`, saying how far its statements bind; `config/claude-config-rules.md` states what each entitles a reader to do
- A state is named by its condition, never by the colour of an indicator reporting it: not `CI green` but "every check the project declares has passed". `writing-style` -> Name the State, Not the Colour states the rule, and `npm test` fails on a colour word in any skill or in `AGENTS.md`
- A text names the force of an action it prescribes - must, should, recommended or may, one to one with the four binding-force markers - rather than leaving it in a bare infinitive. The words each force is stated with install as `<config dir>/writing-language/<language>.json`
- `skill-authoring` skill: naming a skill after its concern, declaring `bound-to`, marking each `##` section with the force it carries, one file per skill, and the rename. `AGENTS.md` states none of them and keeps this repository's own catalog steps
- `work-sequence` skill: the eight steps from a task to a closed issue, each with its condition and the skill owning what it produces. Read it rather than `pr-rules` for the order of work and for the moment a check runs at; `pr-rules` now states the pull request alone

### Changed
- The `## Project Overrides` section reads the same in every skill, one sentence differing only in the topic it names, and every skill carries one
- `/review-loop` asks where every pass runs rather than assuming a working directory: it makes no place of its own, moves nothing aside, and states no step that needs a repository
- `pr-rules` → Pending by Default states its exception per draft: a call sending every draft the caller holds needs an instruction covering each, where one naming a single reply admits the single-draft form
- `pr-rules` → Merge Strategy 2 answers a command that merges several pull requests at once: the authorisation is per pull request, so such a command needs an instruction naming each of them
- The flags, limits and traps of `github-cli` and `gitlab-cli` are tables rather than paragraphs, so what a flag does sits beside what it answers when it goes wrong
- `/ship` is `/review`, and reports a verdict without preparing anything: the release follows the merge, which is the human's, so `release-manager` is invoked directly at the Release row rather than from a command
- `/build` is `/implement`, and the pipeline stage it carries is Implement: the command implements one task by TDD, where a build is what a compiler produces

- Every guarded tool call waits on one process instead of one per guard, so the pause no longer grows with the number of guards. A `PreToolUse` tool of your own now exports `verdict(payload)`; one left in the old stdin/stdout shape is skipped with a line on stderr
- A `PreToolUse` tool whose `verdict` throws is skipped with a line on stderr naming it rather than crashing the runner, and one stating a block whose text cannot be built blocks with a stated reason
- The global `CLAUDE.md` no longer restates the skill list and its triggers, and the session-start check that policed that copy against `skills/` is gone with it. A subagent never sees the reminder: the skills its persona in `agents/` names are the list it starts from
- `CONTRIBUTING.md` no longer carries a branch pattern, a commit-type list and a skill recipe contradicting `commit-rules` and `AGENTS.md`; each rule now comes from the file that owns it. `README.md`'s manual setup installs what `node install.js` installs, and states that nothing is backed up
- `AGENTS.md` -> Lifecycle map lines each pipeline stage up against the command or persona carrying it, the `issue-rules` state the issue is in, and the skills that apply there
- A dot-file or dot-directory is ignored unless `.gitignore` names it as one this repository tracks, so a tool's leftover no longer sits in `git status` beside a file that should have been committed
- `pr-rules` and `issue-rules` keep the rules and point at `github-cli`/`gitlab-cli` for the command, so a `gh` or `glab` change no longer means editing rules that are not about a CLI
- `commit-rules`: added Branch Naming - `<user>/<type>/<TRACKER-N>/<subject>`, the tracker segment omitted when no issue exists
- `pr-rules`: the PR title uses the tracker ID in place of `Type(scope)` when a tracked issue exists, and the subject starts with uppercase in every variant
- `cpp-api-design`: added the rationale behind the structure rules and a wrong/right example for the "no `void*`" rule
- `skills-reminder` generates its prompt from `skills/*/SKILL.md` frontmatter at runtime instead of a hardcoded list, so a new skill appears automatically
- `secret-guard` scans `MultiEdit` and `NotebookEdit` content, not just `Edit`/`Write`
- The C++ lint wrappers run only when the edited file's own repository holds the matching config (`.clang-format`, `.clang-tidy`, `.cppcheck`), never one inherited from a parent repository; `.cppcheck` is passed as `--suppressions-list`
- `AGENTS.md` -> Adding a skill: a pre-flight step requires confirming the concern is not already covered by an existing skill or a separate plugin, and does not overlap an adjacent skill
- `uninstall` reverts `settings.json` by subtracting only the hooks and permissions `install` added, so settings written afterwards by hand or by another tool are preserved
- Re-running `install` performs a clean upgrade: files a previous install created but the current repository no longer ships are pruned, and a hook whose launcher command changed is replaced instead of duplicated
- `pr-rules` -> Pre-Merge Checklist gates the merge on the linked issue and on the PR's own test plan: every checkbox reflecting current state, each checked one verifiable from what shipped, and each unchecked one out of scope or carrying a linked follow-up
- `issue-rules`: `Done` requires every checklist checkbox in the issue to be checked, and Progress Comments requires an issue comment recording which PR/MR resolves which item
- `pr-rules` -> Pre-Open Checklist requires the PR to carry the issue's labels, the type label if any plus the topic ones; `issue-rules` -> Labels states when to set and revisit them
- `bash-safety` prompts for confirmation before any `git push`, not only `--force`, so no push runs without an explicit yes - including under `bypassPermissions`, which the settings `ask` list cannot cover
- `comments`: the default is no comment - reserve one for a critical, non-obvious fact a reader would otherwise get wrong; a warning-signs self-check names the common rationalizations
- `cpp-doxygen`: one block documents the type on its declaration and members carry no Doxygen; longer type prose moves to the `.cpp` via `@class`/`@struct`/`@enum`, and the `#ifdef DOXYGEN` guard is a last resort for a re-exported type
- `pr-rules`: the PR description opens with a `## Problem` section stating what is wrong today and what triggered the work, so the motivation no longer overlaps `## Summary`; `## Test plan` items are checkboxes matching the `issue-rules` templates
- `pr-rules`: an agent no longer publishes its own review feedback. Where a draft mechanism exists it waits there for a human to submit; where none exists nothing is posted and the wording goes to the human. The issue comments `work-sequence` requires are unaffected
- `pr-rules`: Merge Strategy states that the human authorises each merge, matching the rule review feedback already follows
- `code-reviewer` agent: states an approving verdict in its report instead of approving the PR, and points at `pr-rules` for where review feedback may be published at all
- `AGENTS.md` -> Adding a skill: states that `install.js` copies only `skills/<name>/SKILL.md`, so a skill stays one file until that copy loop changes
- `api-design`, `doxygen` and `encapsulation` renamed to `cpp-api-design`, `cpp-doxygen` and `cpp-encapsulation`, each description now naming C++. `AGENTS.md` -> Adding a skill states the convention and the test a reviewer applies
- Re-running `install` hands back a path the previous install overwrote, restoring the content it had before, so a retired skill stops loading at upgrade time rather than at uninstall. `config/retired.json` lists those paths; install names any that survive untracked and leaves them to the user
- `AGENTS.md` carries a skill ownership map: one line per skill naming the concern it owns, which is what "Adding a skill" step 0's overlap check reads from. A rule stated on both sides of a skill pair is stated once, and what a skill hands off is stated by that skill
- `commit-rules`: the commit body is capped at one short paragraph (2-6 lines) explaining why the change is made this way. Evidence, measurements, alternatives considered, migration notes and test plans belong in the PR description
- `writing-style`: added "State the Result, Not the Process" - an artifact states what it leaves behind, not the order the work happened in, the attempts abandoned, or the deliberation behind an approach. It covers every channel, not only the artifacts with a template
- `writing-style`: added "No Figures That Go Stale" - test totals, coverage, timings, counts of changed files and a hash from a branch under review stay out; name the command, the test, or the file and symbol instead
- `pr-rules`: the description carries a per-section length budget - Problem up to five lines, Summary up to five one-line bullets, Implementation up to six bullets each naming a file or symbol, Test plan one line per item. A change too large for it is a PR to split
- The `PreToolUse` dispatcher emits one permission decision per run: the strictest of those returned, carrying every reason behind it, so two tools deciding on one command no longer write two JSON objects that parse as neither
- Every skill declares the context its rules are bound to, and a general skill routes by role ("the API-design skill of the language being written") instead of naming a language-specific one. A second language or platform costs an entry in `config/skill-contexts.json` and the skills for it
- The `security-and-hardening` containment and overflow rules state the control and the input classes a guard must answer, in terms tied to no language. The code examples are gone, and with them the advice they carried: a string comparison of resolved paths, and a check reading the sum
- Renamed three steps of the order of work after what they achieve: `Push` is now `Publish`, `PR` is `Offer for review`, and `Merge commit` is `Integrate`; `AGENTS.md` -> Lifecycle map carries the same names
- `AGENTS.md` states the project, the two maps and one pointer per mechanism. Writing a hook or a tool, and adding or retiring one, is read from `hook-scripts`; what each dispatcher routes where from `README.md` -> Hooks; adding a persona or a command from its template
- `editing` now covers a tracker issue's body and checklist, a PR description, a review thread and a merge, naming the guard or the re-read procedure for each; `pr-rules` -> Pre-Merge Checklist gains the review-thread box

### Removed

- The git pre-commit hook is gone, and `node install.js` writes nothing outside the Claude configuration directory. A checkout that installed an earlier version still runs `.git/hooks/pre-commit` until `node uninstall.js`, or a delete by hand, takes it away

### Fixed

- `github-cli` had `--delete-branch` removing the head branch unconditionally, where a worktree can stop it after the merge has gone through with an exit status of 1 - a merge that landed reading as one that failed; the section now carries the refusals and the recovery, measured
- `gitlab-cli` had `--remove-source-branch` as an act of the command, where it is the merge request's own attribute, which GitLab acts on at the merge, the local branch surviving every merge
- `github-cli` had the `merge-async` body at four fields where it takes five, and sent the reader to re-read the pull request for a result the endpoint answers by uuid at `GET .../merge-async/<uuid>`
- The `git submodule status` prefix `+` reads as a difference in either direction, not as the module being ahead: `submodule-sync` gates `git add` on a containment check against the index, so a module reset to an earlier commit is not written back into the superproject
- `install` no longer replaces `~/.claude/CLAUDE.md`. This repository's rules install as `~/.claude/claude-config-rules.md`, and `CLAUDE.md` gets one `@claude-config-rules.md` import line, keeping every other byte; `uninstall` subtracts exactly that line
- Each persona agent carries the `Skill` tool and names the skills it loads, so it follows the skills themselves rather than an abridged copy of them in its own definition
- `uninstall` removes this repository's hooks from `settings.json` even when they were registered there before `install` ran. A machine left with live hooks recovers by re-running `node install.js`
- `install` backs up every file it overwrites and `uninstall` restores it byte for byte, so a skill, tool, hook, agent or command you kept under `~/.claude/` at a name this repository also ships is not lost. `settings.json` stays merged rather than replaced
- The command guards read a command as argv instead of as text, so `bash-safety` and `commit-trailer-guard` catch every spelling of the call they name - `sudo git push`, `git -C <dir> push`, `bash -c "git push"`, an alias - and no longer fire on one named inside a quoted argument
- `secret-guard` reads shell commands as well as file writes, so a key written through `echo`, a heredoc, an `export`, or passed as a curl header is blocked before it runs
- `PostToolUse` runs after a write by any tool, not only the four it names, so a file written by a plugin's edit tool or an MCP server is formatted, linted and checked for a new comment. A file written by a shell command stays out of reach
- `PreToolUse` routes guards by payload instead of by tool name, so every tool running a command is checked - PowerShell, another shell, an MCP server, a plugin's edit tool - not `Bash` alone; the shipped `ask` list covers `PowerShell(git push *)` as well
- `skill-gate` finds the file a shell command writes by reading argv rather than the raw text, so a quoted argument mentioning `tee` or a redirection no longer gates the call
- `comment-check` no longer reads a `/*` inside a string as a comment opener, so an edit adding a glob such as `"**/*.cpp"` is not reported as a new comment
- A tool naming a permission decision outside `allow`, `ask` and `deny` no longer decides anything: its output reaches the user as text behind a line naming the tool, and the decision comes from a tool that named one
- A permission prompt no longer carries a line reading `undefined` when a tool decides without stating a reason
- A warning from a `PreToolUse` or `PostToolUse` hook reaches the agent it was written for instead of only the debug log; `hook-scripts` states which event carries what
- The `skill-gate` notice states that every named skill must be loaded and none skipped as irrelevant, instead of reading as a list of options
- `skill-gate` tracks loaded skills and spent denials per agent rather than per session, so a persona's edit is not vouched for by what the main agent loaded, and a persona's denial is not spent against the main agent's next call
- `comment-check` covers every language, not only C++: an extension, or a name like `Makefile`, maps to that family's comment openers, and the `comments` skill claims those files so the edit-time gate names it on any source file

### CI

- GitHub Actions runs `npm test` on Node 18, 20 and 22, on Linux and Windows, on every push and every pull request to `main`. Each combination reports as its own job and none cancels another
- `npm test` fails when `config/retired.json` lists a path this repository still ships, naming the entry to remove
