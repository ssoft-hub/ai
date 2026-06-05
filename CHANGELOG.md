# Changelog

## [Unreleased]
### Added
- Hook dispatch system: `PreToolUse`, `PostToolUse`, `Stop` event handlers.
- Safety tools: `bash-safety` (blocks destructive shell commands), `secret-guard` (blocks credential leaks).
- C++ lint tools: `clang-format`, `clang-tidy`, `cppcheck` wrappers running on every edited C++ file.
- Desktop stop notification via `stop-notify` (Windows / macOS / Linux).
- Skills: `api-design`, `changelog`, `commit-rules`, `cpp-coding`, `cpp-testing`, `ddd`, `doxygen`, `editing`, `hook-scripts`, `pr-rules`, `release`, `submodule-sync`.
- Portable `settings.json` using `CLAUDE_CONFIG_DIR` / `os.homedir()` — no hardcoded user paths.
- `install.js` bootstrap script for deploying to `~/.claude/` on a new machine.
