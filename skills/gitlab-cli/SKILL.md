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

Mechanics only: what a command does, what it makes visible to other people, and where the
CLI help is silent or misleading. No rule about *when* an action is allowed lives here:

- Issue title, description, labels, lifecycle → `issue-rules` skill.
- MR title, description, review comment wording, merge strategy, who authorises a merge,
  and the rule that an agent's own review feedback stays unpublished → `pr-rules` skill.
- The `gh` equivalents of everything below → `github-cli` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own
`glab` conventions, follow those instead. This skill is the fallback for projects that do
not specify their own.

---

## Verification

Every command below carries one of two marks:

- **[verified]** — run against a live GitLab instance, response as described.
- **[untested]** — taken from the CLI help or the REST API reference, not run here. Read
  the response before trusting the next step.

The verified marks come from three end-to-end runs on gitlab.com with **glab 1.105.0**,
each in a throwaway project that was permanently removed afterwards: issues, merge
requests and the full draft-note cycle; then the `merge_method` setting, the REST merge
form, `iid` addressing and field expansion from a file; then the path placeholders,
non-interactive behaviour, draft invisibility, and what a force-push does to a draft's
refs. Two marks stay `[untested]` on purpose — each says why on the spot. A self-managed
instance on an older GitLab may still differ; the draft-note endpoints in particular
arrived later than the rest.

---

## Conventions

- `glab api` types its fields the way `gh api` does: `-F/--field` infers the type,
  `-f/--raw-field` sends a string. Neither parses a JSON array or object — see Draft
  Notes → Traps for what that costs. [verified]
- **There is no `--jq` flag.** `glab api` filters nothing client-side: it prints JSON
  (`--output json`, the default) or one object per line (`--output ndjson`, one line per
  array element), and any filtering is a separate step in the pipe. Copying a
  `gh api --jq` line over answers `Unknown flag: --jq.` [verified]
- `--input <file>` (`-` for stdin) sends a raw body, and is the only way to send nested
  JSON. It sets no `Content-Type` of its own: without `-H 'Content-Type: application/json'`
  GitLab answers `HTTP 415`, `{"error":"The provided content-type '' is not supported."}`
  [verified]
- Paths take placeholders expanded from the current checkout's project — `:id`,
  `:fullpath`, `:namespace`, `:repo`, `:branch`, `:user`. Outside a GitLab checkout, pass
  the numeric project id or the full path URL-encoded
  (`group%2Fsubgroup%2Fproject`). [verified]
- `-f` means different things in different commands: a string field on `glab api`, but
  `--fill` on `glab mr create`. [verified]
- **Only `-F/--field` expands `@<path>` into the file's contents.** `-f/--raw-field` sends
  the literal string `@C:/path/to/file`, and the API accepts it: the issue is created with
  the path as its description, with no error to notice. A body read from a file therefore
  goes through `-F description=@<path>`. [verified]
- `:iid` on an issue or MR path is the per-project number shown in the UI, not the
  instance-wide `id` the same object also carries. The `id` in that position answers
  `404 Not found` rather than reaching the object. [verified] The numbers that do collide
  are across types: `projects/:id/issues/1` and `projects/:id/merge_requests/1` are two
  unrelated objects, since `iid` is numbered per type. [verified]

---

## Issues

```
# existing labels [verified]
glab label list

# create - labels comma-separated in one flag [verified]
glab issue create --title '<Type(scope): Subject>' --description '<body>' \
  --label '<type-label>,<topic-label>'

# read [verified]
glab issue view <iid>

# progress comment - on an issue --message is current, on an MR it is deprecated [verified]
glab issue note <iid> --message '<comment>'

# relabel afterwards [verified]
glab issue update <iid> --label '<label>' --unlabel '<label>'
```

- A label that does not exist is **created on the fly**, unlike `gh --label`, which
  rejects the command. A typo silently produces a new label, so run `glab label list`
  first. [verified]
- `--description` takes the body inline; `-` opens an editor instead. There is no
  description-file flag on `glab issue create`, so a body with newlines either goes inline
  in a quoted argument or through the API, where `-F` reads it from a file:
  `glab api projects/:id/issues -X POST -f title='<title>' -F description=@<path>`.
  [verified]
- `--yes` is an interactive-terminal flag and is **not** needed here: with `--title` and
  `--description` both supplied, `glab issue create` and `glab mr create` submit straight
  away with stdin closed. Leave either one out and the command does not hang either — it
  detects the non-interactive session and refuses:
  `'--Title' and '--description' (or '--template') required for non-interactive mode.`
  [verified]

---

## Merge Requests

```
# open [verified]
glab mr create --source-branch <branch> --target-branch <target> \
  --title '<title>' --description '<body>' --label '<type-label>,<topic-label>'

# read [verified]
glab mr view <iid>

# merge [verified]
glab mr merge <iid> --message '<subject>

<body>' --remove-source-branch --yes
```

- There is no `--no-ff` flag. Whether the merge produces a merge commit is the project's
  **Merge method** setting (Settings → Merge requests). The API takes exactly three values
  on `merge_method` — `merge` (merge commit), `rebase_merge` (semi-linear, still a merge
  commit), `ff` (fast-forward, which never writes one) — and answers `HTTP 400`,
  `{"error":"merge_method does not have a valid value"}` for anything else. Read it with
  `glab api projects/<id>` and set it with
  `glab api projects/<id> -X PUT -f merge_method=merge`, which answers with the updated
  project. On `merge_method=merge`, the merge above produced a two-parent commit carrying
  the `--message` text and removed the source branch. [verified]
