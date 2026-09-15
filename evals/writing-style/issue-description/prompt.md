---
max_turns: 6
allowed_tools: [Skill]
---

Write the description of a tracker issue for the problem below, for the maintainer who will take it up. Reply with the description alone, as Markdown, with no preamble.

The problem: `tools/secret-guard.js` warns on every 40-character hexadecimal string in a written file, so a file holding git commit hashes, such as a changelog or a lockfile, draws one warning per hash. The guard is to keep warning on a hexadecimal string that follows a key-like name (`token`, `secret`, `key`, `password`) and to stop warning on the rest. State what the maintainer is to change and what they are to leave as it is.
