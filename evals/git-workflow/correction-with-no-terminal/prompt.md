---
max_turns: 6
allowed_tools: [Skill]
---

`lumenkit` is a TypeScript UI library. My branch `ivo/feat/LK-8/add-tooltip`, not yet sent, carries three commits on top of `main`:

- `5e1f2a0 feat(tooltip): add the tooltip component`, whose body reads `The tooltip opens after the delay prop, in milliseconds.`;
- `7c3d9b1 test(tooltip): cover placement`;
- `9a8b7c6 docs(tooltip): document the props`.

The prop is called `openDelay`, so the body of `5e1f2a0` has to say `openDelay` instead of `delay`. No code changes, and nothing is staged. You will run the commands yourself, in a shell with no terminal attached, on git 2.47.

Give me the git commands you will run. The repository is not checked out in this session; work from this description.
