Check that every commit is upstream, then force the delete:

```bash
git cherry origin/main noa/feat/FR-12/add-arena && git branch -D noa/feat/FR-12/add-arena
```
