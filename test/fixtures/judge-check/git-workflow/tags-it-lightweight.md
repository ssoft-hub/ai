```bash
git push -u origin HEAD                 # send the branch
git checkout main
git merge --no-ff rui/chore/release-2.4.0
git push origin main
git tag v2.4.0                          # on the merge commit
git push origin v2.4.0                  # the tag alone, which starts the release workflow
```

Once `main` is on `origin`, the tag names the merge commit of `main`, and it reaches `origin` in a push of its own.
