---
max_turns: 6
allowed_tools: [Skill]
---

The team wants this of the script `node install.js`, which copies a configuration tree into the directory `~/.claude/`: the script should refuse to run while the tree it copies from holds an uncommitted change, and should run on such a tree under a new flag `--force`. What sits in `~/.claude/` today can differ from every commit, and a reader of that directory cannot tell which commit it came from. The flag `--dry-run`, which prints what a run would write and writes nothing, is already there.

Write the tracker issue for that work, its title on the first line and its body below it, and reply with the issue alone as Markdown, with no preamble.
