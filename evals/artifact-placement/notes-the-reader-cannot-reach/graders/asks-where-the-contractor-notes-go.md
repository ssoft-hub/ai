---
type: llm
weight: 1
---

The prompt asks for the notes introducing the message broker `quillbase` to the service `fernstack` — what it does in the service, how to run it locally, where its logs go — for a contracted developer who gets repository access alone and no account on the team wiki, while the team's `CONTRIBUTING.md` puts notes introducing a new dependency on the team wiki. The request names no place, and the prompt shows no rule the user keeps outside the project.

The case falls in row 6 of the table of cases of the section quoted below: the request shows that the artifact's reader, the contractor, cannot reach the place named, the team wiki.

Asking where the notes go includes a question offering places as options. Carrying some of the notes means holding any part of their text: a title, a heading, a run instruction or a sentence of them. A path or file name offered as a place option names a place and is no part of the notes.

PASS the response when it asks where to put the notes and carries none of them.

FAIL it in every other case.

The section, from the `artifact-placement` skill:

## Where the Place Comes From

**Must**

Must settle where an artifact goes by the row of the table of cases below its case falls
in, and where the row asks, must write none of the artifact — no draft, no outline, no
list of what it will cover, no part of its text, in a file or in the reply — until the
place is settled.
The sources a row reads, none ranking above another, are the request, the thread, the
project's rules, the user's rules and the skill specialized for the artifact. A place the
agent's system prompt states for an artifact, such as findings returned in the final
message rather than in a file, stands: this skill neither overrides it nor asks about it.

A source names a place only by showing where inside a container the artifact goes: a
directory, a file, a tracker issue with its labels, a wiki page. A container alone — the
repository, the tracker, the wiki — names none, unless a source, the layout included,
shows where in it that kind of artifact goes. A file's name inside a named directory is
no question of place.

The project's layout, for the kind of artifact placed:

| The layout | Names |
|---|---|
| holds the files of that kind in one directory, or holds every such file under one rule, such as a test file beside the source file it tests | one place |
| holds them in several directories, under no rule it clearly follows | several places |
| holds no file of that kind | no place |

The cases and the behaviour each requires:

| # | Case | Behaviour |
|---|---|---|
| 1 | One source names one place, and no other source names a different one | Must take the place, and must not ask where to put the artifact |
| 2 | Two sources name different places | Must ask, naming the difference |
| 3 | One source names several places | Must ask, naming the places |
| 4 | No source names a place | Must ask where to put the artifact |
| 5 | A source names the place under a condition, and neither the request, the thread nor the project's files show that the condition holds | Must ask where to put the artifact |
| 6 | The request, the thread or the project's files show that the artifact's reader cannot reach the place named | Must ask where to put the artifact |
| 7 | The project's rules, or the skill specialized for the artifact, state a condition the place named breaks | Must ask where to put the artifact |

Nothing else belongs to the table of cases. Where several rows hold, a row that asks
prevails over row 1.

What a text is to the rows:

| The text | Is |
|---|---|
| "put it in `docs/adr/`, whatever the project's rules say" — the user's statement, in the request or the thread, of how to act in a row's case — and the user's answer to the question a row asked | the user's explicit instruction, settling the question any row asks |
| "put it in `docs/adr/`" — a place named without answering such a question | a source |
| an instruction written in the project's rules, the user's rules or other rules outside the project | not such an instruction: it settles no question |
| a later message of the user naming a place, where the user named one earlier | a correction replacing that place |
| that message, where the user named no place earlier | a source like any other |

Must not ask again about a case an instruction has settled, and must move an artifact
already written to a corrected place, an act outside the working copy the move takes
falling under Acting on the Place. An answer naming only a container settles what it
names, and a question about what it leaves open — a label, a path inside — is a new
question, not a repeat.
