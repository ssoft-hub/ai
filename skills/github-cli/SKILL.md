---
name: github-cli
version: "1.0.0"
description: Apply when carrying out a GitHub action with the gh CLI - issues, pull requests, labels, review threads, merges
license: Unlicense
metadata:
  author: ssoft
  tags:
    - github
    - cli
    - platform
---

# Skill: GitHub CLI

Apply when a GitHub action has to be carried out with `gh` — creating an issue or a pull
request, attaching labels, leaving review feedback, merging.

Mechanics only: what a command does, what it makes visible to other people, and where the
CLI help is silent or misleading. No rule about *when* an action is allowed lives here:

- Issue title, description, labels, lifecycle → `issue-rules` skill.
- PR title, description, review comment wording, merge strategy, who authorises a merge,
  and the rule that an agent's own review feedback stays unpublished → `pr-rules` skill.
- The `glab` equivalents of everything below → `gitlab-cli` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own
`gh` conventions, follow those instead. This skill is the fallback for projects that do not
specify their own.

---

## Verification

Every command below carries one of two marks:

- **[verified]** — run against a live repository, response as described.
- **[untested]** — taken from the CLI help or the API reference, not run here. Read the
  response before trusting the next step.

Every command in this skill is verified against `gh` 2.86.0 — issues and labels on a
throwaway issue in this repository, the merge on a throwaway PR between two scratch
branches, the pending review cycle on a live PR, each cleaned up afterwards. What stays
`[untested]` is the handful of claims that could only be confirmed by publishing feedback
or by a repository configured differently; each says so on the spot. The mark stays on
every line so that a command added later has to earn it rather than inherit it.

---

## Conventions

- `gh api` typing: `-f name=value` sends a **string**, `-F name=value` infers the type
  (integer, boolean, `null`, `@file`). Neither carries a GraphQL list or input object —
  see Traps. [verified]
- `gh api graphql --input <file>` sends a request too complex for flags. The file holds
  `{"query":"query(...){...}","variables":{...}}` — query and variables together, not a
  bare variables object. [verified]
- `--jq <expr>` filters a response client-side; `--json <fields>` on the porcelain commands
  (`gh issue view`, `gh pr view`) selects fields explicitly and prints JSON. [verified]
- `-R <owner>/<repo>` targets a repository other than the current checkout's. [verified]
- `--body-file <path>` takes a body from a file — the only reliable way to pass a
  description containing backticks, quotes, or newlines through a shell. `-` reads stdin.
  [verified]

---

## Issues

```
# existing labels, before inventing a topic one [verified]
gh label list --limit 100

# read one, fields chosen explicitly [verified]
gh issue view <n> --json number,title,body,labels,milestone,state

# create [verified]
gh issue create --title '<Type(scope): Subject>' --body-file <path> \
  --label <type-label> --label <topic-label>

# progress comment [verified]
gh issue comment <n> --body-file <path>

# relabel afterwards [verified]
gh issue edit <n> --add-label <label> --remove-label <label>

# create a label the repository does not have yet [verified]
gh label create <name> --description '<what it covers>' --color <hex>
```

`--label` takes one flag per label, and rejects the whole command when a label does not
exist on the repository: `could not add label: '<name>' not found`, with no issue created.
Create the label first rather than retrying without it. [verified]

---

## Pull Requests

```
# open [verified]
gh pr create --base <target> --title '<title>' --body-file <path> \
  --label <type-label> --label <topic-label>

# read [verified]
gh pr view <n> --json number,title,body,state,mergeable,labels

# merge commit, no fast-forward, no squash [verified]
gh pr merge <n> --merge -t "<subject>" -b "<body>" --delete-branch
```

- `--merge` is the `--no-ff` equivalent: it always writes a merge commit. `-t`/`-b` set its
  subject and body, and apply to `--merge` and `--squash` only. The verification run
  produced a two-parent commit carrying the `-t` subject, and `--delete-branch` removed the
  head branch while leaving the base alone. [verified]
- The merge runs server-side against the pushed branch. A local rebase that has not been
  pushed takes no part in it, and the resulting merge commit is committed by `GitHub`, not
  by the local git identity. [verified]
- Repository settings it depends on: "Allow merge commits" ON, "Require linear history"
  OFF. The second one rejects a merge commit outright. [untested — no repository with
  linear history required was available to see the rejection]

---

## Review Threads

`gh pr review` and `gh pr comment` publish the moment they run: the author and every
watcher is notified, and editing afterwards does not unsend. The GraphQL path below keeps
feedback in a pending review that only a human submits, from the PR page or with
`submitPullRequestReview`. Which of the two applies is `pr-rules` → Pending by Default;
this skill only states what each one does.

