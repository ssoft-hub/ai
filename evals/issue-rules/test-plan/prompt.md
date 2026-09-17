---
max_turns: 6
allowed_tools: [Skill]
---

A change to the tool `tools/secret-guard.js` narrows what the tool warns on: a 40-character hexadecimal string draws a warning only where a key-like name stands before it, so a file of commit hashes draws none while a file holding a token still draws one. The tool runs as a hook, and Claude Code reads it from the directory `~/.claude/`, where the script `node install.js` copies it. A change in the working tree reaches no session until that script has run and a session reading the copy has started.

Write the `## Test plan` section of the issue for that change, and reply with that section alone.
