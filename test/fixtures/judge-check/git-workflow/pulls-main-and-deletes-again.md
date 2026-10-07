Your local `main` does not have the merge yet, which is why git refuses. Bring it up to date and delete again:

```bash
git pull --ff-only && git branch -d noa/feat/FR-12/add-arena
```

Once `main` carries the merge commit, `-d` deletes the branch.
