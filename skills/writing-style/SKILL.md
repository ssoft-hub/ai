---
name: writing-style
version: "1.0.0"
description: Apply when writing documentation, issue/PR/commit text, or communicating with the user, in any human language
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
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
written in, not its shape:

- Code comment structure and when to write one → `comments` skill.
- Public API documentation structure → the API-documentation skill of the language being
  written.
- Issue title/description structure → `issue-rules` skill.
- PR title/description structure, review comment/reply structure → `pr-rules` skill.
- Commit message structure → `commit-rules` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own writing-style conventions, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Match the Technical Register

Write in the plain, precise register of technical prose in that language — not spoken
register, not marketing tone, not chat slang. Drop filler ("just", "simply",
"basically"), hedging padding ("I think maybe", "possibly"), and pleasantries that carry
no information. State the fact, the reason, the next step.

## State the Result, Not the Process

Every artifact states the result it leaves behind, not the sequence of steps that
produced it. Leave out the order the work happened in, attempts that were abandoned,
corrections made along the way, and any account of a mistake and its fix. The reader
needs what is true now, and the history is already in the commits.

Reasoning that arose while working is not content either. State the constraint that
decided the outcome, and leave out the deliberation that found it: the options weighed,
the dead ends, and the asides about what was considered.

Length is part of being correct here. Text longer than its subject requires dilutes the
part that matters and spends the reader's attention before they reach it. Write full
sentences, each carrying one fact, and cut every sentence that carries none.

This holds for every artifact and every channel, not only the ones with a template:
documentation, commit bodies, issue and PR/MR descriptions, comments and replies in an
issue or review thread, progress notes, and messages in a tracker, a chat or a mail —
on any platform. A thread comment is the most common place the rule is broken, because
the work is fresh and the process feels like news; state what is true of the artifact
now, and say what changed only when the reader has to act on the change.

## Name the Force, Not Just the Action

A sentence prescribing an action to a person - in a review comment or reply, an issue or
thread comment, a message - runs force word, action, what it acts on: "should extract the
loop", never "the loop should be extracted", since the force word addresses whoever will
act. The force is one of the four markers, and the words it is stated with are in
`writing-language/<language>.json`, beside this file.
## No Figures That Go Stale

Leave out numbers that measure a run rather than describe the subject: test totals and
pass counts, coverage percentages, timings, counts of changed files, lines or commits,
and the hash of a commit on a branch still being rebased. A rebase, a merge, or one
further commit invalidates them, and nothing in the text says so afterwards. They carry
nothing a reader acts on either — the CI run and the diff hold those numbers and keep
them current.

Name the durable thing instead: the command that produces the number (`npm test`), the
test that covers the behaviour (`key_shorter_than_16_bytes_is_rejected`), or the file
and symbol that changed. A figure belonging to the subject itself stays — a measured
regression the change exists to fix, a documented limit, a version — because rewriting
history does not make it untrue. A measurement that needs the code it was taken on
names a released version or a tag, or the merge commit on the protected branch, never a
hash from the branch under review: rebase replaces those commits and the hash then
points at nothing.

## Name the State, Not the Colour

Name a state by its condition, never by the colour of an indicator reporting it:
`CI green` is not a condition, "every check the project declares has passed" is.

## No Slang, No Unnecessary Borrowing

Prefer the term the target language's own technical literature established over a phonetic
transliteration borrowed from another language. A borrowed word stays where it is the
field's standard term in that language; it is a defect where a written technical document
in that language would not use it. The term to use for an operation:
`writing-language/<language>.json`, beside this file.

A command, a flag, an identifier and an error string keep their own spelling in every
language, in backticks: `git push`, not a word transliterating it. What the dictionary
replaces is the action named by a word of the language, never the name of the thing run.
## Applies to Every Language, Not Just One

The rule is symmetric: whichever language is being written, use that language's own
established technical vocabulary rather than reaching for a borrowed shortcut. This
applies equally to documentation, issue/PR bodies, commit message bodies, review
comments and replies, and conversational responses.

## Prefer Keyboard-Reachable Characters

Typographic dashes, arrows, ellipses, and curly quotes are one of the tells that mark
prose as machine-generated, and they are harder to type correctly than the plain
character every keyboard produces directly. Use the plain form:

| Avoid | Prefer |
|---|---|
| — em dash | `-` hyphen, or split the sentence at that point instead |
| – en dash in a range | `-` hyphen: `1-5`, not `1–5` |
| → | `->` |
| … | `...` |
| “ ” ‘ ’ curly quotes | `"` `"` `'` `'` straight quotes |

Applies regardless of language, to text written for a human reader — documentation,
issue/PR/commit text, review comments, conversational responses. Does not apply to
agent-facing instruction files (`skills/`, `agents/`, `commands/`, `hooks/`, `AGENTS.md`) —
those keep the em dash / arrow convention already established across that corpus, since
nobody is being asked to type it back and the structural notation (`X → Y skill`) is
more scannable than the ASCII form.

Exception, regardless of audience: leave a quotation, a code identifier, or a character
the target language's own orthography requires (e.g. `«` `»` in French) exactly as it
appears in the source — this governs characters chosen when writing new prose, not
characters copied from elsewhere.

## What This Does Not Cover

- Code identifiers, API names, and their required language (see project `AGENTS.md`) —
  this skill governs prose, not identifier naming.
- A loanword that is itself the field's standard, dictionary/glossary-recognized term
  in that language (there is no requirement to invent an awkward native neologism where
  none is actually used in professional writing).
- Keyboard-reachable-character preference on agent-facing instruction files (`skills/`,
  `agents/`, `commands/`, `hooks/`, `AGENTS.md`) — see Prefer Keyboard-Reachable
  Characters above for that carve-out.

## Self-Check Before Sending

Re-read prose before sending it: replace a transliterated term with the one
`writing-language/<language>.json` names for that operation, and replace a
dash, arrow, ellipsis or quote a plain keyboard cannot produce with the form Prefer
Keyboard-Reachable Characters gives.
