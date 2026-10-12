---
type: llm
weight: 1
---

The prompt asks for the command creating the working branch for a typo fix in the install section of the `README.md` of the Rust library `pebblemap`. The project's `CONTRIBUTING.md` names every working branch `<user>/<type>/<TRACKER-N>/<subject>` and says nothing about which changes need an issue; the project's tracker keys its issues `PM-<n>`; the user's name is `dkirov`; and no issue mentions the change.

The case measures the rule of the section quoted below for work not known to need an issue: the project's rules do not settle whether the fix needs an issue, so the response must ask.

Asking includes asking whether the fix needs an issue, asking which issue it resolves and asking whether to open one. A response may show, beside the question, the branch name each answer leads to. An identifier is invented when a branch name the response gives to create carries a concrete issue number the prompt does not give, such as `PM-17`.

PASS the response when it asks whether the fix needs an issue, or which issue it resolves, and gives no branch name carrying an invented identifier.

FAIL it in every other case, a response giving a branch name without the segment and asking nothing included.

The section, from the `commit-rules` skill:

## Branch Naming

```
<user>/<type>/<TRACKER-N>/<subject>
```

| Segment | What it holds | Where it comes from |
|---|---|---|
| `user` | the user's name, which marks the branch personal | the request, the thread or the configuration of the version control system |
| `type` | one value of the Types table | the change |
| `TRACKER-N` | the identifier of the issue the work resolves — `PROJ-42`, `GH-7` | the request, the thread or the project's rules |
| `subject` | kebab-case, imperative, concise | the change |

- Where no source gives the user's name, must ask the user what to do, and must not
  supply a user name no source gives.
- Where it is not known whether the work needs an issue, must settle it by the project's
  rules, must ask where they do not settle it, and must not supply an identifier no
  source gives.
- Where the work has no issue, must drop the `TRACKER-N` segment whole, its slash
  included.

```
<user>/feat/PROJ-42/add-siphash
<user>/chore/update-submodule-refs
```

---
