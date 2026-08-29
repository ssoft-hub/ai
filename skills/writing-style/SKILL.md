---
name: writing-style
version: "1.0.0"
description: Apply when writing documentation, issue/PR/commit text, or communicating with the user, in any human language
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  always: true
  rubric: applied
  bound-to:
    - universal
  tags:
    - writing
    - style
---

# Skill: Writing Style

Apply when writing documentation, issue/PR/commit text, or communicating with the user,
in any human language. This skill covers prose register and vocabulary. The structure
of a specific artifact is covered elsewhere — this skill governs the language it's
written in, not its shape.

- Code comment structure and when to write one → `comments` skill.
- Public API documentation structure → the API-documentation skill of the language being
  written.
- Issue title/description structure → `issue-rules` skill.
- PR title/description structure, review comment/reply structure → `pr-rules` skill.
- Commit message structure → `commit-rules` skill.

## Project Overrides

**Must**

Must follow a writing-style convention the repository's `AGENTS.md` file or a project
skill states, instead of the rule here. This skill applies where a project states none of
its own.

## This Skill Above Any Mode

**Should**

A rule of this skill should win over a mode the session runs in, wherever the two
conflict.

## Match the Technical Register

**Should**

Should write in the technical register of the language: the fact, the reason, the next
step. Neither spoken register, nor marketing tone, nor the slang of a chat.

| Left out | Instances |
|---|---|
| filler | "just", "simply", "basically" |
| hedging padding | "I think maybe", "possibly" |
| a pleasantry carrying no information | "great question", "happy to help" |

## State the Result, Not the Process

**Should**

Should state what the artifact leaves behind, in full sentences carrying one fact each,
and cut every sentence carrying none. The constraint that decided the outcome stays.

| Left out | Instances |
|---|---|
| the process | the order the work happened in, an abandoned attempt, a correction made along the way, an account of a mistake and its fix |
| the deliberation | the options weighed, the dead ends, an aside about what was considered |

This holds for every artifact and every channel: documentation, a commit body, an issue
or pull request description, a comment or a reply in a thread, a progress note, a message
in a tracker, a chat or a mail. Should say what changed only where the reader has to act
on it.

## Every Dependent Word Stands With What It Depends On

**Should**

Should write a pronoun, an adjective and a verb so that the word each depends on is
settled. A pronoun replaces a noun, an adjective qualifies one, and a verb attributes its
action to a subject; that word is named by reading the sentence, and a dependent word the
text leaves a choice of words for, or none at all, is a defect.

| Defective | Corrected |
|---|---|
| "the guard rejects the path, and it is logged" | "the guard rejects the path, and logs the rejection" |

## A Message Stands Without Its Context

**Should**

Should write a message a reader who did not follow the conversation understands. Should
name the artifact, the symbol and the decision the message turns on, rather than reach for
a name standing only in what came before it.

A word whose referent stands only in what came before the message is a defect, and reading
the message with nothing around it is what finds one.

| Defective | Corrected |
|---|---|
| "done, as discussed above" | "fixed: the guard now rejects a path outside the repository, per `hooks/README.md`" |

## Name the Kind of Every Identifier

**Should**

Should put a word naming what the thing is beside its name, wherever a sentence uses that
name as a noun. The word stands before the name or after it, as the form around it does.

The word is the one the domain uses for that kind of thing. Method, function, type,
parameter, instance, variable, member, namespace, macro, header, file, directory, branch,
command, flag, key, section, skill, agent, tool, hook, event, context, allocator,
container, trait, tag, resource, and whatever else a domain of its own names.

Backticks are the markup, not the rule. A name reaches a sentence without them and takes
the word all the same, and a backticked span often holds no name of a thing: a command, a
path, an error string, a defective phrase quoted as the defect it is.

A citation carries no such word, naming where a rule stands rather than saying anything
about it: `<name>` → Section, a name alone in parentheses, or a name opening a list item
or a table cell.

| Defective | Corrected |
|---|---|
| "`exec` with `T` is called on `obj`" | "the template method `exec`, instantiated for the type `T`, is called on the object instance `obj`" |
| "the rule stands in `writing-style`" | "the rule stands in the `writing-style` skill" |
| "`--merge` writes a merge commit" | "the command writes a merge commit under the `--merge` flag" |

## One Fact, One Place

**Should**

Should write one fact once, and cut every restatement of it.

| Defective | Corrected |
|---|---|
| "The guard rejects a path outside the repository. Any path outside it is rejected, so the write never runs." | "The guard rejects a path outside the repository, so the write never runs." |

## Show the Example, Not a Description of It

**Should**

Should show an example where one exists, instead of describing it: the defective line
beside the corrected one, never an account of the difference.

Should put a table, a diagram or a code block in place of prose carrying the same fact in
more lines. Prose keeps what none of the three holds: why the fact is so, and what to do
where the example stops.

| Defective | Corrected |
|---|---|
| "the corrected form differs from the defective one in carrying a word naming each kind" | "`exec` with `T` is called on `obj`" beside "the template method `exec`, instantiated for the type `T`, is called on the object instance `obj`" |

## Impersonal and Personal

