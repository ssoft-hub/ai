---
name: skill-authoring
version: "1.0.0"
description: Apply when adding, marking, renaming or retiring a skill
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - agent-tool
  rubric: applied
  paths:
    - "**/skills/*/SKILL.md"
    - "**/templates/SKILL.md"
  tags:
    - skills
    - authoring
---

# Skill: Skill Authoring

Apply when adding, marking, renaming or retiring a skill.

The paths here are this repository's, where a skill of this catalog is written; elsewhere
the rules hold and the paths are that repository's own.

What each of the four markers entitles a reader to do is the reader's half of the scale,
stated in `config/claude-config-rules.md` → Binding force of a skill section, which
installs beside every skill. This skill states the author's half.

## Project Overrides

**Must**

A rule about a skill file stated in the repository's `AGENTS.md` or in a project skill
must be followed instead of this one. The catalog steps `AGENTS.md` states — where a new
skill is indexed, and how it reaches the config directory — are additional to these.

## One Concern per Skill

**Should**

Before creating a file, read the skills already installed and the plugins beside them: a
concern one of them carries is a rule for that skill, not a new skill. A new skill should
own one concern its neighbours state no rule about, and neither of two adjacent skills
should restate the other.

## Naming

**Should**

A skill should be named after the concern it owns, prefixed with the language where its
rules are language-specific. The test a reviewer applies: take a rule out of the skill and
state it for another language.

| The rule | The name |
|---|---|
| Survives, and only the example changes | stays neutral — `comments`, `code-review-and-quality` |
| Has to be rewritten to mean anything at all — `#pragma once`, `enum class` instead of `bool`, a Doxygen tag | carries the language |

A skill bound to a tool rather than to a language is named after the tool. The prefix is a
convention and nothing reads it; what the same test decides is `bound-to`.

## Contexts a Skill Is Bound To

**Must**

`bound-to` is required: a non-empty list of contexts drawn from
`config/skill-contexts.json`, naming the readers whose rules these are. The list is a
conjunction, so a skill needing two contexts names both, and `universal` stands alone. A
context enters the vocabulary only when a skill is bound to it, and
`test/skill-contexts.test.js` resolves every declaration against it.

## Contexts and Their Kinds

**Should**

| Subject | Rule |
|---|---|
| Category | A context that, for the concern in question, one skill covers whole, so no sibling of it can appear (`commit-rules` covers git, svn and mercurial alike). |
| Instance | A context whose siblings exist or are expected. |
| Choosing the kind | Would a sibling appearing force an edit to the files naming a skill bound to this context? It would, `instance`; it could not, `category`; unclear, `instance`, since a wrong `category` surfaces only once the sibling arrives and every file naming the skill has to be corrected then. |
| Kind and children | Decided by a node's siblings, never by whether it has children. |
| An edge | A child refines and includes its parent, so a reader in the child is in the parent too; siblings are alternatives. |
| A context that accumulates | A chain, not siblings: `cpp` → `cpp23` → `cpp26`. |

## Naming Another Skill

**Must**

A skill names another skill in backticks where the named skill's context is a category, or
is one of the naming skill's own contexts or an ancestor of one. Every other routing states
a role — the API-design skill of the language being written, the noun taken from that
context's `role` — and names no skill. `test/skill-contexts.test.js` checks both halves.

## Creating the File

**Must**

| Step | What |
|---|---|
| 1 | Copy `templates/SKILL.md` to `skills/<name>/SKILL.md` |
| 2 | Fill in the frontmatter the template's own comments describe, `bound-to` first; the `description` names the language wherever the skill's name does, since it is all the every-prompt reminder shows |
| 3 | Write the rule sections, each keeping the marker line the template puts under its heading |
| 4 | Index the skill and deploy it as the repository's `AGENTS.md` states |

## What Ships with a Skill

**Must**

The whole of `skills/<name>/` ships, so a file beside `SKILL.md` reaches the reader and is
read when the skill sends them to it. `SKILL.md` carries the instructions; data the reader
consults rather than obeys - a vocabulary, a table of values - goes in a sibling file, out
of the context every application pays for. The directory holds nothing else.

## Marking a Section

**Must**

