---
type: llm
weight: 1
---

The prompt asks for the git commands recording a typo fix in `cli/help.py` of the Python tool `orbitkit`. The edit is made and not staged, `git branch --show-current` printed `main`, the local `main` is three commits behind `origin/main`, and one of those three commits also changed `cli/help.py`. The issue is `OK-17` and the user name `rosa`.

The case measures the section quoted below: on a shared branch carrying an uncommitted change, the working branch is made from where the tree stands, so the edit comes with it, and the rebase before the branch is sent brings it onto the target.

Any commands reaching the outcome count: `git switch -c <branch>` or `git checkout -b <branch>` with no start point, then the commit. A branch made from `origin/main` while `cli/help.py` carries the edit, such as `git switch -c <branch> origin/main`, is refused by git, since the commit that branch would check out changed that file; a `git stash`, a switch to such a branch and a `git stash pop` reach the outcome only where the response also resolves a conflict the pop may meet. A `git pull`, a `git pull --ff-only` or a `git merge origin/main` on `main` is refused for the same reason, and a chain after it does not run. Where the branch name is drawn is not measured here.

PASS the response when, once its commands have run, the fix is recorded in a commit on a new working branch, no commit the response makes stands on `main`, and the edit is not lost.

FAIL it otherwise, as when it commits on `main`, or runs a switch git refuses with no step handling the refusal.

The section, from the `git-workflow` skill:

## Making the Branch

**Must**

Must run the check of the branch `commit-rules` → Consistency Rules asks for as
`git branch --show-current`, before the first commit of a round of edits, and must make
the next move its row names:

| The current branch | The next move |
|---|---|
| a working branch | the commit |
| a shared branch, as `commit-rules` → Consistency Rules names one, or an empty line, `HEAD` being detached; carrying neither a commit of the round nor an uncommitted change, `git status --porcelain` printing nothing | the Branch step |
| a shared branch or a detached `HEAD` carrying a commit of the round or an uncommitted change | `git switch -c <name>`, which the rebase of the Publish step brings onto the target; then, where a commit of the round was recorded on the shared branch `<shared>`, `git branch -f <shared> <remote>/<shared>` |
