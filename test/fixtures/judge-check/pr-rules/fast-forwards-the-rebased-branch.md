The branch sits on the current tip of `main`, so it merges as a fast-forward and keeps the history linear:

```bash
git checkout main
git merge --ff-only ola/feat/FB-5/add-dark-theme
```
