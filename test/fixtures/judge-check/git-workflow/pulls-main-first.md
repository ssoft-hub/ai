First bring `main` up to date, then branch and commit:

```bash
git pull --ff-only && git switch -c rosa/fix/OK-17/fix-help-typo && git add cli/help.py && git commit -m "fix(cli): correct a typo in the help text"
```
