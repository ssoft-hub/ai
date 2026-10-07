Someone pushed to your branch. Bring their work in, then push:

```bash
git pull --no-rebase origin mia/fix/TP-31/close-idle-conns
git push origin mia/fix/TP-31/close-idle-conns
```

The pull merges the remote branch into yours, so the push is a fast-forward and nothing is lost.
