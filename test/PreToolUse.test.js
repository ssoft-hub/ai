'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoDir = path.join(__dirname, '..');
const HOOK = path.join(repoDir, 'hooks', 'PreToolUse.js');

function run(command, configDir = repoDir) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    encoding: 'utf8',
  });
}

// The Bash tools the dispatcher spawns, replaced by fixtures that decide on command.
const BASH_TOOLS = ['bash-safety.js', 'commit-trailer-guard.js', 'review-publish-guard.js'];

// A spec is a decision name, `{ decision, reason: false }` for a tool that decides
// without stating a reason, or null for a tool that decides nothing.
function deciding(spec) {
  if (!spec) return "'use strict';";
  const { decision, reason = true } = typeof spec === 'string' ? { decision: spec } : spec;
  const hookSpecificOutput = { hookEventName: 'PreToolUse', permissionDecision: decision };
  if (reason) hookSpecificOutput.permissionDecisionReason = `${decision} fixture`;
  return `'use strict';process.stdout.write(${
    JSON.stringify(JSON.stringify({ hookSpecificOutput }))});`;
}

function mkConfig(decisions) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  fs.mkdirSync(path.join(dir, 'tools'));
  BASH_TOOLS.forEach((tool, i) => {
    fs.writeFileSync(path.join(dir, 'tools', tool), deciding(decisions[i]));
  });
  return dir;
}

function rmConfig(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

test('emits one permission decision when two guards fire on one command', () => {
  const r = run('git push && gh pr comment 49 -b x');
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
});

test('keeps every reason when two guards decide on one command', () => {
  const r = run('git push && gh pr comment 49 -b x');
  const reason = JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason;
  assert.match(reason, /git push/);
  assert.match(reason, /gh pr comment/);
});

test('keeps an earlier warning in the reason of the decision that follows it', () => {
  const r = run('rm -r build && gh pr comment 49 -b x');
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /rm -r/);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /gh pr comment/);
});

test('passes plain warning text through when no tool decides', () => {
  const r = run('rm -r build');
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /rm -r/);
  assert.throws(() => JSON.parse(r.stdout));
});

test('exits 2 on a blocked command', () => {
  const r = run('rm -rf /');
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /Blocked/);
});

test('stays silent on a command no tool objects to', () => {
  const r = run('gh pr view 49');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('keeps deny when a later tool denies what an earlier one only asked about', () => {
  const dir = mkConfig(['ask', 'deny', null]);
  try {
    const out = JSON.parse(run('anything', dir).stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /ask fixture/);
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /deny fixture/);
  } finally { rmConfig(dir); }
});

test('keeps deny when an earlier tool denies and a later one asks', () => {
  const dir = mkConfig(['deny', 'ask', null]);
  try {
    const out = JSON.parse(run('anything', dir).stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
  } finally { rmConfig(dir); }
});

test('keeps ask over allow', () => {
  const dir = mkConfig(['allow', 'ask', null]);
  try {
    const out = JSON.parse(run('anything', dir).stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
  } finally { rmConfig(dir); }
});

test('leaves out the missing reason of a tool that decides without one', () => {
  const dir = mkConfig([{ decision: 'ask', reason: false }, 'deny', null]);
  try {
    const out = JSON.parse(run('anything', dir).stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecisionReason, 'deny fixture');
  } finally { rmConfig(dir); }
});

test('merges an empty reason when the only deciding tool states none', () => {
  const dir = mkConfig([{ decision: 'ask', reason: false }, null, null]);
  try {
    const out = JSON.parse(run('anything', dir).stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
    assert.strictEqual(out.hookSpecificOutput.permissionDecisionReason, '');
  } finally { rmConfig(dir); }
});

test('gives a value outside allow, ask and deny no say in the decision', () => {
  const dir = mkConfig(['maybe', 'allow', null]);
  try {
    const out = JSON.parse(run('anything', dir).stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'allow');
  } finally { rmConfig(dir); }
});

test('still shows what a tool naming an unknown decision wrote', () => {
  const dir = mkConfig(['maybe', 'ask', null]);
  try {
    const out = JSON.parse(run('anything', dir).stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /maybe fixture/);
  } finally { rmConfig(dir); }
});

test('keeps a lone unknown decision off stdout as a decision of its own', () => {
  const dir = mkConfig(['maybe', null, null]);
  try {
    const r = run('anything', dir);
    assert.strictEqual(r.status, 0);
    assert.throws(() => JSON.parse(r.stdout));
  } finally { rmConfig(dir); }
});

test('names the tool behind output that decides nothing', () => {
  const dir = mkConfig(['maybe', null, null]);
  try {
    const r = run('anything', dir);
    assert.match(r.stdout, /bash-safety\.js/);
    assert.match(r.stdout, /maybe fixture/);
  } finally { rmConfig(dir); }
});

test('exits 0 on malformed stdin JSON', () => {
  const r = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
});
