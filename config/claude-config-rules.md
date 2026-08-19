# Global Rules

## Actions outside working directory require confirmation

Before any action that affects state outside a git-controlled working directory — ask the user. This includes but is not limited to:
- `git push` (any form), `gh` CLI, `glab` CLI, GitHub/GitLab API calls
- Writing or modifying files outside the current project (e.g. `~/.config`, `/etc/`, system paths)
- Installing or updating system packages (winget, choco, npm -g, pip, apt, brew)
- Any operation the user cannot roll back with standard VCS tools

Local commits, local file edits within a git repo, and read operations do not require confirmation.

## Binding force of a skill section

Every `##` section of a skill carries one of four markers on the line under its heading,
saying how much that section binds. They are ordered by force:

`**Must**` > `**Should**` > `**Recommended**` > `**May**`

What each one entitles you to do:

- `**Must**` — ground for refusing work, and appears in checklists.
- `**Should**` — may stop a review with a stated reason; enters no mechanical check.
- `**Recommended**` — raised as a remark, blocks nothing.
- `**May**` — grants permission, forbids nothing.

A section never speaks with a verb stronger than its marker: a `**Should**` section says
"should", never "must". A section that does is mismarked, and the marker is what to trust
less — read the statement, not the heading, when the two disagree.

These are not the RFC 2119 keywords. There RECOMMENDED is a synonym for SHOULD; here they
are distinct levels, and `**Recommended**` sits one step below `**Should**`.
