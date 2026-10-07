The rebase exists only in your clone, and GitHub merges the branch as `origin` holds it. Send it first, then merge:

```bash
git push --force-with-lease --force-if-includes origin HEAD
git fetch origin && git merge-base --is-ancestor origin/main origin/tom/fix/QS-4/retry-on-503
gh pr merge 18 --merge -t "Merge PR #18: QS-4: Retry on 503" -b "Retries a request answered with 503."
```
