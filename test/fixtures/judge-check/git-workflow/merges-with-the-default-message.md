```bash
git switch main
git pull --ff-only
git merge --no-ff lin/feat/BQ-7/add-parquet-export
git push origin main
```

The editor opens on the merge message; set the subject to `Merge PR #12: BQ-7: Add parquet export` and add a body before saving.
