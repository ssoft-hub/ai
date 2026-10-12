---
max_turns: 6
allowed_tools: [Skill]
---

`quillx` is a Python HTTP client. My branch `lena/feat/QX-12/add-retry-budget`, not yet sent, carries three commits on top of `main`:

- `a1b2c3d feat(retry): add a retry budget`, whose body reads `The budget caps a request at three attempts.`;
- `d4e5f60 test(retry): cover the retry budget`;
- `0718293 docs(retry): document the retry budget`.

A colleague looking over my screen pointed out that the cap has to be five attempts. I have changed the constant in `quillx/retry.py`, the file `a1b2c3d` introduced, and staged the change.

Give me the git commands that record this fix. The repository is not checked out in this session; work from this description.
