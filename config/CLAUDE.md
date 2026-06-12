# Global Rules

## Actions outside working directory require confirmation

Before any action that affects state outside a git-controlled working directory — ask the user. This includes but is not limited to:
- `git push` (any form), `gh` CLI, `glab` CLI, GitHub/GitLab API calls
- Writing or modifying files outside the current project (e.g. `~/.config`, `/etc/`, system paths)
- Installing or updating system packages (winget, choco, npm -g, pip, apt, brew)
- Any operation the user cannot roll back with standard VCS tools

Local commits, local file edits within a git repo, and read operations do not require confirmation.

## Skills — auto-apply

When writing or reviewing C++ implementation code → apply `cpp-coding` skill.
When designing public API, adding public headers, or reviewing public interface → apply `api-design` skill.
When adding or modifying Doxygen comments on public headers → apply `doxygen` skill.
When modelling domain objects, aggregates, or bounded contexts → apply `ddd` skill.
When writing commit messages → apply `commit-rules` skill.
When opening, reviewing, or preparing a PR → apply `pr-rules` skill.
When updating CHANGELOG.md → apply `changelog` skill.
When preparing a release, bumping version, or tagging → apply `release` skill.
When writing or modifying hook scripts in hooks/ or tools/ → apply `hook-scripts` skill.
When editing any file → apply `editing` skill.
When syncing git submodules → apply `submodule-sync` skill.
