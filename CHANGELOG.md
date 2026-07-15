# Changelog

## [Unreleased]

### Added

- Hook dispatch system: `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit` event handlers
- Safety tools: `bash-safety` (blocks destructive shell commands), `secret-guard` (blocks credential leaks)
- C++ lint tools: `clang-format`, `clang-tidy`, `cppcheck` wrappers running on every edited C++ file
- Desktop stop notification via `stop-notify` (Windows / macOS / Linux)
- Skills: `api-design`, `changelog`, `commit-rules`, `cpp-coding`, `cpp-testing`, `ddd`, `doxygen`, `editing`, `hook-scripts`, `pr-rules`, `release`, `submodule-sync`
- `UserPromptSubmit` hook: injects active skills reminder into each prompt
- Portable `config/settings.json` using `CLAUDE_CONFIG_DIR` / `os.homedir()` — no hardcoded user paths
- `install.js` bootstrap with JSON-merge for `~/.claude/settings.json` — existing machine-specific settings preserved
- `templates/SKILL.md` template for consistent skill authoring
- Skills: `architecture` (ADRs, design tradeoffs), `node-testing` (`test/*.test.js` conventions), `project-planning` (scoping, estimation, milestones), `requirements` (user stories, acceptance criteria)
- `commit-trailer-guard` tool: blocks `git commit` commands containing banned AI-attribution trailers (`Co-Authored-By`, `Generated-by`)
- `SessionStart` hook: warn-only `submodule-status-check` (flags ahead/uninitialized/conflicted submodules) and `claude-md-skills-sync-check` (flags skills missing from CLAUDE.md's auto-apply list)
- `bg-agent-counter` tool: tracks pending background agents; `Stop` notification deferred until all `run_in_background` agents complete, preventing premature "Task complete" toasts
- `issue-rules` skill: title format (`Type(scope): Subject`), description templates for features and bugs (Goal, Acceptance criteria, Test plan), labels, priority levels (P0–P3), and lifecycle states
- Skills: `comments` (non-Doxygen comment style — brief, general, no fix narration), `encapsulation` (public/protected/private access-specifier discipline)
- Skills: `debugging` (root-cause investigation before proposing a fix), `code-review-and-quality` (review substance — correctness, readability, architecture, security, performance), `test-driven-development` (red-green-refactor workflow)

### Changed

- `commit-rules` skill: added Branch Naming section — `<user>/<type>/<TRACKER-N>/<subject>` format, TRACKER-N omitted when no issue exists
- `pr-rules` skill: added Workflow section (issue → branch → commits → PR → merge); PR title now uses tracker ID in place of `Type(scope)` when a tracked issue exists; subject starts with uppercase in all variants
- `api-design` skill: added rationale behind structure rules and a new wrong/right example for the "no void*" rule
- `skills-reminder` now generates its prompt from `skills/*/SKILL.md` frontmatter at runtime instead of a hardcoded list, so new skills appear automatically
- `secret-guard` now scans `MultiEdit` and `NotebookEdit` content, not just `Edit`/`Write`
- C++ lint tools (`clang-format`, `clang-tidy`, `cppcheck`) now run only when their config file (`.clang-format` / `.clang-tidy` / `.cppcheck`) is present in the edited file's repository, never inheriting one from a parent repo — eliminates lint noise in unconfigured projects. `.cppcheck` is passed to cppcheck as `--suppressions-list`
- `AGENTS.md` "Adding a skill" ceremony: added a pre-flight check step requiring contributors to confirm a new skill isn't already covered by an existing skill or a separate plugin, and doesn't overlap an adjacent skill's concern
- `uninstall` now reverts `settings.json` by subtracting only the hooks and permissions `install` added, instead of restoring a snapshot taken at install time. Settings written to the file afterwards by other tools or by hand are preserved; `install` records the exact additions in the manifest (no more `settings.json` backup)
- Re-running `install` now performs a clean upgrade: files a previous install created but the current repo no longer ships are pruned, and the `settings.json` merge is re-synced so a hook whose launcher command changed is replaced instead of duplicated. The manifest now also records `updatedAt`. Shared merge/subtract logic extracted to `lib/settings.js` with direct unit tests
- `pr-rules` skill: Workflow section now spells out the full order of actions (locate repo → find-or-create issue with a test plan and, for features, acceptance criteria → branch → commits → PR → pre-merge issue check → merge → conditional issue close); added a Pre-Merge Checklist that gates merge on the linked issue's checkbox state
- `issue-rules` skill: `Done` lifecycle state now requires every checklist checkbox in the issue to be checked before closing; added a Progress Comments section requiring issue comments that record which PR/MR resolves which item
- `pr-rules` Workflow now requires labels on the issue before implementation starts, and Pre-Open Checklist requires the PR to carry the issue's type label (+ `breaking` if applicable); `issue-rules` Labels section states when to set/revisit labels
- `bash-safety` now prompts for confirmation before any `git push` (PreToolUse `permissionDecision: ask`) rather than only warning on `--force`, so no push runs without an explicit yes — even under `bypassPermissions`, which the settings `ask` list cannot cover
- `comments` skill: the default is now no comment — reserve comments for critical, non-obvious facts a reader would otherwise get wrong; added a red-flags self-check for the common "might help" / "let me explain this expression" rationalizations
- `doxygen` skill: one block documents the type on its declaration (`@brief`/`@ingroup`/`@tparam`) while members carry no Doxygen; longer type prose can move to the `.cpp` via `@class`/`@struct`/`@enum`, and the `#ifdef DOXYGEN` guard is a last resort for a re-exported type (real type in `detail`, public `using` alias) requiring `PREDEFINED = DOXYGEN` in the Doxyfile

### CI

- GitHub Actions workflow running `npm test` on Node 18, 20, 22 on every push and PR to `main`
