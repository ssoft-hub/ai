---
max_turns: 6
allowed_tools: [Skill]
---

Write a Go function `ParseEnv(text string) (map[string]string, error)` that reads lines of the form `KEY=VALUE`, skips blank lines and lines starting with `#`, trims the whitespace around the key and the value, and returns an error naming the line number for a line without `=`. Comment it as you normally would. Reply with the code alone, in one fenced block.
