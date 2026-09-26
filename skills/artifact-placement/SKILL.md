---
name: artifact-placement
version: "1.0.0"
description: Apply when a rule produces an artifact a reader outside the code will open — a decision record, a plan, a migration guide, a measurement, and the other artifacts the table in What This Reaches names
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - universal
  rubric: applied
  tags:
    - artifact
    - placement
---

# Skill: Artifact Placement

Apply when a rule produces an artifact a reader outside the code will open — a decision
record, a plan, a migration guide, a measurement, and the other artifacts the table in
What This Reaches names.

- What the artifact carries, and whether it is owed at all, belongs to the skill whose
  rule produces it.

## The Requirement, Not the Path

**Must**

The location of an artifact this skill reaches must meet the requirements of the table,
each standing beside what a reader looks at to establish it, and no rule may fix that
location as a path. A skill producing such an artifact must cite this skill and restate
none of it.

| The location must | What establishes it |
|---|---|
| carry a reference that stays valid | a commit message, an issue or a pull request description can name it: `ADR-0007`, a wiki permalink, an issue identifier |
| be open to the reader the artifact is written for | that reader opens it with the access they already hold, without asking for more |
| outlive what it records | it is neither a scratch directory, nor a chat message, nor a branch the merge deletes |

Nothing else belongs to the table. A file of the repository meets every requirement, and
so does a wiki page, a tracker issue, and a page in Confluence or Notion.

## Where the Place Comes From

**Must**

Must take the location from what the project states about it, wherever the project
states it, and no rule may name one file as where that statement has to live. A project
states its conventions in a style guide, a document for contributors, an internal
regulation, a wiki, or a file of instructions to an agent, and a project may state them
in none of those.

Where the project states nothing about the location, must ask where to put the artifact
and whether the project keeps such a record at all, and must choose neither of the two
silently.

A reader checks the location against what is allowed to have chosen it:

| Chose the location | Where a reader reads it |
|---|---|
| something the project states | wherever that project states its conventions |
| an answer to the question above | the thread the work came out of |

A location that traces to no row of the table was chosen by whoever wrote the artifact,
which is what this rule forbids.

## A Path Fixed Outside the Project

**Must**

A path an external convention fixes, or one a tool derives when it loads the file, stands
outside this rule, and the text claiming that path must name the basis that fixed it. The
bases the catalog names today:

| The path | Its basis |
|---|---|
| `CHANGELOG.md` | the Keep a Changelog format the skill `changelog` names |
| the hook and tool directories under the configuration directory | how Claude Code loads them, the directory itself set by the environment variable `CLAUDE_CONFIG_DIR` |
| a test file under a directory named `test` | how the command `node --test` walks the tree |
| `SKILL.md` under a directory named for its skill | the path install writes and the Skill tool loads |

A path with no such basis is not exempt, whatever its history.

## What This Reaches

**Must**

The rule reaches every artifact a rule produces for a reader outside the code. Out of
reach stand the artifact the layout of the code places — a fix, a test, a log line — and
the one whose path a named basis fixes, per A Path Fixed Outside the Project; a location
the project states is the rule followed, per Where the Place Comes From, and that the
producing skill's own rule fixed a location takes nothing out. The artifacts a rule of
the catalog produces today, each beside the skill it is produced under:

| Artifact | Produced under |
|---|---|
| a decision record | `architecture` |
| a written requirement | `requirements` |
| a plan or a status update | `project-planning` |
| a migration guide | `deprecation-and-migration` |
| a before-and-after measurement of a hot path | `performance-optimization` |
| the record of an intermittent failure's observed conditions | `debugging` |
| a rollback plan | `shipping-and-launch` |
| the record of a class of weakness | `security-and-hardening` |
| the reason and review date of a deferred fix | `security-and-hardening` |

## Cross-References

**Recommended**

- `editing` — the guard against writing over a reading of the artifact that has gone stale.
- `writing-style` — the register the artifact is written in.
