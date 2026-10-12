```bash
git push -u origin HEAD                           # send the branch
git checkout main
git merge --no-ff rui/chore/release-2.4.0
git push
git tag -a v2.4.0 -m "v2.4.0"                     # on the merge commit
git push --tags                                   # starts the release workflow
```

The annotated tag goes on `main` once `main` is on `origin`, and the tags travel in a push of their own.
