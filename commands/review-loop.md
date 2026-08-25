---
description: Iterate review and fix rounds, with a caller-chosen tool and depth, until a pass reports no blocking finding, capped at 3 passes
argument-hint: <tool(s)> [quick|light|normal|thorough|ultra] [scope] — e.g. "code-reviewer + security-auditor, thorough, PR #56"
license: Unlicense
metadata:
  author: ssoft
  tags:
    - pipeline
    - review
---

$ARGUMENTS names the review tool(s), the depth to run them at, and the scope. Depth is
one of a fixed, tool-agnostic scale — `quick`, `light`, `normal`, `thorough`, `ultra`,
least to most rigorous, defaulting to `normal` when omitted — so the same word means the
same relative rigor regardless of which tool answers it. Translate it into whatever the
named tool's own notion of depth is (a setting, an instruction in its invocation, which
of its own checks to run); this command does not define what a tool does at each level.
Scope defaults to the current diff/branch when omitted. If no tool is named, stop and
ask which one before guessing; the tool decides what "blocking" means for the rest of
this run.

Pick where every pass of this loop runs, once, before the first pass: the current
working directory, when it is already checked out to the requested scope and carries no
uncommitted change or unrelated in-progress work the review would disturb. Otherwise use
an isolated worktree checked out to the requested scope — except when that scope *is*
what the current directory already has checked out and the only problem is an
uncommitted change; git refuses to check out the same branch into a second worktree, so
there stash the change instead and review in the current directory, popping the stash
back once the loop ends so nothing stays hidden in it. When a worktree was created for
this run, remove it (`git worktree remove`) once the loop ends, whichever way it ends,
after every fix from this run is committed (step 3) — the branch's commits live in the
shared repo regardless of the worktree directory, so removing it loses nothing.

Loop, for up to 3 passes:

1. Run the named tool(s) over the whole scope — diff, file, cross-file, and issue/PR
   state — not only the lines the previous pass touched. Check issue/PR state yourself
   when the named tool has no notion of it. When more than one tool is named, run them
   in parallel and merge their reports, the same fan-out `/ship` uses for
   `code-reviewer` + `security-auditor`.
2. A pass is **blocking** if any tool reports a blocking-severity finding by its own
   definition (e.g. `code-review-and-quality` → Giving Feedback, `security-auditor` →
   Critical/High; for a tool with no blocking label of its own, whichever of its
   severity tiers would actually gate a merge count as blocking, the rest as nits);
   **clean** otherwise.
3. Fix every blocking finding yourself — no subagent owns this step — and resolve any
   nit or question that's practical to address on the spot in the same pass (fix the
   nit, answer the question). Commit every fix before the next pass, or before ending
   the loop, rather than carrying it forward for no reason.
4. A **blocking** pass repeats from 1 after that fix step, so the next pass confirms
   the fix. A **clean** pass stops the loop right there — a nit resolved on a clean pass
   needs no re-review to confirm it.

Reaching pass 3 still **blocking** stops the loop too: that is **not converging**.

End every run — **clean**, **not converging**, or stopped early — with one summary:
every finding raised across all passes, grouped into what was fixed (blocking findings
and any nit/question resolved along the way) and what is still open (only possible on
**not converging**, or a nit/question deliberately left, with the reason). State which
pass found what, so the report reads as a history. Do not report the loop as clean when
a blocking finding is still open.

Local edits and fixes proceed automatically. What waits, and under which rule: `git push`,
which a round of this loop does not reach (`pr-rules` → When a Check Runs); `gh issue edit` and
`gh pr edit`, for the review wording they can put in front of a reader (`pr-rules` →
Pending by Default); and the merge, which is the human's (`pr-rules` → Merge Strategy 2).
This command fixes code; it does not publish or merge on its own.

This does not replace `/ship`: `/ship` stays a single-pass go/no-go with a fixed
reviewer pair. Use this command instead when the change needs iteration, a different
tool, or a depth `/ship` doesn't offer, to reach that pass.
