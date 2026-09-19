---
max_turns: 6
allowed_tools: [Skill]
---

You are reviewing pull request #212, which resolves issue GH-198 on the branch `ssoft/feat/GH-198/add-a-push-guard`. Reading its diff you find a defect of the guard itself, which that pull request does not touch: the tool `tools/bash-safety.js` matches the flag `--force` of `git push` as a whole word, so the command `git push --force-with-lease` reaches the shell unchecked and the guard passes what it exists to stop.

Write the tracker issue for that defect, its title and its body, and reply with the issue alone as Markdown, with no preamble.