**Must**

A conversation — a review comment or reply, an issue or thread comment, a message — is
written in the personal register. Every other text is written in the impersonal one: a
skill, a command, a persona, documentation, an issue, a description, a commit body.

| Register | The subject of a sentence | Who stands in it |
|---|---|---|
| impersonal | the thing the sentence is about | neither the writer nor the reader: no "we saw above", no "you get a pointer" |
| personal | the writer | the writer, addressing the reader |

| Defective | Corrected |
|---|---|
| "as we saw above, you get a pointer to the object" | "the cast answers a pointer to the object" |
| "the loop should be extracted" — in a review comment | "I suggest extracting the loop" |

## Name the Force, Not Just the Action

**Must**

A sentence prescribing an action must convey the force it carries — one of the four
markers, in the words the `writing-language/<language>.json` file gives for that language
— in the register Impersonal and Personal fixes for the text it stands in.

The impersonal form runs the force word with the action, active: "should extract the
loop", "the caller should extract the loop". Never a bare "extract the loop", and never a
passive leaving the actor unnamed: "the loop should be extracted". The personal form runs
in the first person: "I suggest extracting the loop".

A conversation carries force at the recommended level, which is where the language files
give it a first-person form. A stronger force reaches the reader through the label on a
finding, or through the artifact the message names.

## An Inanimate Subject Takes Only the Action It Performs

**Should**

Should give a thing, as a subject, only a verb naming what that thing does. An action a
person performs on it takes the form the language keeps for that one.

| Defective | Corrected |
|---|---|
| Модуль разрабатывает | Модуль разрабатывается |
| Репозиторий подключает подмодули | Репозиторий содержит подмодули |

The rule holds in every language, and not in a sentence prescribing an action, which takes
the form the Name the Force, Not Just the Action section fixes for its register.

## What Introduces an Enumeration Names It

**Should**

Should name what an enumeration holds in the words that introduce it, and should write no
sentence whose whole content is that an enumeration follows.

| Defective | Corrected |
|---|---|
| "This brings three things:" | "The merge leaves behind:" |
| "The reasons are as follows:" | "The parameters were chosen for:" |

Those naming words stand above a list whose items are on their own lines, or in a table,
and the colon that introduces it is theirs. A series inside a sentence takes no lead-in at
all: it runs as part of the sentence, which is cut in two by anything introducing it.

| Defective | Corrected |
|---|---|
| "The merge leaves behind the following: the branch, the status and the remote" | "the merge leaves behind the branch, the status and the remote" |

A count announced above an enumeration goes stale as soon as an item is added. What closes
one is the statement that nothing else belongs to it — "Nothing else is required" — never
the count.

## Name the State, Not the Colour

**Must**

Must name a state by its condition, never by the colour of an indicator reporting it:
`CI green` is not a condition, "every check the project declares has passed" is. A colour
word stands in prose where the table below admits it, and anywhere else is a defect.

| Where it stands | Why |
|---|---|
| inside a code span: `CI green`, `red-green-refactor` | quoted rather than used |
| inside a fenced block | code rather than prose |
| in initialism case: RED for rate, errors and duration | an initialism that spells a colour |

## No Slang, No Unnecessary Borrowing

**Should**

Should use the term the language's own technical literature established rather than a
phonetic transliteration from another language, whichever language is being written. The
term for an operation: the `writing-language/<language>.json` file, beside this one.

| Kept as it is | Replaced |
|---|---|
| a command, a flag, an identifier, an error string, in backticks: `git push` | an action named by a word of the language |
| the English name of an operation, carried by a verb of the language: «делать push», «вызывать команду pull» | the same name inflected as a word of the language: a transliteration wearing native endings |
| a borrowed word that is the field's standard term in that language | a borrowing a technical document in that language would not use |

## Prefer Keyboard-Reachable Characters

**Must**

Must write a dash, an arrow, an ellipsis and a quote in the form a plain keyboard
produces, in any text written for a human reader.

| Avoid | Prefer |
|---|---|
| — em dash | `-` hyphen, or split the sentence at that point instead |
| – en dash in a range | `-` hyphen: `1-5`, not `1–5` |
| → | `->` |
| … | `...` |
| “ ” ‘ ’ curly quotes | `"` `"` `'` `'` straight quotes |

This does not reach a file of instructions to an agent (`skills/`, `agents/`, `commands/`,
`hooks/`, `AGENTS.md`), which keeps the em dash and the arrow, nor a quotation, a code
identifier or a character the language's orthography requires (`«` `»` in French), which
stay as the source has them.

## What This Does Not Cover

**May**

- A code identifier and an API name, and the language required for them (the project's
  `AGENTS.md` file): this skill governs prose.
- A loanword that is itself the field's standard term in that language.

## Self-Check Before Sending

**Should**

Should re-read prose, before sending it, against what a single pass settles — a sentence
in the wrong register for the text it stands in, a prescribing sentence with no force word
in it, a name with no word naming its thing beside
it, a colour word standing for a state, a term the `writing-language/<language>.json` file
names differently, and a dash, arrow, ellipsis or quote a plain keyboard does not produce.
