'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

const DISPATCH = {
  Agent:        ['bg-agent-counter.js'],
  Bash:         ['bash-safety.js', 'commit-trailer-guard.js', 'review-publish-guard.js', 'skill-gate.js'],
  Edit:         ['secret-guard.js', 'skill-gate.js'],
  Write:        ['secret-guard.js', 'skill-gate.js'],
  MultiEdit:    ['secret-guard.js', 'skill-gate.js'],
  NotebookEdit: ['secret-guard.js', 'skill-gate.js'],
};

// Claude Code reads this hook's stdout as a single JSON document; anything else it
// writes reaches the debug log alone. A permission reason is read by the user, and
// `additionalContext` by the model, so a warning goes to both. Several tools can decide
// on one command, so a run keeps the strictest decision and every reason behind it.
// These three are the whole vocabulary a decision can name.
const RANK = { allow: 0, ask: 1, deny: 2 };

// Output that names none of the three is text: unparseable output as written, and output
// that parses behind a line naming the tool it came from, so that a run whose only output
// is a malformed decision cannot be read as a decision either.
function readOutput(out, tool) {
  let parsed;
  try { parsed = JSON.parse(out); } catch { return { note: out }; }
  return Object.hasOwn(RANK, parsed.hookSpecificOutput?.permissionDecision)
    ? { decision: parsed }
    : { note: `${tool} named no permission decision: ${out}` };
}

function strictest(decisions) {
  return decisions.reduce((a, b) =>
    RANK[b.hookSpecificOutput.permissionDecision] >
    RANK[a.hookSpecificOutput.permissionDecision] ? b : a);
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
    if (r.stderr?.trim()) process.stderr.write(`${r.stderr.trim()}\n`);
    if (r.status === 2) {
      // A blocked call has no JSON output left to carry a warning: stderr is the only
      // channel exit 2 leaves open, and it reaches the model as well as the user.
      if (notes.length) process.stderr.write(`${notes.join('\n')}\n`);
      process.exit(2);
    }
    const out = r.stdout?.trim() ?? '';
    if (!out) continue;
    const { decision, note } = readOutput(out, tool);
    if (decision) decisions.push(decision);
    else notes.push(note);
  }

  if (!decisions.length && !notes.length) process.exit(0);

  const merged = decisions.length
    ? strictest(decisions)
    : { hookSpecificOutput: { hookEventName: 'PreToolUse' } };
  if (decisions.length) {
    merged.hookSpecificOutput.permissionDecisionReason = [
      ...notes,
      ...decisions.map(d => d.hookSpecificOutput.permissionDecisionReason),
    ].filter(Boolean).join('\n');
  }
  const context = [...decisions.map(d => d.hookSpecificOutput.additionalContext), ...notes]
    .filter(Boolean);
  if (context.length) merged.hookSpecificOutput.additionalContext = context.join('\n');
  process.stdout.write(JSON.stringify(merged));
  process.exit(0);
});
