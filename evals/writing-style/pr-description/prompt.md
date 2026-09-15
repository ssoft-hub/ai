---
max_turns: 6
allowed_tools: [Skill]
---

Write the description of a pull request for the change below, for reviewers who did not see the branch. Reply with the description alone, as Markdown, with no preamble.

Diff summary:
- `tools/skill-gate.js`: the gate reads the skill loads of a subagent from the subagent's own transcript rather than from the main agent's, so a subagent that never loaded a skill is denied even when the main agent loaded it.
- `test/skill-gate.test.js`: two tests, one per kind of agent.
- `README.md`, section Hooks: the sentence on subagents follows.

Motivation: a subagent writing a C++ file was let through because the main agent had loaded `cpp-coding` earlier in the session.
