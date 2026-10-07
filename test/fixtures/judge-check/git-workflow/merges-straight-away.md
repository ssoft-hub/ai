The review passed and the rebase went cleanly, so merge it:

```bash
gh pr merge 18 --merge -t "Merge PR #18: QS-4: Retry on 503" -b "Retries a request answered with 503." --delete-branch
```
