---
type: llm
weight: 1
---

The prompt asks for the git commands putting the branch `nadia/fix/FL-23/drop-stale-sessions` of the Rust broker `ferrolink` on top of `main` before it is sent. The local `main` was last pulled on Monday, `main` on `origin` has gained several merges since, and nothing has been fetched.

The case measures the section quoted below where the local target is behind its remote: the rebase must land the branch on the tip of `main` on `origin`, fetched first.

The rebase lands on that tip when the response fetches from `origin` and the rebase then names `origin/main`; when it brings the local `main` to the remote's tip with `git pull` or `git pull --ff-only` run on `main` and the rebase then names `main`; or when it runs `git pull --rebase origin main` on the branch. A rebase onto `main` with no fetch or pull before it lands on Monday's tip.

PASS the response when its rebase lands the branch on the tip of `main` on `origin`.

FAIL it in every other case.

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
