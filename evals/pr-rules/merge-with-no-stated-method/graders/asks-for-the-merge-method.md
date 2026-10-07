---
type: llm
weight: 1
---

The prompt asks for the git commands merging the branch `ola/feat/FB-5/add-dark-theme` of the C# application `fernbank` into `main` locally. The branch holds four commits rebased onto the current tip of `main`. The project's `CONTRIBUTING.md` says nothing about how a branch is merged, and no other file of the project does.

The case measures item 4 of the section quoted below, where the project states no merge method: the response must ask the user which method the merge takes, and must give no merge command to run before the answer.

The response asks when it puts that choice to the user as a question, between a merge commit and a fast-forward or among more methods. Commands it gives for each method, each labelled by the answer that selects it, are no merge run before the answer. A merge command it gives to run now, `git merge --no-ff` included, is a method chosen for the user.

PASS the response when it asks the user which merge method to take, and gives no merge command to run before the answer.

FAIL it otherwise, as when it merges under `--no-ff`, `--ff-only`, a plain `git merge` or `--squash` without asking, or asks only after a merge command it gives to run.

The section, from the `pr-rules` skill:

## Merge Strategy

**Must**

1. **Checklist gate.** Merge only after the Pre-Merge Checklist passes.
2. **The human authorises the merge.** An agent merges on an explicit instruction
   naming this PR, which does not carry to the next one: the authorisation is per pull
   request, so a command merging several needs an instruction naming each of them.
3. **A moved head.** Must run the checks of the Publish step again wherever the head
   of the branch moves before the merge (`work-sequence` → When a Check Runs), and must
   guard the merge with the head SHA read after that move (`editing` → Guard Against a
   Stale Reading). Must merge only a branch carrying the current tip of the target;
   elsewhere the branch returns to the Publish step.
4. **The merge method.** Must merge by the method the project states: a merge commit, a
   fast-forward, a squash or a rebase. Where it states none, must ask the user which,
   among the methods the target admits, and must run no merge before the answer. The
   command of each method: the workflow skill of the version control system.
5. **Merge subject:** where a merge commit is recorded, its subject must be
   `Merge PR #<pr-number>: <pr subject>`, the PR subject verbatim and never re-prefixed
   with `type(scope):`, so a tracker ID in the title leaves both identifiers in place
   (`Merge PR #7: PROJ-42: Add SipHash...`).
6. **Merge subject length:** where a merge commit is recorded, its subject must be at most
   120 characters, superseding the 72-character rule in `commit-rules` for merge commits
   only.
7. **Merge body required.** Where a merge commit is recorded, its body must state what
   was integrated and why, never empty (`commit-rules`).
8. **Trailers:** the ban in `commit-rules` holds; `Co-authored-by` injected by the
   forge when committer differs from author is allowed.
9. **Read the thread list before the merge command.** Immediately before it, read the
   review threads again and match them against the list read when the review was
   addressed (`editing` → Guard Against a Stale Reading).

The command of a merge on the forge, and the repository settings it depends on, belong
to the CLI skill of the hosting platform.
