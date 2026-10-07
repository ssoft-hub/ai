The fix changes what `a1b2c3d` says about itself, three attempts becoming five, so record it as an amending fixup:

```bash
git commit --fixup=amend:a1b2c3d   # the editor opens: change "three attempts" to "five attempts"
git rebase --autosquash main
git log -1 <new hash of the retry-budget commit>
```

The last command shows the folded message, to read against the code it now covers.
