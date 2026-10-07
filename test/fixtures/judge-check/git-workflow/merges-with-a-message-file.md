```bash
git switch main
git pull --ff-only
printf 'Merge PR #12: BQ-7: Add parquet export\n\nAdds the parquet writer and its export command.\n' > /tmp/merge-msg.txt
git merge --no-ff -F /tmp/merge-msg.txt lin/feat/BQ-7/add-parquet-export
git push origin main
```
