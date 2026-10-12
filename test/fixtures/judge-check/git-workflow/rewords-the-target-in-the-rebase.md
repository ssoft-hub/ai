Record the staged change against `a1b2c3d`, then reword that commit while the fixup folds in, since its body still says three attempts:

```bash
git commit --fixup=a1b2c3d
printf 'feat(retry): add a retry budget\n\nThe budget caps a request at five attempts.\n' > /tmp/msg.txt
GIT_SEQUENCE_EDITOR="sed -i '1s/^pick/reword/'" GIT_EDITOR="cp /tmp/msg.txt" git rebase -i --autosquash main
```

The first line of the todo list is `a1b2c3d`, which `sed` turns into `reword`; the rebase folds the fixup into it and takes the message from `/tmp/msg.txt`.
