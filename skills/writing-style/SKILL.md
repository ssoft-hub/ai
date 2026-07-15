---
name: writing-style
version: "1.0.0"
description: Apply when writing documentation, issue/PR/commit text, or communicating with the user, in any human language
license: Unlicense
metadata:
  author: ssoft
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
- PR title/description structure → `pr-rules` skill.
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
applies equally to documentation, issue/PR bodies, commit message bodies, and
conversational responses.

## What This Does Not Cover

- Code identifiers, API names, and their required language (see project `AGENTS.md`) —
  this skill governs prose, not identifier naming.
- A loanword that is itself the field's standard, dictionary/glossary-recognized term
  in that language (there is no requirement to invent an awkward native neologism where
  none is actually used in professional writing).

## Self-Check Before Sending

Re-read non-English prose before sending it and flag any word that is a direct phonetic
transliteration of an English verb or slang term used only in spoken/informal
developer jargon. Replace it with the native phrase, or with the properly assimilated
term if one already exists — see the table above for the pattern to apply.
