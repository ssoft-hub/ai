'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { check } = require('../tools/review-publish-guard');

const TOOL = path.join(__dirname, '..', 'tools', 'review-publish-guard.js');

test('asks before gh pr review --comment', () => {
  assert.strictEqual(check('gh pr review 49 --comment --body "looks good"').action, 'ask');
});

test('asks before gh pr review --approve', () => {
  assert.strictEqual(check('gh pr review 49 --approve').action, 'ask');
});

test('asks before gh pr review --request-changes', () => {
  assert.strictEqual(check('gh pr review 49 --request-changes --body "fix this"').action, 'ask');
});

test('asks before gh pr review -c short flag', () => {
  assert.strictEqual(check('gh pr review 49 -c -b "looks good"').action, 'ask');
});

test('asks before gh pr review -a short flag', () => {
  assert.strictEqual(check('gh pr review 49 -a').action, 'ask');
});

test('asks before gh pr review after a chain operator', () => {
  assert.strictEqual(check('git status && gh pr review 49 --approve').action, 'ask');
});

test('asks before gh pr comment', () => {
  assert.strictEqual(check('gh pr comment 49 --body "one finding left"').action, 'ask');
});

test('asks before gh pr comment carrying a help flag inside its body', () => {
  assert.strictEqual(
    check('gh pr comment 49 -b "see gh pr review -h for the flag list"').action,
    'ask'
  );
});

test('asks before a thread reply with no pullRequestReviewId', () => {
  assert.strictEqual(
    check("gh api graphql -f query='mutation($thread:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$thread,body:$body}){comment{id}}}' -f thread=T_1 -f body='reply'").action,
    'ask'
  );
});

test('names the pending alternative in the gh pr review prompt', () => {
  assert.match(check('gh pr review 49 --approve').msg, /addPullRequestReview/);
});

test('attributes a reply with no review id to the unattached reply rule', () => {
  assert.strictEqual(
    check("gh api graphql -f query='mutation{addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$t,body:$b}){comment{id}}}'").name,
    'unattached reply'
  );
});

test('still splits a real command chain into segments', () => {
  assert.strictEqual(check('gh pr view 49 && git status').action, 'pass');
  assert.strictEqual(check('git status && gh pr comment 49 -b x').action, 'ask');
});

test('asks before a REST reply with in_reply_to and an explicit POST', () => {
  assert.strictEqual(
    check('gh api -X POST repos/o/r/pulls/49/comments -F in_reply_to=1 -f body=x').action,
    'ask'
  );
});

test('asks before a REST reply with in_reply_to and an implicit POST', () => {
  assert.strictEqual(
    check('gh api repos/o/r/pulls/49/comments -F in_reply_to=1 -f body=x').action,
    'ask'
  );
});

test('asks before a REST review carrying an event field', () => {
  assert.strictEqual(
    check("gh api -X POST repos/o/r/pulls/49/reviews -f event=APPROVE -f body='ok'").action,
    'ask'
  );
});

test('asks before a REST submit of a pending review', () => {
  assert.strictEqual(
    check('gh api -X POST repos/o/r/pulls/49/reviews/12/events -f event=COMMENT').action,
    'ask'
  );
});

test('asks before a REST reply whose body holds a semicolon', () => {
  assert.strictEqual(
    check("gh api -X POST repos/o/r/pulls/49/comments -f body='use -f; then rerun' -F in_reply_to=1").action,
    'ask'
  );
});

test('asks before a REST reply whose body holds a chain operator', () => {
  assert.strictEqual(
    check("gh api -X POST repos/o/r/pulls/49/comments -f body='build && test' -F in_reply_to=1").action,
    'ask'
  );
});

test('asks before a REST review event whose body holds a semicolon', () => {
  assert.strictEqual(
    check("gh api -X POST repos/o/r/pulls/49/reviews -f body='x; y' -f event=APPROVE").action,
    'ask'
  );
});

test('asks before a REST reply whose body quotes a method flag', () => {
  assert.strictEqual(
    check("gh api repos/o/r/pulls/49/comments -F in_reply_to=1 -f body='run gh api -X GET first'").action,
    'ask'
  );
});

test('asks before a REST review event whose body quotes a method flag', () => {
  assert.strictEqual(
    check("gh api repos/o/r/pulls/49/reviews -f event=APPROVE -f body='was --method GET'").action,
    'ask'
  );
});

test('asks before gh pr comment behind an environment assignment', () => {
  assert.strictEqual(check('GH_TOKEN=x gh pr comment 49 -b x').action, 'ask');
});

test('asks before gh pr comment behind the command builtin', () => {
  assert.strictEqual(check('command gh pr comment 49 -b x').action, 'ask');
});

test('asks before gh pr comment inside a command substitution', () => {
  assert.strictEqual(check('out=$(gh pr comment 49 -b x)').action, 'ask');
});

test('asks before gh pr comment inside a subshell', () => {
  assert.strictEqual(check('(cd repo && gh pr comment 49 -b x)').action, 'ask');
});

test('does not prompt on a commit message naming a command in parentheses', () => {
  assert.strictEqual(check('git commit -m "run (gh pr comment) later"').action, 'pass');
});

