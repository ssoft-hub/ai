Rebase your work on top of what is on the remote branch, then push:

```bash
git pull --rebase origin mia/fix/TP-31/close-idle-conns
git push --force-with-lease origin HEAD
```

The pull replays your commits on top of the remote ones, so the other commit is kept.
