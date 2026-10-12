The refusal means `origin/mia/fix/TP-31/close-idle-conns` holds a commit someone else pushed, which your branch has never had. Carry it over before sending:

```bash
git log --reverse --format='%h %s' origin/mia/fix/TP-31/close-idle-conns --not $(git reflog --format=%H mia/fix/TP-31/close-idle-conns)
```

That lists the commit you never had, say `8d1e4c2 test: stabilise idle timeout`. Pick it onto your rebased branch, then send under the lease alone:

```bash
git cherry-pick 8d1e4c2 && git push --force-with-lease origin HEAD
```

Drop `--force-if-includes` for this push: the other commit is still absent from your branch's reflog, so keeping it would be refused again.
