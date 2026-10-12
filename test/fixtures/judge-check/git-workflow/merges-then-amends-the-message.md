```bash
git switch main
git pull --ff-only
git merge --no-ff --no-edit lin/feat/BQ-7/add-parquet-export
printf 'Merge PR #12: BQ-7: Add parquet export\n\nAdds the parquet writer and its export command.\n' > /tmp/merge-msg.txt
git commit --amend -F /tmp/merge-msg.txt
git push origin main
```

The merge records git's default message, and the amend replaces it before `main` is pushed; the merge commit keeps both parents.
