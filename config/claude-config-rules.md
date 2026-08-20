# Global Rules

## Actions outside working directory require confirmation

Before any action that affects state outside a git-controlled working directory — ask the user. This includes but is not limited to:
- `git push` (any form), `gh` CLI, `glab` CLI, GitHub/GitLab API calls
- Writing or modifying files outside the current project (e.g. `~/.config`, `/etc/`, system paths)
- Installing or updating system packages (winget, choco, npm -g, pip, apt, brew)
- Any operation the user cannot roll back with standard VCS tools

Local commits, local file edits within a git repo, and read operations do not require confirmation.
