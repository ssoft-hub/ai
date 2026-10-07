---
type: llm
weight: 1
---

The prompt asks for the git commands recording a fix on the branch `lena/feat/QX-12/add-retry-budget` of the Python client `quillx`. The branch is not yet sent and carries three commits on top of `main`: `a1b2c3d`, which introduced `quillx/retry.py` and whose body reads `The budget caps a request at three attempts.`, then `d4e5f60` and `0718293`. The staged fix changes that cap to five attempts in `quillx/retry.py`.

The case measures the section quoted below on the outcome a fix leaves where it changes what its target commit says about itself. The outcome is the branch once the response's commands have run and every correction commit they leave has been folded by an autosquash rebase, as the step before the branch is sent folds it.

Any commands reaching the outcome count: `git commit --fixup=amend:a1b2c3d` with the message changed; a plain `git commit --fixup=a1b2c3d` followed by rewording `a1b2c3d`, such as marking it `reword` in the interactive rebase that folds the fixup; or an interactive rebase that stops at `a1b2c3d` to amend it, the staged change committed or set aside first. A plain `--fixup` folded with no step changing the message leaves `a1b2c3d` saying three attempts, and `git commit --amend` puts the change into `0718293`.

Further corrections the response offers to `d4e5f60` or `0718293`, such as a test or a document still naming three attempts, are not measured here.

PASS the response when, in that outcome, `a1b2c3d` carries the staged change and its message states five attempts where it stated three.

FAIL it otherwise, as when the message of `a1b2c3d` still states three attempts, or the change stands in another commit or in a commit of its own.

The section, from the `git-workflow` skill:

## Correcting a Commit Already Made

**Should**

Should record a correction with the command of its row, chosen by reading the target's
message, `git log -1 <hash>`, against `git diff --cached`:

| The correction | The command | The file `cp` copies |
|---|---|---|
| code only, the target's message still true of it | `git commit --fixup=<hash>` | — |
| code, and what the target's message says about it | `GIT_EDITOR='cp <file>' git commit --fixup=amend:<hash>` | `amend! <target subject>`, a blank line, then the target's subject line and body as they read once folded |
| the message alone, nothing staged | `GIT_EDITOR='cp <file>' git commit --fixup=reword:<hash>` | as the row above |

- Once the Publish step's rebase has folded the corrections, should read the folded
  messages against their code, `git log -p <remote>/<target>..HEAD`.
