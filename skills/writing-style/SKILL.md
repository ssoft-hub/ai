---
name: writing-style
version: "1.0.0"
description: Apply when writing documentation, issue/PR/commit text, or communicating with the user, in any human language
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
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
- Public API documentation structure → `doxygen` skill.
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

## No Slang, No Unnecessary Borrowing

Prefer the term already established in the target language's own professional/technical
literature over an informal phonetic transliteration borrowed from another language. A
borrowed word is fine when it's the field's actual standard term (an assimilated loanword
every glossary in that language uses); it's a defect when it's an ad hoc transliteration
of spoken slang that a written technical document in that language would not use.

Russian is the clearest example of this distinction, since Russian-language developer
slang borrows verb forms wholesale from English rather than translating them:

| Slang (avoid in written technical text) | Prefer |
|---|---|
| пушить / запушить | отправить (изменения/ветку) в удалённый репозиторий |
| коммитить / закоммитить | зафиксировать изменения |
| гейт / гейтить | контрольная точка, условие пропуска, проверка |
| трейс | трассировка |
| задеплоить | развернуть, выполнить развёртывание |
| дефолтный | принятый по умолчанию |

The same rule holds in the other direction — English technical prose picking up
unnecessary loanwords from another language, or internet-chat abbreviations, is the
same defect, just facing the other way.

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

Re-read non-English prose before sending it and flag any word that is a direct phonetic
transliteration of an English verb or slang term used only in spoken/informal
developer jargon. Replace it with the native phrase, or with the properly assimilated
term if one already exists — see the table above for the pattern to apply.

In human-facing text, re-read every language's prose, including English, for a
dash/arrow/quote character a plain keyboard cannot produce directly, and replace it
per the table above.
