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

### Changed

- `api-design` skill: added rationale behind structure rules and a new wrong/right example for the "no void*" rule
- `skills-reminder` now generates its prompt from `skills/*/SKILL.md` frontmatter at runtime instead of a hardcoded list, so new skills appear automatically
- `secret-guard` now scans `MultiEdit` and `NotebookEdit` content, not just `Edit`/`Write`
- C++ lint tools (`clang-format`, `clang-tidy`, `cppcheck`) now run only when their config file (`.clang-format` / `.clang-tidy` / `.cppcheck`) is present in the edited file's repository, never inheriting one from a parent repo — eliminates lint noise in unconfigured projects. `.cppcheck` is passed to cppcheck as `--suppressions-list`

### CI

- GitHub Actions workflow running `npm test` on Node 18, 20, 22 on every push and PR to `main`
