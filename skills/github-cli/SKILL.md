---
name: github-cli
version: "1.0.0"
description: Apply when carrying out a GitHub action with the gh CLI - issues, pull requests, labels, review threads, merges
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  rubric: applied
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

**Must**

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own
`gh` conventions, follow those instead. This skill is the fallback for projects that do not
specify their own.

---

## Conventions

**Should**

| Flag | What it does |
|---|---|
| `--jq <expr>` | filters the response client-side |
| `--json <fields>` | on a porcelain command (`gh issue view`, `gh pr view`) selects fields and prints JSON |
| `-R <owner>/<repo>` | targets a repository other than the current checkout's |
| `--body-file <path>` | takes a body from a file, `-` from stdin — the only reliable way to pass backticks, quotes or newlines through a shell |

Three pass data to `gh api`, and each has a shape it will not carry:

| Flag on `gh api` | Sends | Where it bites |
|---|---|---|
| `-f name=value` | a string | an integer against an `Int!` variable answers `Variable $n of type Int! was provided invalid value` |
| `-F name=value` | the inferred type — integer, boolean, `null`, `@file` | carries no GraphQL list or input object, and neither does `-f` — see Traps |
| `--input <file>` | a whole request body | for GraphQL the file holds query and variables together, `{"query":"...","variables":{...}}`; a bare variables object answers `A query attribute must be specified and must be a string.` |

---

## Issues

**Should**

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

**Should**

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

# its result, by the uuid the call above answered with
gh api repos/{owner}/{repo}/pulls/<n>/merge-async/<uuid>
```

| Flag on `gh pr merge` | What it does |
|---|---|
| `--merge` | the `--no-ff` equivalent: always a two-parent merge commit, whose subject and body are `-t`/`-b` |
| `--rebase` | ignores `-t`/`-b`; the commits it replays keep the branch's own messages |
| `--delete-branch` | deletes the local and the remote head branch, and no base branch. Where an open pull request targets that head branch, the caller should read Stacks before passing the flag |

The merge runs server-side against the pushed branch, so a commit amended locally and not
pushed takes no part in it, and `GitHub <noreply@github.com>` commits the merge rather
than the local git identity.

Where the tree `gh pr merge --delete-branch` runs in holds the head branch, the command
switches that tree to the base branch before deleting the head branch; where that tree
holds another branch, the command goes straight to the deletion. What comes back from each
run, by what the tree the command runs in and any other worktree hold:

| The command runs | What comes back |
|---|---|
| in a tree that does not hold the head branch, with no worktree holding it | nothing: both deletions run |
| in the tree holding the head branch, with the base branch held by no other worktree | nothing: that tree switches to the base branch and both deletions run |
| in a tree that does not hold the head branch, while a worktree holds it | `failed to delete local branch <name>: failed to run git: error: cannot delete branch '<name>' used by worktree at '<path>'` |
| in the tree holding the head branch, while another worktree holds the base branch | `failed to run git: fatal: '<base>' is already used by worktree at '<path>'` |

The merge has gone through before either refusal, the local head branch stands after both
of them, and the exit status is 1 either way — a caller reading the status alone takes a
merge that landed for one that failed. The remote head branch stands too, unless the
repository setting "Automatically delete head branches" is on, which takes it with the
merge.

The recovery frees the branch the refusal named — `git -C <path> switch <other>` in the
worktree holding it, `git -C <path> switch --detach` where that worktree has nowhere else to
stand, or `git worktree remove <path>` for a linked worktree that is finished with — and
then what is left takes one command each:

| What is left | What it takes |
|---|---|
| the local head branch | the same `gh pr merge <n> --merge --delete-branch` again, after either refusal: it answers `! Pull request <owner>/<repo>#<n> was already merged` with an exit status of 0, switches a tree still holding the head branch onto the base branch, deletes the head branch, and reaches no remote branch. `git branch -d <name>` deletes it too, and, run from the base branch, answers `error: the branch '<name>' is not fully merged` until that branch carries the merge |
| the remote head branch | `git push origin --delete <name>`, which answers `error: unable to delete '<name>': remote ref does not exist` where the branch went with the merge |

`merge-async` is a second merge endpoint `gh` exposes no command for, and the one a
registered stack takes — see Stacks. The synchronous merge above is the default path.

| Of `merge-async` | What it is |
|---|---|
| its body | `merge_method`, `commit_title`, `commit_message` and `sha`, all strings and so all through `-f`; a fifth, `merge_action`, is optional and defaults to `default` |
| its answer | `{"status":"pending","details":{"message":"Merge request enqueued.","uuid":"<uuid>","expected_head_sha":"<sha>"}}`, before the merge happens |
| its result | `GET .../merge-async/<uuid>`, answering `{"status":"merged","details":{"message":"Pull request was merged.","sha":"<merge-sha>"}}` — not the enqueue response |
| an abbreviated `sha` | `HTTP 400`, `{"status":"failed","details":{"message":"Pull request head branch was modified."}}`, naming a race that did not happen. Take the sha whole from `gh pr view <n> --json headRefOid`; passed whole, that message reports the race it names |

`--merge` needs "Allow merge commits" on and "Require linear history" off. The refusal
`GraphQL: Merge commits are not allowed on this repository. (mergePullRequest)` names a
repository setting rather than a fault in the command, and which one takes a read of
`gh api repos/{owner}/{repo}/branches/{branch}/protection`:

