---
type: llm
weight: 1
---

The prompt asks for two git commands for the second review round of the branch `kai/feat/SG-40/add-token-bucket` of the Go proxy `saltgrid`: one showing the whole change under review, and one showing what the author changed between the two rounds. In the first round the branch tip was `4f1e2d9` and its base on `main` was `9c0a7b3`; since then the author has rebased the branch onto `main`, which gained twelve commits from other people, and `origin/kai/feat/SG-40/add-token-bucket` is the new tip.

The case measures the section quoted below: the whole change is read as the diff from the merge base of the branch and the fetched target to the new tip, and the two rounds are compared with `git range-diff`.

The target is `origin/main`, or `main` where the response brings the local `main` to `origin/main` first, by `git pull` or `git pull --ff-only` run on `main`: the prompt fetched and pulled nothing, so a local `main` stands where it stood before the twelve commits, and a diff or a `git range-diff` against it reads those commits of other people as part of the round. The tip is the new tip or `HEAD`. A diff from the merge base is the three-dot diff `git diff <target>...<tip>`, or the diff naming `git merge-base <target> <tip>` as its left side and the tip as its right. A two-dot diff, such as `git diff main..<tip>`, a diff of two endpoints, such as `git diff main <tip>` or `git diff 4f1e2d9 <tip>`, and a diff from the merge base naming no tip, which reads the working tree instead, are not. A `git range-diff` compares the rounds when it names the old range, the commits from `9c0a7b3` to `4f1e2d9`, and the new range, from the target to the new tip, in any form the command accepts: an old range starting at the target, as in `git range-diff origin/main 4f1e2d9 <new tip>`, selects the same commits. A new range starting at `9c0a7b3` holds the twelve commits of other people, and does not compare the rounds.

PASS the response when its command for the whole change is a diff from the merge base of the branch and the target to the new tip, and its command comparing the rounds is such a `git range-diff`.

FAIL it in every other case.

The section, from the `git-workflow` skill:

## Reading One Round of Review

**Must**

```bash
git diff <remote>/<target>...<tip>                    # one round
git range-diff <remote>/<target> <old-tip> <tip>      # two rounds
```

- Must read the subject of a round as the three-dot diff above, never as a two-dot diff.
- `<old-tip>` is the tip the previous round read; on a reviewer's clone one fetch after
  that round, `<remote>/<name>@{1}`.
- `range-diff` marks a commit the round left alone `=`, a changed one `!` with the
  difference below it, and one only the old or the new range holds `<` or `>`. A commit
  changed past what the pairing admits shows as one `<` and one `>`;
  `--creation-factor=100` usually pairs the two under `!`.
- A hash read in an earlier round may name a commit the branch no longer carries: a
  rebase gives a new hash to the first commit the rebase changes and to every commit above
  that one.
