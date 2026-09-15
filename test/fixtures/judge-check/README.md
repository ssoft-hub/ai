# Known answers for the `comments` graders

Five replies whose verdict is fixed, against which the judge of an `llm` grader is
checked before a suite's numbers are trusted. Each file is the whole reply, as the model
would send it. The five scoring graders under `evals/comments/*/graders/` nest rather
than stand apart: `every-comment-clears-the-bar` states the general rule, and
`no-comment-restates-the-code`, `no-comment-narrates` and
`no-comment-explains-instead-of-naming` are named instances of it. A comment that should
not exist therefore costs the bar grader beside each instance it fails, two of the five
at least; a comment that is only too long costs `every-comment-is-one-line` alone.

| File | Fails | Passes | Why |
|---|---|---|---|
| `clean.md` | nothing | all five | the code carries no comment, which is the rule's default |
| `justified-one-line.md` | nothing | all five | one line each, each naming a constraint imposed from outside the file |
| `documented-elsewhere.md` | `every-comment-clears-the-bar` | the other four | the accepted set is stated by the program that reads the file, so a reader reaches for that program's documentation rather than getting it wrong |
| `restating.md` | `no-comment-restates-the-code`, `no-comment-explains-instead-of-naming`, `every-comment-clears-the-bar` | `no-comment-narrates`, `every-comment-is-one-line` | each comment says what the line beside it already shows, so it also replaces a name that was never needed and carries no fact a reader could get wrong |
| `justified-three-line.md` | `every-comment-is-one-line`, `no-comment-explains-instead-of-naming`, `every-comment-clears-the-bar` | `no-comment-restates-the-code`, `no-comment-narrates` | the blocks run to three lines and explain what a name should have carried; it also holds the accepted-set comment of `documented-elsewhere.md`, which fails the bar |

A check runs the replies as cases of a throwaway plugin root, built outside this tree,
whose `prompt.md` asks the model to output one file verbatim and whose `graders/` holds a
copy of every grader under test. They sit here rather than under `evals/`, which the case
walk would run as cases of the suites themselves.