test('asks before a field written in the attached form', () => {
  assert.strictEqual(
    check('gh api -X POST repos/o/r/pulls/49/comments -Fin_reply_to=1 -fbody=x').action,
    'ask'
  );
});

test('passes gh pr review whose body quotes an event flag', () => {
  assert.strictEqual(check('gh pr review 49 -b "--approve"').action, 'pass');
});

test('asks before the submitPullRequestReview mutation', () => {
  assert.strictEqual(
    check("gh api graphql -f query='mutation($rev:ID!){submitPullRequestReview(input:{pullRequestReviewId:$rev,event:COMMENT}){clientMutationId}}' -f rev=R_1").action,
    'ask'
  );
});

test('passes addPullRequestReview with no event field', () => {
  assert.strictEqual(
    check("gh api graphql -f query='mutation($pr:ID!,$body:String!){addPullRequestReview(input:{pullRequestId:$pr,body:$body}){pullRequestReview{id state}}}' -f pr=PR_1 -f body='overall'").action,
    'pass'
  );
});

test('passes addPullRequestReviewThread', () => {
  assert.strictEqual(
    check("gh api graphql -f query='mutation($rev:ID!,$path:String!,$line:Int!,$body:String!){addPullRequestReviewThread(input:{pullRequestReviewId:$rev,path:$path,line:$line,side:RIGHT,body:$body}){thread{id}}}' -f rev=R_1 -f path=tools/x.js -F line=3 -f body='finding'").action,
    'pass'
  );
});

test('passes addPullRequestReviewThreadReply', () => {
  assert.strictEqual(
    check("gh api graphql -f query='mutation($rev:ID!,$thread:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewId:$rev,pullRequestReviewThreadId:$thread,body:$body}){comment{id}}}' -f rev=R_1 -f thread=T_1 -f body='reply'").action,
    'pass'
  );
});

test('passes deletePullRequestReview', () => {
  assert.strictEqual(
    check("gh api graphql -f query='mutation($rev:ID!){deletePullRequestReview(input:{pullRequestReviewId:$rev}){pullRequestReview{state}}}' -f rev=R_1").action,
    'pass'
  );
});

test('passes gh api graphql --input', () => {
  assert.strictEqual(check('gh api graphql --input review.json').action, 'pass');
});

test('passes the reviewThreads lookup query', () => {
  assert.strictEqual(
    check("gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){id reviews(last:10,states:PENDING){nodes{id}}}}}' -f o=ssoft-hub -f r=ai -F n=49").action,
    'pass'
  );
});

test('passes a REST review without an event field', () => {
  assert.strictEqual(
    check("gh api -X POST repos/o/r/pulls/49/reviews -f body='overall comment'").action,
    'pass'
  );
});

test('passes a GET of the review comments', () => {
  assert.strictEqual(
    check("gh api repos/o/r/pulls/49/comments --jq '.[].in_reply_to'").action,
    'pass'
  );
});

test('passes gh pr review --help', () => {
  assert.strictEqual(check('gh pr review --help').action, 'pass');
});

test('passes gh pr comment --help', () => {
  assert.strictEqual(check('gh pr comment --help').action, 'pass');
});

test('passes gh pr review with only -R and -b, which carry no event', () => {
  assert.strictEqual(check('gh pr review 49 -R ssoft-hub/ai -b "draft"').action, 'pass');
});

test('passes gh pr view', () => {
  assert.strictEqual(check('gh pr view 49 --json title,body').action, 'pass');
});

test('passes gh pr diff', () => {
  assert.strictEqual(check('gh pr diff 49').action, 'pass');
});

test('passes gh issue comment', () => {
  assert.strictEqual(check('gh issue comment 49 --body "PR #50 resolves this"').action, 'pass');
});

test('passes git status', () => {
  assert.strictEqual(check('git status').action, 'pass');
});

test('does not prompt on a commit message naming the banned commands', () => {
  assert.strictEqual(
    check('git commit -m "guard gh pr comment and gh pr review --approve"').action,
    'pass'
  );
});

test('does not prompt on a commit message naming a publishing mutation', () => {
  assert.strictEqual(check('git commit -m "ask on submitPullRequestReview"').action, 'pass');
});

test('does not prompt on a progress note quoting what the guard blocks', () => {
  assert.strictEqual(
    check('gh issue comment 49 -b "PR #50 blocks gh pr comment"').action,
    'pass'
  );
});

test('does not prompt on an echo of a documentation line', () => {
  assert.strictEqual(check('echo "use gh pr comment for progress notes"').action, 'pass');
});

test('emits a PreToolUse ask decision for gh pr review --approve', () => {
  const r = spawnSync('node', [TOOL], {
    input: JSON.stringify({ tool_input: { command: 'gh pr review 49 --approve' } }),
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
});

test('exits 0 without output on a passing command', () => {
  const r = spawnSync('node', [TOOL], {
    input: JSON.stringify({ tool_input: { command: 'gh pr view 49' } }),
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('exits 0 on malformed stdin JSON', () => {
  const r = spawnSync('node', [TOOL], { input: 'not json', encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
});
