```bash
git diff origin/main...origin/kai/feat/SG-40/add-token-bucket
git range-diff 9c0a7b3..4f1e2d9 origin/main..origin/kai/feat/SG-40/add-token-bucket
```

The first diffs from the merge base, so the twelve commits `main` gained stay out of it; the second pairs the commits of the two rounds across the rebase.
