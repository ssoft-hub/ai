---
name: artifact-placement
version: "1.0.0"
description: Apply when a rule produces an artifact a reader outside the code will open - a decision record, a requirement, a plan, a migration guide, a measurement, a rollback plan, a record of a weakness
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

Apply when a rule produces an artifact a reader outside the code will open - a decision
record, a requirement, a plan, a migration guide, a measurement, a rollback plan, a
record of a weakness.

- What the artifact carries, and whether it is owed at all, belongs to the skill whose
  rule produces it.

## Project Overrides

**Must**

Must follow the artifact-placement conventions the repository's `AGENTS.md` file or a
project skill defines, instead of the rule here.

---

## The Requirement, Not the Path

**Must**

A skill producing an artifact must state the requirement its location has to meet and
must state no path. Three requirements, each with what a reader looks at to establish it:

| The location must | What establishes it |
|---|---|
| carry a reference that stays valid | a commit message, an issue or a pull request description can name it: `ADR-0007`, a wiki permalink, an issue identifier |
| be open to the reader the artifact is written for | that reader opens it with the access they already hold, without asking for more |
| outlive what it records | it is neither a scratch directory, nor a chat message, nor a branch the merge deletes |

A file of the repository meets all three. So does a wiki page, a tracker issue, and a
page in Confluence or Notion. Which of them applies is the project's to say, never the
skill's.

## Where the Place Comes From

**Must**

Must take the location from the conventions of the project - the repository's `AGENTS.md`
file, or whatever other source the project keeps its conventions in. Where the project
states none, must ask where to form the artifact and whether the project keeps such a
record at all, and must choose neither of the two silently.

A reader checks the location against the two things allowed to have chosen it:

| Chose the location | Where a reader reads it |
|---|---|
| a stated convention of the project | the source the project keeps its conventions in |
| an answer to the question above | the thread the work came out of |

A location that traces to neither was chosen by whoever wrote the artifact, which is what
this rule forbids.

## A Path Fixed Outside the Project

**Must**

A path an external convention fixes, or one a tool derives when it loads the file, stands
outside this rule, and the text claiming that path must name the basis that fixed it. The
bases the catalog names today:

| The path | Its basis |
|---|---|
| `CHANGELOG.md` | the Keep a Changelog format the skill `changelog` names |
| the hook and tool directories under the configuration directory | how Claude Code loads them, the directory itself set by the environment variable `CLAUDE_CONFIG_DIR` |
| a file matching `test/*.test.js` | how the command `node --test` walks the tree |
| `skills/<name>/SKILL.md` | the path install writes and the Skill tool loads |

A path with no such basis is not exempt, whatever its history.

## What This Reaches

**Must**

The rule reaches an artifact whose location no rule of the skill producing it already
fixes. The artifacts the catalog states one for today, each beside the skill it is
produced under:

| Artifact | Produced under |
|---|---|
| a decision record | `architecture` |
| a written requirement | `requirements` |
| a plan or a status update | `project-planning` |
| a migration guide | `deprecation-and-migration` |
| a before-and-after measurement of a hot path | `performance-optimization` |
| a rollback plan | `shipping-and-launch` |
| the record of a class of weakness | `security-and-hardening` |

Two kinds of artifact stand outside the rule rather than below the table: one the layout
of the code places, since the code's own structure chose it - a fix, a test, a log line -
and one whose path an external convention or a tool fixes, per A Path Fixed Outside the
Project.

## Cross-References

**Recommended**

- `editing` - the guard against writing over a reading of the artifact that has gone stale.
- `writing-style` - the register the artifact is written in.