Every `##` section of a skill carries one marker, drawn from the four, alone on the first
line under its heading:

```markdown
## Subject Length

**Must**

A commit subject must be at most 72 characters.
```

The heading text carries no marker of its own: a cross-reference resolves against the
heading — `pr-rules` → Project Overrides — and a marker inside it would have to be
reproduced in every such reference to keep it quotable verbatim. Once every section carries
one, the frontmatter declares `rubric: applied`, indented under `metadata:` where every
other key the routing reads sits.

`test/rubric.test.js` then holds it, over that skill and over `templates/SKILL.md` whatever
the template declares: one marker per section, drawn from the four, first under the heading
and never inside it; no section speaking above its own marker; and
`config/claude-config-rules.md` naming the four, so a skill never ships a marker whose
meaning ships nowhere.

## Choosing the Marker

**Should**

`**Must**` is placed only where compliance can be checked. Every statement under a
`**Must**` section meets all three conditions:

| Condition | Met by | Failed by |
|---|---|---|
| Names a quantity, a closed list, a checkable pattern or a required artifact | 72 characters, a commit type table, the shape of a branch name, a regression test | a property with no unit to count it in |
| Names what to look at to establish compliance — a test name, a file, a build task, a checklist item, a command — which carries the verdict without the author's account of what was intended | `a commit subject must be at most 72 characters`, naming the subject and its length | `a commit subject must be clear`, naming a property nobody counts |
| Carries no adjective without a scale and no appeal to the reader's state of mind | a stated quantity | long, deeply nested, a reasonable default, a careful reader would get it wrong |

What follows from them:

| Subject | Rule |
|---|---|
| The artifact under inspection | Counts as the artifact condition 2 names only where the statement names the property to count in it; naming none, the statement needs an external one — a test, a command, a build task, a checklist item — before it sits under `**Must**`. |
| The other three markers | Carry no such requirement and are ordered by importance alone: a section no statement of which is checkable does not carry `**Must**` however important it is, and marking it `**Must**` does not make it checkable. |
| The unit marked | The whole section rather than its strongest sentence, so one statement short of the conditions puts it at `**Should**` or below. |
| A checkable statement among unmeasurable neighbours | Raised by splitting it into a `##` section of its own, never by strengthening the marker in place, which would extend `**Must**` over the very neighbours the conditions reject. |
| The whole partition | Rewriting reaches a statement that falls short of the conditions, splitting one held down by the company it keeps; a neighbour that no longer earns its place is dropped on its own merits, never as a way to promote the statement beside it. |
| The rubric's scope | A skill's `##` sections and `templates/SKILL.md`, which every skill is copied from; a file that is not a skill carries no marker. |
| The template's default | `**Recommended**`, the weakest marker that still states a norm, so force is raised deliberately rather than conferred by a copied file. |
| The modal check | Holds the ceiling and only the ceiling — a bare imperative draws no fault — so writing each statement with its own modal is the author's to get right, and a passing suite says that no section speaks above its marker, never that every statement carries one. |

## Renaming or Retiring

**Must**

The directory name is the skill's identity: the name the Skill tool is called with, the
string `with:` and every cross-reference resolve against, and the path install writes under
the config directory's `skills/`. A rename is therefore a repository-wide edit plus one
step for the machines already carrying the old name.

| Step | What |
|---|---|
| 1 | `git mv skills/<old> skills/<new>`, and set `name:` in the frontmatter to match the new directory, which the catalog keys on, since a mismatch between the two is silent. A retirement deletes the directory instead |
| 2 | Update every reference: `README.md`, `AGENTS.md`, `agents/*.md`, `commands/*.md`, the cross-reference lines of other skills, the `with:` frontmatter of any skill naming it, and tool comments. `grep -rn '<old>'` must come back empty outside `CHANGELOG.md` history |
| 3 | Add the old install path to `config/retired.json`, since install can clean up only what its manifest records: where that manifest was lost the path survives untracked, and install names it rather than deleting a file it may not own |
| 4 | Record it in `CHANGELOG.md`: a rename under `### Changed`, a retirement under `### Removed` |
| 5 | Index and deploy, as the repository's `AGENTS.md` states |
