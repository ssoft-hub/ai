'use strict';
const path = require('path');
const { gitCalls } = require(path.join(__dirname, 'git-command.js'));
const { runAsScript } = require(path.join(__dirname, 'guard.js'));

const BANNED_TRAILERS = [
  { name: 'Co-Authored-By', re: /\bco-authored-by\s*:/i },
  { name: 'Generated-by', re: /\bgenerated-by\s*:/i },
];

function isCommit(cmd) {
  return gitCalls(cmd).some(call => call.sub === 'commit');
}

function check(cmd) {
  if (!isCommit(cmd)) return { action: 'pass' };
  for (const { name, re } of BANNED_TRAILERS) {
    if (re.test(cmd)) return { action: 'block', name };
  }
  return { action: 'pass' };
}

function verdict(data) {
  const cmd = data.tool_input?.command ?? '';
  if (!cmd) return undefined;

  const r = check(cmd);
  if (r.action === 'block') {
    return { block:
      `Blocked: commit message contains banned AI-attribution trailer (${r.name})\n` +
      `Per commit-rules skill — "Trailers — Banned". Remove the trailer and retry.\n` };
  }
  return undefined;
}

if (require.main === module) runAsScript(verdict);

module.exports = { BANNED_TRAILERS, isCommit, check, verdict };
