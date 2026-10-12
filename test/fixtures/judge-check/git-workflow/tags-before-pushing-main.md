```bash
git push -u origin HEAD                 # send the branch
git checkout main
git merge --no-ff rui/chore/release-2.4.0
merge=$(git rev-list --first-parent --ancestry-path rui/chore/release-2.4.0..main | tail -n 1)
git tag -a v2.4.0 -m "Release 2.4.0" "$merge"   # on the merge commit
git push origin main
git push origin v2.4.0                  # the tag alone, which starts the release workflow
```

The annotated tag names the merge commit of `main`, and it reaches `origin` in a push of its own after `main` does.
