Your `main` is several merges behind `origin`, so fetch first and rebase onto the remote tip:

```bash
git fetch origin
git switch nadia/fix/FL-23/drop-stale-sessions
git rebase origin/main
```
