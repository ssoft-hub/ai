Another commit landed on the remote branch. Find it and carry it over, then push the way you did:

```bash
git fetch origin
git log --oneline HEAD..origin/mia/fix/TP-31/close-idle-conns
git cherry-pick <that-commit>
git push --force-with-lease --force-if-includes origin HEAD
```