| The refusal comes from | Refused for |
|---|---|
| "Allow merge commits" off | everyone |
| `required_linear_history` on, `enforce_admins` on | everyone |
| `required_linear_history` on, `enforce_admins` off | everyone but an administrator |

---

## Stacks

**Should**

A **stack** is a chain of pull requests, each targeting the head branch of the one below,
registered with GitHub as an object of its own. Public preview since 30 July 2026. Opening
one with `--base` on another's head branch builds the chain and nothing else; registering
it is a separate act:

```
# once per machine, writing an executable under the user's home
gh extension install github/gh-stack --pin <commit-sha>

# register open pull requests, bottom first, with no local tracking
gh stack link <bottom> <next> <top>

# the same over HTTP, the body carrying the whole ordered membership
gh api repos/{owner}/{repo}/stacks -X POST \
  -F 'pull_requests[]=<bottom>' -F 'pull_requests[]=<next>' -F 'pull_requests[]=<top>'
```

Registration decides how the bottom is merged, and what becomes of the rest:

| The chain | Merging the bottom | The pull request that targeted its head branch | The rest above |
|---|---|---|---|
| unregistered | `gh pr merge <bottom> --merge --delete-branch` | closes on the deletion, whether it rides the merge or follows it, and while its base ref stays deleted it is neither reopened nor retargeted — the retargeting GitHub documents for a deleted head branch reaches no unregistered chain | untouched: each still targets a branch that is still there |
| a registered stack | `merge-async` on the bottom, or `gh stack merge <n> --merge --yes` | retargeted onto the merged base and force-pushed by the cascading rebase: `automatic_base_change_succeeded`, then `head_ref_force_pushed` | each keeps the target it had, and the rebase force-pushes both its refs: `base_ref_force_pushed`, `head_ref_force_pushed` |

| Refusal or limit | What it takes |
|---|---|
| the synchronous merge on a pull request of a stack | refused: `This pull request is part of a stack and must be merged using the asynchronous merge REST API` |
| a chain across a fork | cannot be registered at all: every branch of a stack lives in one repository |
| a history that is not linear | the merge is refused, until `gh stack checkout <stack-number>` then `gh stack rebase` and `gh stack push`, or **Rebase stack** in the merge box, server-side |
| no branch-deletion parameter on either stack merge | the bottom's head branch goes once `gh pr view <n> --json baseRefName` shows the dependent moved; `merge-async` answers before the merge happens, so its response names no state to act on |
| "Automatically delete head branches" on | the branch goes with the merge, so an unregistered dependent closes whatever else is done |

`merge-async` merges the one pull request named. `gh stack merge` merges it and every one
below, and the authorisation that needs is `pr-rules` → Merge Strategy 2; it also takes the
merge method last used unless `--merge` is given, which is a squash or a rebase where that
ran last, both forbidden by `pr-rules` → Merge Strategy 4.

The cascading rebase moves every head above the merged pull request and leaves every tree,
so read the head sha again with `gh pr view <n> --json headRefOid` — full, per Pull
Requests above — since `merge-async` refuses a stale one.

REST creates and modifies a stack; GraphQL only reads one.

| Call | Effect |
|---|---|
| `POST /repos/{owner}/{repo}/stacks`, body `{"pull_requests":[...]}` | creates a stack from an ordered list |
| `POST /repos/{owner}/{repo}/stacks/{stack_number}/add`, same body | appends onto the top of one |
| `POST /repos/{owner}/{repo}/stacks/{stack_number}/unstack` | returns the unmerged pull requests to an unregistered chain, where the `unregistered` row above applies to them again. Answers 200 where the stack survives and 204 where it dissolves, which `gh api` tells apart only under `--include` |
| `GET /repos/{owner}/{repo}/stacks`, `GET .../stacks/{stack_number}` | read |
| `stack` and `stackEntry` on the GraphQL `PullRequest` | read |

---

## Review Threads

**Must**

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

Two variants of the thread mutation reach a line the plain form does not, and neither
leaves the pending review:

| To place a finding on | Add to `addPullRequestReviewThread` |
|---|---|
| a line the branch deletes | `side:LEFT`, with the old file's line number |
| a range | `startLine` and `startSide` beside `line` and `side` |

The discard takes its own threads with it, but not at once: a `reviewThreads` read
straight after it can still list them. Confirm against the ids
`addPullRequestReviewThread` returned for that review, not against the connection's
size — `reviewThreads` answers every thread on the pull request, a submitted review's
included, so the count has no zero to reach.

### Traps

What the CLI help does not state:

| The limit | It answers | The way round it |
|---|---|---|
| one pending review per user per pull request | `User can only have one pending review per pull request` (`type: UNPROCESSABLE`) | look for an open one and reuse it |
| `-f`/`-F` produce scalars, so a typed GraphQL variable cannot go through them — `threads` on `addPullRequestReview` is a list of input objects | `Variable $threads of type [DraftPullRequestReviewThread!] was provided invalid value`, `Expected ... to be a key-value object` | one thread at a time with `addPullRequestReviewThread`, or the whole request through `gh api graphql --input <file>` (Conventions) |
| `reviewThreads` pages 50 at a time | `hasNextPage: true` on a longer pull request | page while `hasNextPage` is true, or later threads stay invisible to the lookup |

---

## Cross-References

**Recommended**

- `pr-rules` — PR title, description, review comment wording, merge strategy, and the
  rules governing which of these commands may be run.
- `issue-rules` — issue title, description templates, label scheme, lifecycle.
