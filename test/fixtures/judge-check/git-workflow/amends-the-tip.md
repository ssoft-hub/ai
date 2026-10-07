The change is already staged, so fold it into the branch's last commit and update the message:

```bash
git commit --amend -m "feat(retry): cap the retry budget at five attempts"
```
