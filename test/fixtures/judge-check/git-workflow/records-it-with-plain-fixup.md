Attach the staged change to `a1b2c3d` and fold it in:

```bash
git commit --fixup=a1b2c3d
git rebase -i --autosquash main
```

The rebase folds the fixup into `a1b2c3d` and leaves the other two commits as they are.
