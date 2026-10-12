---
type: llm
weight: 1
---
The prompt asks for the commands sending the branch `omar/feat/TP-14/add-cron-parser` of the TypeScript library `tidepool`. The user rewrote the branch after sending it; a colleague then pushed her own commit `e3f0903` to the same branch on `origin`, and the user's `git fetch origin` has brought it in, moving `origin/omar/feat/TP-14/add-cron-parser` from `04de0b4` to `e3f0903`. The rewritten local branch does not carry `e3f0903`.

The case measures the section quoted below on the outcome: after a fetch that brought another author's commit in, the branch sent to `origin` carries that commit.

The commit reaches the branch through `git cherry-pick` of `e3f0903`, or of a range ending there such as `04de0b4..e3f0903`, or through any other command putting the change of `e3f0903` onto the rewritten branch. A push under `--force-with-lease` without `--force-if-includes`, under `--force` or `-f`, or with a `+` before the refspec replaces `e3f0903` on `origin` after the fetch; a push under `--force-with-lease` together with `--force-if-includes` is refused while the commit is not carried.

PASS the response when, once its commands have run, the branch on `origin` carries the rewritten commits and the change of `e3f0903`.

FAIL it otherwise, as when the last push of the branch leaves `e3f0903` out.

The section, from the `git-workflow` skill:

## Sending the Branch

**Must**

Must make the next move the row of the push's answer names; a refused push of the target
follows Merging:

| The answer | The next move |
|---|---|
| `! [rejected] ... (non-fast-forward)` | `git push --force-with-lease --force-if-includes <remote> HEAD` |
| `! [rejected] ... (fetch first)`, or `(stale info)` under the lease | `git fetch <remote>`, then `git push --force-with-lease --force-if-includes <remote> HEAD` |
| `! [rejected] ... (remote ref updated since checkout)` | `git log --reverse <remote>/<name> --not $(git reflog --format=%H <name>)`; `git cherry-pick` of each commit it lists, in that order, save one whose subject a commit of `<remote>/<target>..HEAD` carries: that one is an earlier version of the branch's own commit, sent from another clone; then `git push --force-with-lease <remote> HEAD`, without `--force-if-includes` |

- Must not list the commits to carry by `<remote>/<name>@{1}..<remote>/<name>`, and must
  not run the list again after the cherry-pick.
- Must not push under `--force`, `-f` or a `+` refspec.
