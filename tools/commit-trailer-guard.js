'use strict';

const COMMIT_RE = /\bgit\s+commit\b/i;
const BANNED_TRAILERS = [
  { name: 'Co-Authored-By', re: /\bco-authored-by\s*:/i },
  { name: 'Generated-by', re: /\bgenerated-by\s*:/i },
];

function check(cmd) {
  if (!COMMIT_RE.test(cmd)) return { action: 'pass' };
  for (const { name, re } of BANNED_TRAILERS) {
    if (re.test(cmd)) return { action: 'block', name };
  }
  return { action: 'pass' };
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }

    const cmd = data.tool_input?.command ?? '';
    if (!cmd) process.exit(0);

    const r = check(cmd);
    if (r.action === 'block') {
      process.stderr.write(
        `Blocked: commit message contains banned AI-attribution trailer (${r.name})\n` +
        `Per commit-rules skill — "Trailers — Banned". Remove the trailer and retry.\n`
      );
      process.exit(2);
    }
    process.exit(0);
  });
}

module.exports = { COMMIT_RE, BANNED_TRAILERS, check };
