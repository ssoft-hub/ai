---
name: gitlab-cli
version: "1.0.0"
description: Apply when carrying out a GitLab action with the glab CLI - issues, merge requests, labels, draft notes, merges
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  rubric: applied
  bound-to:
    - gitlab
  tags:
    - gitlab
    - cli
    - platform
---

# Skill: GitLab CLI

Apply when a GitLab action has to be carried out with `glab` — creating an issue or a
merge request, attaching labels, leaving review feedback, merging.

Mechanics only: what a command does, what keeps review feedback unsent, and where the CLI
help is silent or misleading. No rule about *when* an action is allowed lives here:

- Issue title, description, labels, lifecycle → `issue-rules` skill.
- MR title, description, review comment wording, merge strategy, who authorises a merge,
  the rule that an agent's own review feedback stays unpublished, and the commands that
  publish it on the spot → `pr-rules` skill.

## Project Overrides

**Must**

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own
`glab` conventions, follow those instead. This skill is the fallback for projects that do
not specify their own.

---

## Conventions

**Should**

| Flag on `glab api` | Sends | Where it bites |
|---|---|---|
| `-F/--field` | the inferred type, and `@<path>` expanded into the file's contents | a body read from a file goes through it, `-F description=@<path>` |
| `-f/--raw-field` | a string, `@<path>` included | the API accepts the literal `@C:/path/to/file` as the description, with no error to notice |
| `--input <file>`, `-` for stdin | a raw body — the only way to send nested JSON | sets no `Content-Type`, so without `-H 'Content-Type: application/json'` GitLab answers `HTTP 415`, `{"error":"The provided content-type '' is not supported."}` |

Neither `-F` nor `-f` parses a JSON array or object; Draft Notes → Traps states what that
costs.

Three more, each of which reads as a `gh` habit that does not carry over:

| Expectation from `gh` | What `glab` does |
|---|---|
| `--jq <expr>` filters client-side | there is no such flag: `Unknown flag: --jq.` `glab api` prints JSON (`--output json`, the default) or one object per line (`--output ndjson`), and filtering is a separate step in the pipe |
| `-f` is a field everywhere | on `glab mr create` it is `--fill` and takes no value: `glab mr create -f title=x` answers `Accepts 0 arg(s), received 1.` |
| a path placeholder always expands | `:id`, `:fullpath`, `:namespace`, `:repo`, `:branch` and `:user` expand from the current checkout's project. Outside a checkout whose remotes reach GitLab they are refused — `Unable to expand placeholder in path` — and the way round is `--hostname <host>` with the numeric id or the URL-encoded full path (`group%2Fsubgroup%2Fproject`) |

`:iid` on an issue or merge request path is the per-project number the interface shows,
not the instance-wide `id` the same object also carries; that `id` answers
`{"message":"404 Not found"}` rather than reaching the object. What does collide is one
number across two types: `projects/:id/issues/1` and `projects/:id/merge_requests/1` are
unrelated objects, `iid` being numbered per type.

---

## Issues

**Should**

```
# existing labels
glab label list

# create - labels comma-separated in one flag
glab issue create --title '<Type(scope): Subject>' --description '<body>' \
  --label '<type-label>,<topic-label>'

# read
glab issue view <iid>

# progress comment
glab issue note <iid> --message '<comment>'

# relabel afterwards
glab issue update <iid> --label '<label>' --unlabel '<label>'
```

- A label that does not exist is **created on the fly**, unlike `gh --label`, which
  rejects the command. A typo silently produces a new label, so run `glab label list`
  first.
- `--description` takes the body inline; `-` opens a full-screen editor and waits, so it is
  unusable with stdin closed. `--description-file` does not exist —
  `Unknown flag: --description-file.` A body with newlines therefore goes inline in a
  quoted argument or through the API, where `-F` reads it from a file:
  `glab api projects/:id/issues -X POST -f title='<title>' -F description=@<path>`.
- `--yes` is an interactive-terminal flag and is **not** needed here: with `--title` and
  `--description` both supplied, `glab issue create` and `glab mr create` submit straight
  away with stdin closed. Leave either one out and the command does not hang either — it
  detects the non-interactive session and refuses:
  `'--Title' and '--description' (or '--template') required for non-interactive mode.`

