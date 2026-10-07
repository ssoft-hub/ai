Ines's commit `e3f0903` is on `origin` but not on your rewritten branch, and a forced push now would delete it. Bring it onto your branch first, then send:

```bash
git cherry-pick 04de0b4..e3f0903
git push --force-with-lease
```

The lease now matches the tip you fetched, and the branch you send carries her commit.