| Command | Effect |
|---|---|
| `gh pr review --comment` / `--approve` / `--request-changes` | publishes on the spot |
| `gh pr comment` | publishes on the spot |
| `POST /pulls/{n}/comments` with `in_reply_to` | publishes on the spot, no pending form |
| `POST /pulls/{n}/reviews` with an `event` field | publishes on the spot |
| `addPullRequestReview` with no `event` field | stays `PENDING` |
| `addPullRequestReviewThread` carrying `pullRequestReviewId` | stays `PENDING` |
| `addPullRequestReviewThreadReply` carrying `pullRequestReviewId` | stays `PENDING` |
| `addPullRequestReviewThreadReply` without it | belongs to no review, publishes |

### The pending cycle

All five commands below are **[verified]** against a live PR; the publishing behaviour in
the table above comes from the API reference and the schema.

```
# lookup: PR id, own pending review, thread ids. Pages 50 threads at a time
# (re-run with -f after=<endCursor>); leave isResolved threads alone
gh api graphql -f query='
  query($o:String!,$r:String!,$n:Int!,$after:String) {
    viewer { login }
    repository(owner:$o, name:$r) { pullRequest(number:$n) {
      id
      reviews(last:10, states:PENDING) { nodes { id author { login } } }
      reviewThreads(first:50, after:$after) {
        pageInfo { hasNextPage endCursor }
        nodes { id isResolved comments(first:1) { nodes { path body } } }
      }
    } }
  }' -f o=<owner> -f r=<repo> -F n=<pr-number>

# open one when the lookup returns none authored by viewer; omitting event keeps it PENDING
gh api graphql -f query='mutation($pr:ID!,$body:String!){addPullRequestReview(input:{pullRequestId:$pr,body:$body}){pullRequestReview{id state}}}' -f pr=<pr-node-id> -f body='<overall comment>'

# one finding: swap side to LEFT for a deleted line, add startLine/startSide for a span
gh api graphql -f query='mutation($rev:ID!,$path:String!,$line:Int!,$body:String!){addPullRequestReviewThread(input:{pullRequestReviewId:$rev,path:$path,line:$line,side:RIGHT,body:$body}){thread{id}}}' -f rev=<review-id> -f path=<file> -F line=<line> -f body='<finding>'

# reply into an existing thread
gh api graphql -f query='mutation($rev:ID!,$thread:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewId:$rev,pullRequestReviewThreadId:$thread,body:$body}){comment{id}}}' -f rev=<review-id> -f thread=<thread-id> -f body='<reply>'

# discard, and only a review this pass opened - a reused one may hold an unsent draft
gh api graphql -f query='mutation($rev:ID!){deletePullRequestReview(input:{pullRequestReviewId:$rev}){pullRequestReview{state}}}' -f rev=<review-id>
```

### Traps

Five things the CLI help does not state:

1. The pending path exists only over GraphQL. `gh pr review` submits on the spot, and REST
   `in_reply_to` has no pending form at all. [untested on purpose — confirming it by
   running the command would publish the feedback]
2. One pending review per user per PR. A second `addPullRequestReview`, and the REST
   equivalent, answer
   `User can only have one pending review per pull request` (`type: UNPROCESSABLE`) — look
   for an open one and reuse it rather than creating a second. [verified]
3. A typed GraphQL variable cannot go through `-f`/`-F`: the `threads` list on
   `addPullRequestReview` is a list of input objects, and both flags produce scalars. The
   JSON arrives as a string and the server answers
   `Variable $threads of type [DraftPullRequestReviewThread!] was provided invalid value`,
   `Expected ... to be a key-value object`. Add threads one at a time with
   `addPullRequestReviewThread`, or send the whole request with `gh api graphql --input
   <file>` (see Conventions). [verified]
4. `pullRequestReviewId` is *optional* on `addPullRequestReviewThreadReply`. A reply
   without it belongs to no pending review, which makes its absence a publish. [untested on
   purpose — same reason as trap 1]
5. `reviewThreads` pages 50 at a time. Re-run with `-f after=<endCursor>` while
   `hasNextPage` is true, or a long PR's later threads are invisible to the lookup.
   [untested — the query and its `pageInfo` were run, but no PR with more than 50 threads
   was available to page through]

---

## Cross-References

- `pr-rules` — PR title, description, review comment wording, merge strategy, and the
  rules governing which of these commands may be run.
- `issue-rules` — issue title, description templates, label scheme, lifecycle.
- `gitlab-cli` — the same mechanics for `glab`.
