'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

const DISPATCH = {
  Agent:        ['bg-agent-counter.js'],
  Bash:         ['bash-safety.js', 'commit-trailer-guard.js', 'review-publish-guard.js'],
  Edit:         ['secret-guard.js', 'skill-gate.js'],
  Write:        ['secret-guard.js', 'skill-gate.js'],
  MultiEdit:    ['secret-guard.js', 'skill-gate.js'],
  NotebookEdit: ['secret-guard.js', 'skill-gate.js'],
};

// Claude Code reads this hook's stdout as a single JSON document when a tool decides
// on a permission. Several tools can decide on one command, so a run keeps the
// strictest decision and every reason behind it, plain-text warnings included: the
// reason is all the user reads before answering.
const RANK = { allow: 0, ask: 1, deny: 2 };

function toDecision(out) {
  try {
    const parsed = JSON.parse(out);
    return parsed.hookSpecificOutput?.permissionDecision ? parsed : null;
  } catch { return null; }
}

function strictest(decisions) {
  return decisions.reduce((a, b) =>
    (RANK[b.hookSpecificOutput.permissionDecision] ?? 0) >
    (RANK[a.hookSpecificOutput.permissionDecision] ?? 0) ? b : a);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const tools = DISPATCH[data.tool_name] ?? [];
  if (!tools.length) process.exit(0);

  const notes = [];
  const decisions = [];

  for (const tool of tools) {
    const r = spawnSync('node', [path.join(toolsDir, tool)], {
      input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 30000,
    });
    if (r.stderr?.trim()) process.stderr.write(r.stderr);
    if (r.status === 2) {
      if (notes.length) process.stdout.write(notes.join('\n'));
      process.exit(2);
    }
    const out = r.stdout?.trim() ?? '';
    if (!out) continue;
    const decision = toDecision(out);
    if (decision) decisions.push(decision);
    else notes.push(out);
  }

  if (decisions.length) {
    const decision = strictest(decisions);
    decision.hookSpecificOutput.permissionDecisionReason = [
      ...notes,
      ...decisions.map(d => d.hookSpecificOutput.permissionDecisionReason),
    ].join('\n');
    process.stdout.write(JSON.stringify(decision));
  } else if (notes.length) {
    process.stdout.write(notes.join('\n'));
  }
  process.exit(0);
});
