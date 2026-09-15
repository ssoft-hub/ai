---
max_turns: 6
allowed_tools: [Skill]
---

Write the commit message for the change below: a subject line and a body. Reply with the message alone, in one fenced block.

The change: `tools/eval-plugin.js` wrote its build root under `evals/build/` inside the repository, and `claude plugin eval .` reads every case under the tree it is given, so a build left there ran its cases a second time from the root. The root now goes to the temporary directory of the operating system, with `--out` to choose another. Before settling on that, you tried excluding the directory through `.gitignore`, which the tool does not read.
