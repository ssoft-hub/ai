---
name: github-cli
version: "1.0.0"
description: Apply when carrying out a GitHub action with the gh CLI - issues, pull requests, labels, review threads, merges
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - github
  tags:
    - github
    - cli
    - platform
---

# Skill: GitHub CLI

Apply when a GitHub action has to be carried out with `gh` — creating an issue or a pull
request, attaching labels, leaving review feedback, merging.

Mechanics only: what a command does, what keeps review feedback unsent, and where the CLI
help is silent or misleading. No rule about *when* an action is allowed lives here:

- Issue title, description, labels, lifecycle → `issue-rules` skill.
- PR title, description, review comment wording, merge strategy, who authorises a merge,
  the rule that an agent's own review feedback stays unpublished, and the commands that
  publish it on the spot → `pr-rules` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own
`gh` conventions, follow those instead. This skill is the fallback for projects that do not
specify their own.

---

## Conventions

- `gh api` typing: `-f name=value` sends a **string**, `-F name=value` infers the type
  (integer, boolean, `null`, `@file`). An integer through `-f` against an `Int!` variable
  answers `Variable $n of type Int! was provided invalid value`. Neither flag carries a
  GraphQL list or input object — see Traps.
- `gh api graphql --input <file>` sends a request too complex for flags. The file holds
  `{"query":"query(...){...}","variables":{...}}` — query and variables together; a bare
  variables object answers `A query attribute must be specified and must be a string.`
- `--jq <expr>` filters a response client-side; `--json <fields>` on the porcelain commands
  (`gh issue view`, `gh pr view`) selects fields explicitly and prints JSON.
- `-R <owner>/<repo>` targets a repository other than the current checkout's.
- `--body-file <path>` takes a body from a file — the only reliable way to pass a
  description containing backticks, quotes, or newlines through a shell. `-` reads stdin.

---

## Issues

```
# existing labels, before inventing one
gh label list --limit 100

# read one, fields chosen explicitly
gh issue view <n> --json number,title,body,labels,milestone,state

# create
gh issue create --title '<Type(scope): Subject>' --body-file <path> \
  --label <type-label> --label <topic-label>

# progress comment
gh issue comment <n> --body-file <path>

# relabel afterwards
gh issue edit <n> --add-label <label> --remove-label <label>

# create a label the repository does not have yet
gh label create <name> --description '<what it covers>' --color <hex>
```

`--label` takes one flag per label, and rejects the whole command when a label does not
exist on the repository: `could not add label: '<name>' not found`, with no issue created.
Create the label first rather than retrying without it.

---

## Pull Requests

```
# open
gh pr create --base <target> --title '<title>' --body-file <path> \
  --label <type-label> --label <topic-label>

# read
gh pr view <n> --json number,title,body,state,mergeable,labels

# merge commit, no fast-forward, no squash
gh pr merge <n> --merge -t "<subject>" -b "<body>" --delete-branch

# the asynchronous merge, for the stacked case under Stacks
gh api repos/{owner}/{repo}/pulls/<n>/merge-async -X PUT \
  -f merge_method=merge -f sha=<full-head-sha> \
  -f commit_title='<subject>' -f commit_message='<body>'
```

- `--merge` is the `--no-ff` equivalent: it always writes a two-parent merge commit, and
  `-t`/`-b` set that commit's subject and body. `--delete-branch` removes the head branch
  and leaves the base alone. `--rebase` ignores `-t`/`-b`: the commits it replays keep the
  branch's own messages.
- The merge runs server-side against the pushed branch. A commit amended locally and not
  pushed takes no part in it, and the merge commit is committed by
  `GitHub <noreply@github.com>`, not by the local git identity.
- `PUT /repos/{owner}/{repo}/pulls/{n}/merge-async` is a second merge endpoint `gh` exposes
  no command for, and it is asynchronous. Its four fields — `merge_method`, `commit_title`,
  `commit_message` and `sha` — are all strings, so each goes through `-f`, as in the block
  above. It answers
  `{"status":"pending","details":{"message":"Merge request enqueued.", ...}}` and returns
  before the merge happens, so read the pull request back for the merge commit rather than
  taking the response as the result. The synchronous merge above is the default path — see
  Stacks for the case that needs this one.
- `merge-async` needs the **full** head sha. An abbreviated one answers `HTTP 400`,
  `{"status":"failed","details":{"message":"Pull request head branch was modified."}}` — a
  message naming a race that did not happen, which sends the reader looking for a push
  nobody made. Take the sha from `gh pr view <n> --json headRefOid` and pass it whole.
