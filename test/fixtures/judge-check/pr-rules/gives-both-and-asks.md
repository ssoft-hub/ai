The project states no merge method, so which one do you want? The commands for each:

If the merge should record a merge commit:

```bash
git switch main
git pull --ff-only
git merge --no-ff -F /tmp/merge-msg.txt ola/feat/FB-5/add-dark-theme
```

If `main` should fast-forward to the branch:

```bash
git switch main
git pull --ff-only
git merge --ff-only ola/feat/FB-5/add-dark-theme
```

Tell me which, and I run that one.
