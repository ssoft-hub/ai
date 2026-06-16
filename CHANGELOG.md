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

### Changed

- `api-design` skill: added rationale behind structure rules and a new wrong/right example for the "no void*" rule

### CI

- GitHub Actions workflow running `npm test` on Node 18, 20, 22 on every push and PR to `main`
