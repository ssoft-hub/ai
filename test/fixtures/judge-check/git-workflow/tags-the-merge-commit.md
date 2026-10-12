```bash
git push -u origin HEAD                           # send the branch
git checkout main
git merge --no-ff rui/chore/release-2.4.0
git push
merge=$(git rev-list --first-parent --ancestry-path rui/chore/release-2.4.0..main | tail -n 1)
git tag -a v2.4.0 -m "v2.4.0" "$merge"           # on the merge commit
git push --tags                                   # starts the release workflow
```

Once `main` is on `origin`, the annotated tag goes on the merge commit of `main` rather than on the bump commit, and the tags travel in a push of their own.
