---
name: gitlab-cli
version: "1.0.0"
description: Apply when carrying out a GitLab action with the glab CLI - issues, merge requests, labels, draft notes, merges
license: Unlicense
metadata:
  author: ssoft
  tier: domain
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
- The `gh` equivalents of everything below → `github-cli` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own
`glab` conventions, follow those instead. This skill is the fallback for projects that do
not specify their own.

---

## Conventions

- `glab api` types its fields the way `gh api` does: `-F/--field` infers the type,
  `-f/--raw-field` sends a string. Neither flag parses a JSON array or object — see Draft
  Notes → Traps for what that costs.
- **There is no `--jq` flag.** `glab api` filters nothing client-side: it prints JSON
  (`--output json`, the default) or one object per line (`--output ndjson`, one line per
  array element), and any filtering is a separate step in the pipe. Copying a
  `gh api --jq` line over answers `Unknown flag: --jq.`
- `--input <file>` (`-` for stdin) sends a raw body, and is the only way to send nested
  JSON. It sets no `Content-Type` of its own: without `-H 'Content-Type: application/json'`
  GitLab answers `HTTP 415`, `{"error":"The provided content-type '' is not supported."}`
- Paths take placeholders expanded from the current checkout's project — `:id`,
  `:fullpath`, `:namespace`, `:repo`, `:branch`, `:user`. Outside a checkout whose remotes
  reach GitLab they are not expanded but refused, with
  `Unable to expand placeholder in path`. Pass `--hostname <host>` and the numeric project
  id or the full path URL-encoded (`group%2Fsubgroup%2Fproject`) instead.
- `-f` means different things in different commands: a string field on `glab api`, but
  `--fill` on `glab mr create`, which takes no value — `glab mr create -f title=x` answers
  `Accepts 0 arg(s), received 1.`
- **Only `-F/--field` expands `@<path>` into the file's contents.** `-f/--raw-field` sends
  the literal string `@C:/path/to/file`, and the API accepts it: the issue is created with
  the path as its description, with no error to notice. A body read from a file therefore
  goes through `-F description=@<path>`.
- `:iid` on an issue or MR path is the per-project number shown in the UI, not the
  instance-wide `id` the same object also carries. The `id` in that position answers
  `{"message":"404 Not found"}` rather than reaching the object. The numbers that do
  collide are across types: `projects/:id/issues/1` and `projects/:id/merge_requests/1` are
  two unrelated objects, since `iid` is numbered per type.

---

## Issues

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
- There is no `--no-ff` flag. Whether the merge produces a merge commit is the project's
  **Merge method** setting (Settings → Merge requests). The API takes exactly three values
  on `merge_method` — `merge` (merge commit), `rebase_merge` (semi-linear, still a merge
  commit), `ff` (fast-forward, which never writes one) — and answers `HTTP 400`,
  `{"error":"merge_method does not have a valid value"}` for anything else. Read it with
  `glab api projects/<id>` and set it with
  `glab api projects/<id> -X PUT -f merge_method=merge`, which answers with the updated
  project. On `merge_method=merge`, the merge above produces a two-parent commit carrying
  the `--message` text and removes the source branch.
- `--auto-merge` defaults to on, so the command looks for a pipeline before merging: with
  one running the merge is queued behind it rather than performed now, and with none on the
  project it reports `! No pipeline running on <branch>` and merges immediately.
- `--squash` and `--rebase` change what the source commits look like, not whether a merge
  commit is written: on `merge_method=merge`, `--squash` collapses the branch into one
  commit and `--rebase` replays it onto the target (`✓ Rebase successful!`), and either
  merge still produces a two-parent commit. The shape stays the project's `merge_method`;
  whether either flag may be used at all is `pr-rules` → Merge Strategy.
- The REST equivalent, when the flag names on the installed `glab` do not match, and the
  form that keeps `--auto-merge` out of the picture entirely:

```
glab api projects/:id/merge_requests/<iid>/merge -X PUT \
  -f merge_commit_message='<subject>

<body>' -F squash=false -F should_remove_source_branch=true
```

---

## Draft Notes

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
# works; the discussion has to be one a person started - see trap 6
glab api projects/:id/merge_requests/<iid>/draft_notes -X POST \
  -f note='<reply>' -f in_reply_to_discussion_id=<discussion-id>

# discard one this pass created
glab api projects/:id/merge_requests/<iid>/draft_notes/<draft-id> -X DELETE
```

Read the status of the first `draft_notes` call rather than assuming the endpoint is
there: an instance older than the release that added `draft_notes` answers `404`, which
is `pr-rules` → Pending by Default's "None exists" branch.

Confirm an inline draft landed inline before moving on: the response carries a non-null
`line_code` and a filled `position`. A null `line_code` means the note was accepted as an
overall comment — see trap 1.

### Traps

1. **`position[...]` bracket fields are accepted and silently dropped.** Passing
   `-f 'position[new_line]=2'` and friends answers `HTTP 201` with a draft whose
   `position` fields are all null and whose `line_code` is null: the finding is created,
   but as an overall comment on the MR, not on the line it names. `-f`/`-F` cannot express
   a nested object, and nothing in the response says the position was lost. Use `--input`.
2. **`--input` without a `Content-Type` header is rejected**: `HTTP 415`,
   `{"error":"The provided content-type '' is not supported."}` Always pass
   `-H 'Content-Type: application/json'` alongside it.
3. **`diff_refs` can be null for the first moments after an MR is created**, while
   `detailed_merge_status` is `preparing`, and it can also arrive already filled, so
   neither state can be relied on. Re-read it, or take `base_commit_sha`,
   `head_commit_sha` and `start_commit_sha` from `GET .../merge_requests/:iid/versions`,
   which is populated while `diff_refs` is still null.
4. **A stale `head_sha` is not rejected, and not corrected either.** Posting a draft with
   the refs read before a force-push answers `HTTP 201`, and the stored
   `position.head_sha` is the one sent, while the MR's own `diff_refs.head_sha` has already
   moved to the new head. Re-read `diff_refs` after any push.
5. **Draft notes are not GitHub's single pending review.** There is no review object
   holding them and no per-user limit: several drafts by one author on one MR are all
   accepted, where GitHub refuses a second pending review.
6. **`in_reply_to_discussion_id` needs a discussion a person started.** The field is
   resolved against the MR before anything is written, and the error names the thread
   rather than the field carrying its id: an id belonging to no discussion gives
   `{"message":{"base":["Thread to reply to cannot be found"]}}`, and GitLab's own system
   note ("added 1 commit" after a push) gives
   `{"message":{"base":["Replies to system notes are not allowed"]}}`. A merge request that
   has attracted nothing but system notes has no thread to reply into yet.

---

## Cross-References

- `pr-rules` — MR title, description, review comment wording, merge strategy, and the
  rules governing which of these commands may be run.
- `issue-rules` — issue title, description templates, label scheme, lifecycle.
- `github-cli` — the same mechanics for `gh`.
