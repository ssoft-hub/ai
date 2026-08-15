'use strict';
const path = require('path');
const { runAsScript } = require(path.join(__dirname, 'guard.js'));

const VALUE_FLAGS = [
  '-f', '-F', '--field', '--raw-field', '--input',
  '-X', '--method', '-b', '--body', '--body-file',
  '-q', '--jq', '-H', '--header', '-R', '--repo', '--template',
];
const SHORT_VALUE_FLAGS = ['-f', '-F', '-X', '-b', '-q', '-H', '-R'];
const FIELD_FLAGS = ['-f', '-F', '--field', '--raw-field'];
const WRAPPERS = new Set(['command', 'sudo', 'env', 'nohup', 'time']);

// gh flags are case-sensitive: -R (--repo) must not read as -r (--request-changes).
const REVIEW_EVENT = /^-(?:-(?:comment|approve|request-changes)|[abcrFR]*[acr][abcrFR]*)$/;
const REPLY_PATH = /(?:^|\/)pulls\/[^/]+\/comments\b/;
const REVIEW_PATH = /(?:^|\/)pulls\/[^/]+\/reviews\b/;

const DELIMITERS = new Set([';', '&', '|', '\n', '(', ')', '`']);

// A quoted body holds prose, so it starts no command and supplies no flag. One pass
// splits on unquoted delimiters and strips the quotes, leaving each command an argv
// whose body is a single token no rule looks inside. A substitution or a subshell
// starts a command too, so its parentheses and backticks delimit as well.
function commands(cmd) {
  const found = [];
  let argv = [];
  let token = '';
  let started = false;
  let quote = null;

  const endToken = () => { if (started) { argv.push(token); token = ''; started = false; } };
  const endCommand = () => { endToken(); if (argv.length) found.push(argv); argv = []; };

  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === '\\' && quote === '"' && i + 1 < cmd.length) token += cmd[++i];
      else if (c === quote) quote = null;
      else token += c;
      started = true;
    } else if (c === "'" || c === '"') {
      quote = c;
      started = true;
    } else if (c === '\\' && i + 1 < cmd.length) {
      token += cmd[++i];
      started = true;
    } else if (DELIMITERS.has(c)) {
      endCommand();
    } else if (c === ' ' || c === '\t') {
      endToken();
    } else {
      token += c;
      started = true;
    }
  }
  endCommand();
  return found;
}

// Options are the tokens in flag position, values the tokens their flags consume, so
// `-f body=...` never reaches the option list and its prose never reaches a flag test.
function parse(argv) {
  let start = 0;
  while (start < argv.length
    && (/^[A-Za-z_]\w*=/.test(argv[start]) || WRAPPERS.has(argv[start]))) start++;

  const words = argv.slice(start);
  const options = [];
  const values = [];

  for (let i = 0; i < words.length; i++) {
    const t = words[i];
    options.push(t);
    const eq = t.indexOf('=');
    const attached = SHORT_VALUE_FLAGS.find(f => t.startsWith(f) && t.length > f.length);
    if (VALUE_FLAGS.includes(t)) {
      values.push([t, words[i + 1] ?? '']);
      i++;
    } else if (eq > 0 && VALUE_FLAGS.includes(t.slice(0, eq))) {
      values.push([t.slice(0, eq), t.slice(eq + 1)]);
    } else if (attached) {
      values.push([attached, t.slice(attached.length)]);
    }
  }
  return { words, options, values };
}

function isGh(ctx, ...sub) {
  return ctx.words[0] === 'gh' && sub.every((word, i) => ctx.words[i + 1] === word);
}

function fieldValue(ctx, name) {
  const prefix = `${name}=`;
  const hit = ctx.values.find(([flag, v]) => FIELD_FLAGS.includes(flag) && v.startsWith(prefix));
  return hit ? hit[1].slice(prefix.length) : null;
}

// gh api sends GET unless a method is given or the call carries fields.
function isPost(ctx) {
  const method = ctx.values.find(([flag]) => flag === '-X' || flag === '--method');
  if (method) return method[1].toUpperCase() === 'POST';
  return ctx.values.some(([flag]) => FIELD_FLAGS.includes(flag) || flag === '--input');
}

function query(ctx) {
  return fieldValue(ctx, 'query') ?? '';
}

const ASK = [
  {
    // A bare gh pr review publishes too, but only from a terminal: without an event
    // flag gh refuses to run non-interactively, which is how a hooked command runs.
    name: 'gh pr review',
    test: ctx => isGh(ctx, 'pr', 'review') && ctx.options.some(t => REVIEW_EVENT.test(t)),
    msg: 'gh pr review --comment/--approve/--request-changes submits the review on the spot. '
      + 'Leave the feedback in a pending review instead: addPullRequestReview with no event '
      + 'field, then addPullRequestReviewThread per finding, and a human submits it. '
      + 'See pr-rules, Pending by Default.',
  },
  {
    name: 'gh pr comment',
    test: ctx => isGh(ctx, 'pr', 'comment')
      && ctx.words[3] !== '--help' && ctx.words[3] !== '-h',
    msg: 'gh pr comment publishes on the spot and notifies every watcher. Review feedback '
      + 'belongs in the body of a pending addPullRequestReview instead. Progress notes belong '
      + 'on the issue, which gh issue comment reaches without this prompt. '
      + 'See pr-rules, Pending by Default.',
  },
  {
    name: 'REST reply',
    test: ctx => isGh(ctx, 'api') && ctx.options.some(t => REPLY_PATH.test(t))
      && fieldValue(ctx, 'in_reply_to') !== null && isPost(ctx),
    msg: 'POST /pulls/{n}/comments with in_reply_to has no pending form and publishes the '
      + 'reply. Use addPullRequestReviewThreadReply with the pullRequestReviewId of a pending '
      + 'review instead. See pr-rules, Pending by Default.',
  },
  {
    name: 'REST review event',
    test: ctx => isGh(ctx, 'api') && ctx.options.some(t => REVIEW_PATH.test(t))
      && fieldValue(ctx, 'event') !== null && isPost(ctx),
    msg: 'An event field on POST /pulls/{n}/reviews submits the review. Drop the field to '
      + 'leave the review PENDING for a human to submit. See pr-rules, Pending by Default.',
  },
  {
    name: 'submitPullRequestReview',
    test: ctx => isGh(ctx, 'api') && query(ctx).includes('submitPullRequestReview'),
    msg: 'submitPullRequestReview publishes the pending review. A human submits it, so leave '
      + 'the review pending and report where it is. See pr-rules, Pending by Default.',
  },
  {
    name: 'unattached reply',
    test: ctx => {
      const q = query(ctx);
      return isGh(ctx, 'api') && q.includes('addPullRequestReviewThreadReply')
        && !q.includes('pullRequestReviewId');
    },
    msg: 'addPullRequestReviewThreadReply without pullRequestReviewId belongs to no pending '
      + 'review, so it publishes. Pass the id of a pending review. '
      + 'See pr-rules, Pending by Default.',
  },
];

function check(cmd) {
  for (const argv of commands(cmd)) {
    const ctx = parse(argv);
    for (const rule of ASK) {
      if (rule.test(ctx)) return { action: 'ask', name: rule.name, msg: rule.msg };
    }
  }
  return { action: 'pass' };
}

function verdict(data) {
  const cmd = data.tool_input?.command ?? '';
  if (!cmd) return undefined;

  const r = check(cmd);
  if (r.action === 'ask') {
    return { output: JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: r.msg,
      },
    }) };
  }
  return undefined;
}

if (require.main === module) runAsScript(verdict);

module.exports = { ASK, check, commands, parse, verdict };
