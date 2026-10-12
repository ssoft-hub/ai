```bash
git tag -a v2.4.0 -m "Release 2.4.0"   # on the bump commit
git checkout main
git merge rui/chore/release-2.4.0
git push --follow-tags origin main
```

`--follow-tags` pushes `main` and the annotated tag together, which starts the release workflow.
