---
type: llm
weight: 1
---

The prompt asks for the commands merging pull request #18 of the Java service `quayside`, from `tom/fix/QS-4/retry-on-503`, on GitHub with a merge commit through `gh`. The branch was rebased onto the latest `origin/main` after a fetch, and the prompt names no push after the rebase: the branch on `origin` still carries the commits from before it.

The case measures the section quoted below on the outcome: a merge on the forge merges the branch as `origin` holds it, so the rebase reaches the merge only once the rebased branch is sent.

A merge command, `gh pr merge 18 --merge` or any other, run with no push of the rebased branch before it merges the branch from before the rebase. A chain that stops at a check of the branch on `origin` with no push before it gives the user no merge. How the rebased branch is pushed is not measured here.

PASS the response when, once its commands have run, pull request #18 is merged on GitHub with a merge commit, and the commits it merges are the rebased ones.

FAIL it otherwise, as when it merges with no push of the rebased branch before the merge, or gives no merge.

The section, from the `git-workflow` skill:

## Commands by Step

**Must**

Must run the commands in bash or zsh, on git 2.32 or later, the first carrying
`--fixup=amend:` and `--fixup=reword:`. Must run at each step the commands its row names,
in the order given. Must join the commands with no output read between them as one line
with `&&`, never with `;`, `&` or `|`; a pipe stands only where a command reads the output
of the one before it. Must negate with `!` a check whose success is a non-zero exit
before it joins a `&&` chain.

`<remote>` is the remote the branch is sent to, `origin` by convention, and `<target>` the
branch the change merges into, written `<remote>/<target>` after a fetch; `<name>` is the
working branch; `<tip>` its tip, `HEAD` on the author's clone and `<remote>/<name>` on a
reviewer's; `<file>` a file holding a message; `<bump>` the version bump commit.

| Step | Commands | Section |
|---|---|---|
| Branch | `git fetch <remote>`, `git switch -c <name> --no-track <remote>/<target>`, which runs also where another worktree holds `<target>` | — |
| Commits | `git branch --show-current` and `git status --porcelain` before the first commit of a round, then `git commit -F <file>`; a correction in the form its section gives | Making the Branch, Committing with No Terminal, Correcting a Commit Already Made |
| `release` → Step 3 — Bump Version Strings, within Commits | `git grep -n -F "<old-version>"` before the bump and after it | — |
| Publish | `git fetch <remote>`, `GIT_SEQUENCE_EDITOR=: GIT_EDITOR=: git rebase -i --autosquash <remote>/<target>`, the correction check of Rebasing onto the Target, the checks `work-sequence` → When a Check Runs gives, then `git push -u <remote> HEAD`, or after a rewrite `git push --force-with-lease --force-if-includes <remote> HEAD` | Rebasing onto the Target, Sending the Branch |
| A round of review, between Offer for review and Pre-merge issue check | `git diff <remote>/<target>...<tip>`, and from the second round `git range-diff` | Reading One Round of Review |
| Integrate, merged locally, where the target accepts a direct push | in the worktree holding `<target>`, or after `git switch <target>` where none does: `git pull --ff-only`, `git merge-base --is-ancestor <target> <name>`, `test "$(git rev-parse <name>)" = <baseline>`, `<baseline>` being the head SHA `editing` → Guard Against a Stale Reading reads, the merge command of Merging, `git push <remote> <target>`, `git branch -d <name>`, `git push <remote> --delete <name>` | Merging, Removing the Merged Branch |
| Integrate, merged on the forge | `git fetch <remote>`, `git merge-base --is-ancestor <remote>/<target> <remote>/<name>`, the merge the CLI skill of the hosting platform gives; then, in the worktree holding `<target>`, or after `git switch <target>` where none does: `git pull --ff-only`, `git branch -d <name>`, `git push <remote> --delete <name>` | Merging, Removing the Merged Branch |
| `release` → Step 5 — Commit and Tag, once Integrate has run | `git fetch <remote>`, the `<bump>` line of Tagging a Release, `git tag -a <tag> -m "<message>" <commit>` on the commit its table names, `git push <remote> refs/tags/<tag>` | Tagging a Release |
