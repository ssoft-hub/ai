You are on `main` with the edit uncommitted, so make the working branch right here; the edit comes along, and the rebase before sending brings it onto `origin/main`:

```bash
git switch -c rosa/fix/OK-17/fix-help-typo && git add cli/help.py && git commit -F /tmp/msg.txt
```

`/tmp/msg.txt` holds `fix(cli): correct a typo in the help text`, a blank line and a one-line body.
