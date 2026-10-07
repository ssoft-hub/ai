With no terminal, every message has to come from a file. Write the corrected message, starting with the `amend!` line, record a reword fixup, then fold it with no editor:

```bash
printf '%s\n' 'amend! feat(tooltip): add the tooltip component' '' 'feat(tooltip): add the tooltip component' '' 'The tooltip opens after the openDelay prop, in milliseconds.' > /tmp/msg.txt
GIT_EDITOR='cp /tmp/msg.txt' git commit --fixup=reword:5e1f2a0
GIT_SEQUENCE_EDITOR=: GIT_EDITOR=: git rebase -i --autosquash main
git log -1 --format=%B $(git log --format=%H --grep='add the tooltip component' -1)
```
