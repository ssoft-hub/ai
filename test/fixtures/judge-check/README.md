# Known answers for the `comments` graders

The replies below have fixed verdicts, against which the judge of an `llm` grader is
checked before a suite's numbers are trusted. Each file is the whole reply, as the model
would send it. Each scoring grader under `evals/comments/*/graders/` measures one section
of the skill:

| Grader | Section |
|---|---|
| `every-comment-is-of-an-admitted-kind` | Two Kinds of Comment |
| `no-comment-a-name-or-a-type-replaces` | A Comment a Name or a Type Replaces |
| `no-comment-carries-case-history-or-a-plan` | What a Comment Leaves Out |
| `every-comment-carries-one-fact` | One Fact per Comment |

| File | Role | Fails | Passes | Why |
|---|---|---|---|---|
| `justified-one-line.md` | the control: the one reply every grader passes, which shows no grader fails a correct reply | nothing | every grader | the comment passes the deletion test, since without it the first read conveys no reason to be there, and the checkable claim, since it carries an ordering checked against the call `wake` and the two reads; no row of the replacement list describes it; it carries one fact and no case history or plan |
| `value-reasons.md` | the one FAIL turning on the sentence "The deletion test never compares why a value is the one it is." | `every-comment-is-of-an-admitted-kind` | the other graders | the comment names the function `read_status()`, called in the loop beside it, so it passes the checkable claim; it gives only why the value `0.2` is the one it is, which the deletion test never compares, so it fails that test alone; no row of the replacement list describes it, since it names no step, says neither what a condition tests, what the literal stands for nor what the variable holds, names no units or admitted values, labels no block and restates nothing |
| `extractable.md` | the FAIL of `no-comment-a-name-or-a-type-replaces` | `no-comment-a-name-or-a-type-replaces` | the other graders | the comment says what a condition tests, which the row for a condition replaces with a named predicate; it passes the deletion test, since `status & 0x04` alone does not convey what the line tests, and carries a condition as its checkable claim |
| `case-history.md` | the FAIL of `no-comment-carries-case-history-or-a-plan` | `no-comment-carries-case-history-or-a-plan`, `every-comment-is-of-an-admitted-kind` | the other graders | the comment says when the line was changed, which is case history; with the comment deleted the condition conveys the same meaning, so it fails the deletion test |
| `two-facts.md` | the FAIL of `every-comment-carries-one-fact` | `every-comment-carries-one-fact` | the other graders | the comment carries two facts, the stale first read and the alarm flag cleared on every read; it passes both tests of Two Kinds of Comment for the reasons `justified-one-line.md` does |

A check runs the replies as cases of a throwaway plugin root, built outside this tree,
whose `prompt.md` file asks the model to output one file verbatim and whose `graders/`
directory holds a copy of every grader under test. They sit here rather than under
`evals/`, which the case walk would run as cases of the suites themselves.
