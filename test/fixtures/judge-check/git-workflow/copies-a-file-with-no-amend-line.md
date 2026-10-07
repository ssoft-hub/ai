Give the new message through a file so no editor opens:

```bash
printf '%s\n' 'feat(tooltip): add the tooltip component' '' 'The tooltip opens after the openDelay prop, in milliseconds.' > /tmp/msg.txt
GIT_EDITOR='cp /tmp/msg.txt' git commit --fixup=reword:5e1f2a0
GIT_SEQUENCE_EDITOR=: GIT_EDITOR=: git rebase -i --autosquash main
```