---

## Merge Requests

**Should**

```
# open
glab mr create --source-branch <branch> --target-branch <target> \
  --title '<title>' --description '<body>' --label '<type-label>,<topic-label>'

# read
glab mr view <iid>

# merge
glab mr merge <iid> --message '<subject>

<body>' --remove-source-branch --yes
```

- `glab mr create` reads the GitLab project off the current checkout's remotes, and `-R`
  does not stand in for them: outside a checkout whose remotes reach GitLab it refuses with
  `None of the git remotes configured for this repository point to a known GitLab host`.
  Run it from the checkout.
- There is no `--no-ff` flag: the shape of the merge is the project's **Merge method**
  (Settings → Merge requests), read with `glab api projects/<id>` and set with
  `glab api projects/<id> -X PUT -f merge_method=merge`, which answers with the updated
  project. The API takes three values and
  answers `HTTP 400`, `{"error":"merge_method does not have a valid value"}` for anything
  else:

| `merge_method` | The merge |
|---|---|
| `merge` | a two-parent commit, carrying the `--message` text |
| `rebase_merge` | semi-linear, still a two-parent commit |
| `ff` | fast-forward; no merge commit is ever written |

- `--squash` and `--rebase` change the source commits, not that shape: on
  `merge_method=merge` either still produces a two-parent commit. Whether either may be
  used at all is `pr-rules` → Merge Strategy.

| Flag | What it does | Default |
|---|---|---|
| `--squash` | collapses the branch into one commit | off |
| `--rebase` | replays the branch onto the target, `✓ Rebase successful!` | off |
| `--auto-merge` | looks for a pipeline first: with one running the merge queues behind it, with none it reports `! No pipeline running on <branch>` and merges at once | **on** |
| `--remove-source-branch` | sets the merge request's own attribute, which GitLab acts on at the merge: the source branch is deleted on the server. Where another merge request targets it, see Stacks | the project's setting |

- `glab mr merge` deletes no local branch and says nothing about one, so the local branch
  survives the merge and goes with `git branch -d <name>` — refused by git while a worktree
  holds that branch, and, run from the target branch, refused as not fully merged until that
  branch carries the merge. A worktree stops the merge itself no more than it stops any
  other request over the API.

- The REST equivalent, when the flag names on the installed `glab` do not match, and the
  form that keeps `--auto-merge` out of the picture entirely:

```
glab api projects/:id/merge_requests/<iid>/merge -X PUT \
  -f merge_commit_message='<subject>

<body>' -F squash=false -F should_remove_source_branch=true
```

---

## Stacks

**Should**

A **stack** is a chain of merge requests, each targeting the source branch of the one
below, which GitLab forms itself: a merge request joins one by targeting another open
merge request's source branch, or by another targeting its own. Generally available since
GitLab 19.1, on every tier, up to 20 merge requests, past which the stack control is not
shown.

| Subject | Rule |
|---|---|
| What registers a stack | nothing: no documented API manages one, and a merge request carries no stack field in the API response — the chain is the target branches and nothing else |
| Which merge request is the bottom | the one whose target branch is no open merge request's source branch, whatever branch that is |
| What retargets | the merge: it moves the open merge requests targeting its source branch onto its own target, so a stack merges bottom up. At most four move per merge, a cap only a fan-out reaches, one merge request targeting any one branch of a chain |
| Removing the source branch in the same merge | `--remove-source-branch`, or `should_remove_source_branch=true` on the REST form under Merge Requests, does not stop the retarget |
| Removing it later | triggers none of its own, GitLab documenting the retarget as working "only when a merge request is merged", so it strands whatever still targets that branch |

`glab stack` drives local stacked diffs rather than linking merge requests already open,
and is marked experimental and not ready for production; a chain built by targeting
branches needs none of it.

---

## Draft Notes

**Must**

A draft written through `POST .../merge_requests/:iid/draft_notes` is absent from both
`notes` and `discussions`, and shows up only under `draft_notes`. Sending comes in two
granularities: `PUT .../draft_notes/:id/publish` sends the one draft it names, and
`POST .../draft_notes/bulk_publish` sends every draft the caller holds on that MR.
Whether feedback may be published at all, and by whom, is `pr-rules` → Pending by
Default; this skill states only what the draft endpoints do.

