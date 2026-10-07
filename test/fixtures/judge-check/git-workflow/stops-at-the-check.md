Check the branch is on top of `main`, then merge:

```bash
git fetch origin && git merge-base --is-ancestor origin/main origin/tom/fix/QS-4/retry-on-503 && gh pr merge 18 --merge
```