- Repository settings it depends on: "Allow merge commits" ON, and "Require linear history"
  OFF. The second is a rule on the branch rather than on a person; what varies by person is
  `enforce_admins`, which decides whether an administrator is held to it. With
  `required_linear_history` and `enforce_admins` both on, `--merge` answers
  `GraphQL: Merge commits are not allowed on this repository. (mergePullRequest)`; with
  `enforce_admins` off, an administrator's merge commit goes through. Read
  `required_linear_history` and `enforce_admins` with
  `gh api repos/{owner}/{repo}/branches/{branch}/protection` before treating that refusal
  as a fault in the command.

---

## Stacks

A pull request opened with `--base` set to another pull request's head branch chains the
two, and GitHub holds the chain as a **stack**. On such a chain:

- A merge refused with a pointer to `PUT /repos/{owner}/{repo}/pulls/{n}/merge-async` goes
  through that endpoint instead of through `gh pr merge` — its arguments and its full-sha
  requirement are under Pull Requests above.
- When the base merges, the dependent pull request may be retargeted and its head
  force-pushed, the same tree under a new sha. Read the head sha again with
  `gh pr view <n> --json headRefOid` before passing it to `merge-async`: one held from
  before the base merged names a commit that is no longer the head.

---

## Review Threads

The GraphQL mutations below keep feedback in a pending review. Sending has one
granularity, the whole pending review: `submitPullRequestReview` sends every thread hanging
off it, and there is no per-thread send. Whether feedback may be published at all, and by
whom, is `pr-rules` → Pending by Default; this skill states only what each mutation does.

| Mutation | Effect |
|---|---|
| `addPullRequestReview` with no `event` field | review created, `state: PENDING` |
| `addPullRequestReviewThread` carrying `pullRequestReviewId` | thread added, review still `PENDING` |
| `addPullRequestReviewThreadReply` carrying `pullRequestReviewId` | reply added, review still `PENDING` |
| `deletePullRequestReview` | review and every thread hanging off it gone |

`reviews(states: PENDING)` finds an existing pending review: the lookup below selects its
`id` and `author { login }`, and reads the pull request's threads from `reviewThreads`
beside it.

### The pending cycle

`gh` has no porcelain command that leaves feedback unsent, so every step below goes through
`gh api graphql`.

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

# one finding on a line the branch adds or keeps
gh api graphql -f query='mutation($rev:ID!,$path:String!,$line:Int!,$body:String!){addPullRequestReviewThread(input:{pullRequestReviewId:$rev,path:$path,line:$line,side:RIGHT,body:$body}){thread{id}}}' -f rev=<review-id> -f path=<file> -F line=<line> -f body='<finding>'

# reply into an existing thread
gh api graphql -f query='mutation($rev:ID!,$thread:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewId:$rev,pullRequestReviewThreadId:$thread,body:$body}){comment{id}}}' -f rev=<review-id> -f thread=<thread-id> -f body='<reply>'

# discard, and only a review this pass opened - a reused one may hold an unsent draft
gh api graphql -f query='mutation($rev:ID!){deletePullRequestReview(input:{pullRequestReviewId:$rev}){pullRequestReview{state}}}' -f rev=<review-id>
```

Two variants of the thread mutation reach a line the plain form does not. `side:LEFT` with
the old file's line number places a finding on a line the branch deletes, and `startLine`
and `startSide` beside `line` and `side` place one across a range. Neither leaves the
pending review.

The discard takes its own threads with it, but not at once: a `reviewThreads` read straight
after it can still list them. Confirm against the ids `addPullRequestReviewThread` returned
for that review, not against the connection's size — `reviewThreads` answers every thread
on the pull request, a submitted review's included, so the count has no zero to reach.

### Traps

What the CLI help does not state:

1. One pending review per user per PR. A second `addPullRequestReview` answers
   `User can only have one pending review per pull request` (`type: UNPROCESSABLE`) — look
   for an open one and reuse it rather than creating a second.
2. A typed GraphQL variable cannot go through `-f`/`-F`: the `threads` list on
   `addPullRequestReview` is a list of input objects, and both flags produce scalars. The
   JSON arrives as a string and the server answers
   `Variable $threads of type [DraftPullRequestReviewThread!] was provided invalid value`,
   `Expected ... to be a key-value object`. Add threads one at a time with
   `addPullRequestReviewThread`, or send the whole request with `gh api graphql --input
   <file>` (see Conventions).
3. `reviewThreads` pages 50 at a time. On a PR carrying more, `first:50` answers
   `hasNextPage: true` and the rest arrive only on a re-run with `-f after=<endCursor>`.
   Page while `hasNextPage` is true, or a long PR's later threads are invisible to the
   lookup.

---

## Cross-References

- `pr-rules` — PR title, description, review comment wording, merge strategy, and the
  rules governing which of these commands may be run.
- `issue-rules` — issue title, description templates, label scheme, lifecycle.