- `--auto-merge` defaults to **true**: with a pipeline running, the merge is queued behind
  it rather than performed now. With no pipeline the command reports
  `! No pipeline running on <branch>` and merges immediately. [verified for the
  no-pipeline case] `--auto-merge=false` is meant to force an immediate merge; observing
  the difference needs a running pipeline, so it stays [untested] — use the REST form
  above when the merge has to happen now regardless of CI.
- `--squash` and `--rebase` override the shape per merge; neither belongs to the `--no-ff`
  strategy in `pr-rules` → Merge Strategy.
- The REST equivalent, when the flag names on the installed `glab` do not match, and the
  form that keeps `--auto-merge` out of the picture entirely: [verified]

```
glab api projects/:id/merge_requests/<iid>/merge -X PUT \
  -f merge_commit_message='<subject>

<body>' -F squash=false -F should_remove_source_branch=true
```

---

## Draft Notes

`glab mr note create` and the `notes` / `discussions` endpoints publish the moment they
run: the author and every participant is notified, and editing afterwards does not unsend.
An unpublished draft is absent from both `notes` and `discussions` — it exists only under
`draft_notes` until someone publishes it. [verified] Which of the two applies is
`pr-rules` → Pending by Default; this skill only states what each one does.

| Command | Effect |
|---|---|
| `glab mr note create <iid> --message` | publishes on the spot |
| `glab mr note <iid> --message` | publishes on the spot; the flag is deprecated in 1.105.0 in favour of the `create` subcommand |
| `glab mr approve` | publishes on the spot |
| `POST .../merge_requests/:iid/notes` | publishes on the spot |
| `POST .../merge_requests/:iid/discussions` | publishes on the spot |
| `POST .../merge_requests/:iid/draft_notes` | stays a draft |
| `PUT .../draft_notes/:id/publish` | publishes that one draft |
| `POST .../draft_notes/bulk_publish` | publishes every draft the caller holds |

The note, draft and publish rows were run; `glab mr approve` is the one row taken from the
CLI help rather than exercised, since running it approves the MR.

### The draft cycle

`glab` has no porcelain command for draft notes; every step goes through `glab api`. All
**[verified]**, in this order, against a live MR.

```
# own drafts on the MR - a draft left by an earlier pass is still unsent
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

# reply into an existing discussion, still a draft - a scalar, so a plain field works
glab api projects/:id/merge_requests/<iid>/draft_notes -X POST \
  -f note='<reply>' -f in_reply_to_discussion_id=<discussion-id>

# discussion ids, for the reply above
glab api projects/:id/merge_requests/<iid>/discussions

# discard one this pass created
glab api projects/:id/merge_requests/<iid>/draft_notes/<draft-id> -X DELETE

# publish - the human's step, named here so it is not confused with creating a draft
glab api projects/:id/merge_requests/<iid>/draft_notes/bulk_publish -X POST
```

Confirm an inline draft landed inline before moving on: the response carries a non-null
`line_code` and a filled `position`. A null `line_code` means the note was accepted as an
overall comment — see trap 1.

### Traps

1. **`position[...]` bracket fields are accepted and silently dropped.** Passing
   `-f 'position[new_line]=2'` and friends answers `HTTP 201` with a draft whose
   `position` is all nulls and whose `line_code` is null: the finding is created, but as
   an overall comment on the MR, not on the line it names. `-f`/`-F` cannot express a
   nested object, and nothing in the response says the position was lost. Use `--input`.
   [verified]
2. **`--input` without a `Content-Type` header is rejected**: `HTTP 415`,
   `{"error":"The provided content-type '' is not supported."}` Always pass
   `-H 'Content-Type: application/json'` alongside it. [verified]
3. **`diff_refs` is null for the first moments after an MR is created**, while
   `detailed_merge_status` is `preparing`. Re-read it, or take `base_commit_sha`,
   `head_commit_sha` and `start_commit_sha` from
   `GET .../merge_requests/:iid/versions`, which is populated earlier. [verified]
4. **A stale `head_sha` is not rejected — it is overwritten.** Posting a draft with the
   refs read before a force-push answers `HTTP 201`, and the stored `position.head_sha` is
   the MR's *current* head, not the one sent. [verified] The line number sent is kept as
   is, so a finding written against the pre-push diff is silently re-anchored to whatever
   now sits at that line. Re-read `diff_refs` after any push.
5. **Draft notes are not GitHub's single pending review.** There is no review object
   holding them, no per-user limit, and no submit-a-subset: `bulk_publish` publishes every
   draft the caller has on that MR, including ones left by an earlier pass. Publishing one
   at a time is `PUT .../draft_notes/:id/publish`. [verified]
6. Draft notes arrived in GitLab 13.x and `bulk_publish` later still. On an older
   self-managed instance the endpoint answers `404` — which is the case `pr-rules` →
   Pending by Default calls "no draft mechanism exists", not licence to post the feedback
   as a note. [untested, and it stays that way: reproducing it means standing up a GitLab
   old enough to lack the endpoint. Read the status of the first `draft_notes` call
   instead of assuming the endpoint is there.]

---

## Cross-References

- `pr-rules` — MR title, description, review comment wording, merge strategy, and the
  rules governing which of these commands may be run.
- `issue-rules` — issue title, description templates, label scheme, lifecycle.
- `github-cli` — the same mechanics for `gh`.
