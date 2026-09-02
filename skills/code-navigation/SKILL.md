---
name: code-navigation
version: "1.0.0"
description: Apply when an edit or a verdict turns on a symbol's callers, its implementations, its definition, what a bare name refers to, or whether the symbol has any user left
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - language
  rubric: applied
  tags:
    - navigation
    - symbols
---

# Skill: Code Navigation

Apply when an edit or a verdict turns on a symbol's callers, its implementations, its
definition, what a bare name refers to, or whether the symbol has any user left.

- What is decided on the answer — an access level, a removal, a review finding, a fix —
  belongs to the skill whose rule asked the question.

## Project Overrides

**Must**

Must follow the code-navigation conventions the repository's `AGENTS.md` file or a project
skill defines, instead of the rule here.

---

## Questions a Text Search Does Not Answer

**Must**

A reader must not answer a question below by matching text over the source. A text search
reports a match inside a string, a comment or an unrelated identifier, and misses an
overload, a template instantiation, a macro expansion and a call through a pointer.

| # | Question |
|---|---|
| 1 | which code calls a symbol |
| 2 | what implements an interface or overrides a method |
| 3 | where a symbol is defined |
| 4 | what a bare name refers to across the workspace |
| 5 | whether a symbol has any user left |

Nothing else belongs to the list. A call path is question 1 asked again at each site the
answer names. The symbol of every question is one a program declares in its source, so a
name standing in prose or in a document falls outside the five.

## Where the Answer Comes From

**Must**

The questions stand unchanged in every language, and the prerequisite alone differs. An
answer must come from a language server configured for the file type, reading the project
model the table below names for the language the question is asked in:

| Language | What the server reads |
|---|---|
| C++ | the compilation database `compile_commands.json` |
| JavaScript | the file `jsconfig.json`, or the project's own `package.json` file |
| any other language | the project model that language's server names |

## Naming the Operation

**Must**

An answer to one of those questions (Questions a Text Search Does Not Answer) must name
the operation that produced it, and a run of the `grep` or `rg` command is not such an
operation. Where the reader holds no such operation, the answer must say so, and the
reader must not settle for a text search — the rule turning on that answer stands
unresolved until the reader holds such an operation. The word-boundary form and the
substring form of one search over this repository:

```sh
$ grep -rilw "AST" skills/   # this file alone, which prints the term
$ grep -ril  "AST" skills/   # and every file it adds, where the term sits inside a longer word
```

Neither run answers whether a rule about an AST exists. The word-boundary hit is this
file's own example, and the term sits inside a longer word in every file the substring
form adds — `cast`, `fast` and `infrastructure` among those words. The same false match
and the same miss reach a symbol question, where the answer decides an edit.

## The Operations in This Environment

**May**

A reader offered the tool `LSP` may call it for one of those questions (Questions a Text
Search Does Not Answer), each operation addressed by a file path and a one-based line and
character.

The tool reaches only a file type a server is configured for, answering
`No LSP server available for file type: <ext>` for any other, whatever row it takes in
the table of Where the Answer Comes From. Where the tool answers so, the reader holds no
operation for that question, as does a reader not offered the tool at all, and Naming the
Operation states the answer both owe.

The table below is this environment's own, carrying the numbers of Questions a Text
Search Does Not Answer; another environment names operations of its own for the same
questions.

| # | Operation |
|---|---|
| 1 | `findReferences` |
| 2 | `goToImplementation` |
| 3 | `goToDefinition` |
| 4 | `workspaceSymbol`, which takes a query string, leaves the position unread and reads the path only to select the server |
| 5 | the operation of question 1, answering an empty set |

A reader may walk the call path reaching a site with `prepareCallHierarchy`, then
`incomingCalls` on each step `prepareCallHierarchy` answers, and may ask a question of the
same kind that no rule of this catalog turns on — the type an expression has with `hover`,
what a file declares with `documentSymbol`.

## A Rename and a Removal Are Edits

**Must**

A rename and a removal are edits made against the set question 1 returns (Questions a
Text Search Does Not Answer). Where the environment offers no operation performing
either, as this one does not, a skill needing one of the two must ask that question first
and edit afterwards.