### The draft cycle

`glab` has no porcelain command for draft notes; every step goes through `glab api`, and
each one below needs what the step above it read.

```
# own drafts on the MR - one an earlier pass left is still unsent, and bulk_publish
# sends it along with these
glab api projects/:id/merge_requests/<iid>/draft_notes

# overall comment, not attached to a line
glab api projects/:id/merge_requests/<iid>/draft_notes -X POST -f note='<comment>'

# the diff refs an inline draft needs - read diff_refs off the response, since
# glab api has no --jq of its own and filters nothing itself
glab api projects/:id/merge_requests/<iid>

# one finding on a line - nested position, so --input, and the header is mandatory
cat > <payload.json> <<'JSON'
{"note":"<finding>",
 "position":{"position_type":"text",
   "base_sha":"<base>","start_sha":"<start>","head_sha":"<head>",
   "old_path":"<reviewed-file>","new_path":"<reviewed-file>","new_line":<line>}}
JSON
glab api projects/:id/merge_requests/<iid>/draft_notes -X POST \
  -H 'Content-Type: application/json' --input <payload.json>

# discussion ids, for the reply below
glab api projects/:id/merge_requests/<iid>/discussions

# reply into an existing discussion, still a draft - a scalar, so a plain field
# works; the discussion has to be one a person started - see the in_reply_to rows of Traps
glab api projects/:id/merge_requests/<iid>/draft_notes -X POST \
  -f note='<reply>' -f in_reply_to_discussion_id=<discussion-id>

# discard one this pass created
glab api projects/:id/merge_requests/<iid>/draft_notes/<draft-id> -X DELETE
```

Read the status of the first `draft_notes` call rather than assuming the endpoint is
there: an instance older than the release that added `draft_notes` answers `404`, which
is `pr-rules` → Pending by Default's "no draft mechanism" row.

Confirm an inline draft landed inline before moving on: the response carries a non-null
`line_code` and a filled `position`. A null `line_code`
means the note was accepted as an overall comment — see the `position[...]` row of Traps.

### Traps

| Doing this | Answers | The way round it |
|---|---|---|
| `-f 'position[new_line]=2'` and friends | `HTTP 201`, and a draft whose `position` fields and `line_code` are all null — the finding lands as an overall comment on the merge request, not on the line it names, with nothing in the response saying so | `--input`, `-f`/`-F` expressing no nested object |
| `--input` with no `Content-Type` | `HTTP 415`, `{"error":"The provided content-type '' is not supported."}` | the flag sets none of its own, so `-H 'Content-Type: application/json'` goes beside it |
| reading `diff_refs` once, straight after the merge request is created | null, while `detailed_merge_status` is `preparing` — or a filled value, so neither state can be relied on | re-read it, or take `base_commit_sha`, `head_commit_sha` and `start_commit_sha` taken from `GET .../merge_requests/:iid/versions`, which is populated while `diff_refs` is still null |
| posting a draft with refs read before a force-push | `HTTP 201`, storing the stale `position.head_sha` while the merge request's `diff_refs.head_sha` has already moved | a stale sha is neither rejected nor corrected, so re-read `diff_refs` after any push |
| expecting one pending review per author | several drafts by one author on one merge request, all accepted | nothing: there is no review object holding them and no per-user limit, where GitHub refuses a second pending review |
| `in_reply_to_discussion_id` naming no discussion | `{"message":{"base":["Thread to reply to cannot be found"]}}` | the field is resolved against the merge request before anything is written, and the error names the thread rather than the field carrying its id |
| `in_reply_to_discussion_id` naming a system note — "added 1 commit" after a push | `{"message":{"base":["Replies to system notes are not allowed"]}}` | a merge request that has attracted nothing but system notes has no thread to reply into yet |

---

## Cross-References

**Recommended**

- `pr-rules` — MR title, description, review comment wording, merge strategy, and the
  rules governing which of these commands may be run.
- `issue-rules` — issue title, description templates, label scheme, lifecycle.
