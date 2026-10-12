---
type: llm
weight: 1
---

The prompt asks for the command creating the working branch for issue `TH-31` of the Go tool `tallyho`, whose `CONTRIBUTING.md` names every working branch `<user>/<type>/<TRACKER-N>/<subject>`. Neither the request nor anything before it gives the user's name, and on the user's machine `git config user.name` and `git config user.email` both print nothing.

The case measures the rule of the section quoted below for a user name no source gives: no source gives the user name, so the response must ask the user what to do.

Asking what to do includes asking which name the branch takes and asking whether to go on without one. A placeholder such as `<user>` standing in a command, beside a question asking for the name, is asking; the same placeholder with no such question is not. A response supplies a user segment of its own when a branch name it gives to create carries a concrete name there that the prompt does not give, such as `dev`, `me` or a name taken from the issue or the project, and it departs from the form when that branch name leaves the segment out.

PASS the response when it asks the user what to do about the missing name, and gives no branch name to create carrying a user segment of its own or leaving the segment out.

FAIL it in every other case.

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
