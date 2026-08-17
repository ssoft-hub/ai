'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoDir = path.join(__dirname, '..');
const HOOK = path.join(repoDir, 'hooks', 'PreToolUse.js');

function run(command, configDir = repoDir, toolName = 'Bash') {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_name: toolName, tool_input: { command } }),
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    encoding: 'utf8',
  });
}

// A config dir with the real skill-gate and a skill claiming C++ files, so gate
// behaviour is exercised without writing session state into the repository.
function mkGateConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  fs.mkdirSync(path.join(dir, 'tools'));
  for (const tool of ['skill-gate.js', 'skill-catalog.js', 'secret-guard.js', 'payload.js',
    'shell-lex.js', 'guard.js']) {
    fs.copyFileSync(path.join(repoDir, 'tools', tool), path.join(dir, 'tools', tool));
  }
  const skillDir = path.join(dir, 'skills', 'comments');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'),
    '---\nname: comments\ndescription: d\nmetadata:\n  paths: ["**/*.cpp"]\n---\nbody\n');
  return dir;
}

function gateInput(configDir, input, session) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify({ ...input, session_id: session }),
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    encoding: 'utf8',
  });
}

// The Bash tools the dispatcher spawns, replaced by fixtures that decide on command.
const BASH_TOOLS = ['bash-safety.js', 'commit-trailer-guard.js', 'review-publish-guard.js', 'skill-gate.js'];

// A spec is a decision name, `{ decision, reason: false }` for a tool that decides
// without stating a reason, `{ decision, context }` for one that speaks to the model
// alongside its decision, `{ warn }` for plain warning text, `{ malformed }` for output
// that is not text, `{ block }` for a tool that blocks, or null for a tool that decides
// nothing.
function verdictFor(spec) {
  if (!spec) return undefined;
  if (spec.malformed !== undefined) return { output: spec.malformed };
  if (spec.warn) return { output: spec.warn };
  if (spec.block) return { block: spec.block };
  const { decision, reason = true, context } = typeof spec === 'string' ? { decision: spec } : spec;
  const hookSpecificOutput = { hookEventName: 'PreToolUse', permissionDecision: decision };
  if (reason) hookSpecificOutput.permissionDecisionReason = `${decision} fixture`;
  if (context) hookSpecificOutput.additionalContext = context;
  return { output: JSON.stringify({ hookSpecificOutput }) };
}

// `{ broken: 'message' }` is a guard file that throws where a guard would have been
// loaded — the failure a half-installed tools directory produces, not a stand-in for it.
// `{ throws: 'message' }` is a guard file that loads and throws on the payload instead,
// the failure raised inside the dispatcher's own process rather than before it.
function deciding(spec) {
  if (spec?.broken) return `'use strict';throw new Error(${JSON.stringify(spec.broken)});`;
  // `{ body }` is the verdict as source: JSON cannot carry a thrown string or a throwing getter.
  if (spec?.body) return `'use strict';module.exports={verdict:${spec.body}};`;
  if (spec?.throws) {
    return `'use strict';module.exports={verdict:()=>{throw new Error(${JSON.stringify(spec.throws)})}};`;
  }
  const said = verdictFor(spec);
  return `'use strict';module.exports={verdict:()=>(${said ? JSON.stringify(said) : 'undefined'})};`;
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

test('blocks a command carrying a secret', () => {
  const r = run(`curl -H "Authorization: token ghp_${'a'.repeat(36)}" https://api.github.com`);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /GitHub PAT/);
});

const UNREADABLE_MESSAGE = '() => { throw Object.defineProperty(new Error("x"), "message",'
  + ' { get() { throw new Error("nope"); } }); }';

test('keeps an earlier decision when a later guard throws an unreadable error', () => {
  const dir = mkConfig([null, null, 'ask', { body: UNREADABLE_MESSAGE }]);
  try {
    const r = run('gh pr comment 49 -b x', dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
    assert.match(r.stderr, /did not run — it stated no reason/);
  } finally { rmConfig(dir); }
});

test('keeps an earlier decision when a later guard throws a string', () => {
  const dir = mkConfig([null, null, 'ask', { body: '() => { throw "gone missing"; }' }]);
  try {
    const r = run('gh pr comment 49 -b x', dir);
    assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
    assert.match(r.stderr, /did not run — gone missing/);
  } finally { rmConfig(dir); }
});

const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const PAT = `ghp_${'a'.repeat(36)}`;

test('blocks a secret written by a tool naming its target as a string', () => {
  const dir = mkGateConfig();
  try {
    const r = gateInput(dir, {
      tool_name: 'mcp__fs__write',
      tool_input: { file_path: 'a.txt', content: `key = "${AWS_KEY}"` },
    }, 's1');
    assert.strictEqual(r.status, 2);
  } finally { rmConfig(dir); }
});

test('loses no guard to a write target that is not a string', () => {
  const dir = mkGateConfig();
  try {
    const r = gateInput(dir, {
      tool_name: 'mcp__fs__write',
      tool_input: { file_path: ['a.txt'], content: `key = "${AWS_KEY}"` },
    }, 's1');
    assert.doesNotMatch(r.stderr, /did not run/);
  } finally { rmConfig(dir); }
});

test('still scans the command when the same call names a target that is not a string', () => {
  const dir = mkGateConfig();
  try {
    const r = gateInput(dir, {
      tool_name: 'mcp__fs__exec',
      tool_input: {
        command: `curl -H "Authorization: token ${PAT}" https://api.github.com`,
        file_path: ['a.txt'],
        content: 'hello',
      },
    }, 's1');
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /GitHub PAT/);
  } finally { rmConfig(dir); }
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

test('gives the model the warning of a tool that decides nothing', () => {
  const r = run('rm -r build');
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(out.hookSpecificOutput.additionalContext, /rm -r/);
});

test('names no permission decision when only a warning was written', () => {
  const out = JSON.parse(run('rm -r build').stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, undefined);
});

test('gives the model a warning that arrives alongside a decision', () => {
  const out = JSON.parse(run('rm -r build && gh pr comment 49 -b x').stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(out.hookSpecificOutput.additionalContext, /rm -r/);
});

test('forwards the skill-gate deny of a first edit, then its warning', () => {
  const dir = mkGateConfig();
  try {
    const input = { tool_name: 'Edit', tool_input: { file_path: '/tmp/does-not-exist/x.cpp' } };
    const first = JSON.parse(gateInput(dir, input, 's1').stdout);
    assert.strictEqual(first.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(first.hookSpecificOutput.permissionDecisionReason, /comments/);
    const second = JSON.parse(gateInput(dir, input, 's1').stdout);
    assert.strictEqual(second.hookSpecificOutput.permissionDecision, undefined);
    assert.match(second.hookSpecificOutput.additionalContext, /comments/);
  } finally { rmConfig(dir); }
});

test('asks before a git push run through the PowerShell tool', () => {
  const out = JSON.parse(run('git push', repoDir, 'PowerShell').stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /git push/);
});

test('asks before a PowerShell command publishing review feedback', () => {
  const out = JSON.parse(run('gh pr comment 49 -b x', repoDir, 'PowerShell').stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /gh pr comment/);
});

test('blocks a destructive command run through the PowerShell tool', () => {
  const r = run('rm -rf /', repoDir, 'PowerShell');
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /Blocked/);
});

test('asks before a git push run through a shell tool it has never heard of', () => {
  const out = JSON.parse(run('git push', repoDir, 'Zsh').stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /git push/);
});

test('asks before a command an MCP shell server would run', () => {
  const out = JSON.parse(run('git push', repoDir, 'mcp__shell__exec').stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
});

test('forwards the skill-gate deny of a write by a tool it has never heard of', () => {
  const dir = mkGateConfig();
  try {
    const input = { tool_name: 'PatchFile', tool_input: { file_path: '/tmp/does-not-exist/x.cpp', content: 'x' } };
    const out = JSON.parse(gateInput(dir, input, 's4').stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /comments/);
  } finally { rmConfig(dir); }
});

test('guards both halves of a payload carrying a command and a write target', () => {
  const dir = mkGateConfig();
  try {
    const input = {
      tool_name: 'RunAndPatch',
      tool_input: { command: 'echo hi', file_path: '/tmp/does-not-exist/x.cpp', content: 'x' },
    };
    const out = JSON.parse(gateInput(dir, input, 's6').stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /x\.cpp/);
  } finally { rmConfig(dir); }
});

test('stays silent for a tool that only names a file to read', () => {
  const dir = mkGateConfig();
  try {
    const input = { tool_name: 'Read', tool_input: { file_path: '/tmp/does-not-exist/x.cpp' } };
    const r = gateInput(dir, input, 's5');
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
  } finally { rmConfig(dir); }
});

test('forwards the skill-gate deny of a PowerShell write', () => {
  const dir = mkGateConfig();
  try {
    const input = { tool_name: 'PowerShell', tool_input: { command: 'Set-Content -Path y.cpp -Value x' } };
    const out = JSON.parse(gateInput(dir, input, 's3').stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /comments/);
  } finally { rmConfig(dir); }
});

test('forwards the skill-gate deny of a bash write', () => {
  const dir = mkGateConfig();
  try {
    const input = { tool_name: 'Bash', tool_input: { command: 'echo x > y.cpp' } };
    const out = JSON.parse(gateInput(dir, input, 's2').stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /comments/);
  } finally { rmConfig(dir); }
});

test('leaves additionalContext out when every tool decided', () => {
  const out = JSON.parse(run('git push && gh pr comment 49 -b x').stdout);
  assert.strictEqual(out.hookSpecificOutput.additionalContext, undefined);
});

test('keeps the additionalContext a deciding tool wrote for the model', () => {
  const dir = mkConfig([{ decision: 'ask', context: 'context fixture' }, { warn: 'warn fixture' }, null]);
  try {
    const out = JSON.parse(run('anything', dir).stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /context fixture/);
    assert.match(out.hookSpecificOutput.additionalContext, /warn fixture/);
  } finally { rmConfig(dir); }
});

test('gives the model an earlier warning when a later tool blocks', () => {
  const dir = mkConfig([{ warn: 'warn fixture' }, { block: 'Blocked fixture' }, null]);
  try {
    const r = run('anything', dir);
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /Blocked fixture\nwarn fixture/);
  } finally { rmConfig(dir); }
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
    assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, undefined);
  } finally { rmConfig(dir); }
});

test('names the tool behind output that decides nothing', () => {
  const dir = mkConfig(['maybe', null, null]);
  try {
    const context = JSON.parse(run('anything', dir).stdout).hookSpecificOutput.additionalContext;
    assert.match(context, /bash-safety\.js/);
    assert.match(context, /maybe fixture/);
  } finally { rmConfig(dir); }
});

test('keeps the decision of another guard when one throws where it is loaded', () => {
  const dir = mkConfig([{ broken: 'broken fixture' }, 'ask', null]);
  try {
    const r = run('anything', dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally { rmConfig(dir); }
});

test('names the guard that threw where it is loaded', () => {
  const dir = mkConfig([{ broken: 'broken fixture' }, 'ask', null]);
  try {
    const r = run('anything', dir);
    assert.match(r.stderr, /bash-safety\.js.*broken fixture/);
  } finally { rmConfig(dir); }
});

test('keeps the decision of another guard when one throws on the payload', () => {
  const dir = mkConfig([{ throws: 'thrown fixture' }, 'ask', null]);
  try {
    const r = run('anything', dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally { rmConfig(dir); }
});

test('names the guard that threw on the payload', () => {
  const dir = mkConfig([{ throws: 'thrown fixture' }, 'ask', null]);
  try {
    const r = run('anything', dir);
    assert.match(r.stderr, /bash-safety\.js.*thrown fixture/);
  } finally { rmConfig(dir); }
});

test('stops at the first block instead of reaching the guards behind it', () => {
  const dir = mkConfig([{ block: 'first block' }, { block: 'second block' }, null]);
  try {
    const r = run('anything', dir);
    assert.match(r.stderr, /first block/);
    assert.doesNotMatch(r.stderr, /second block/);
  } finally { rmConfig(dir); }
});

test('keeps the decision of another guard when one states output that is not text', () => {
  const dir = mkConfig([{ malformed: 42 }, 'ask', null]);
  try {
    const r = run('anything', dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
  } finally { rmConfig(dir); }
});

test('names a guard whose file is missing from the config dir', () => {
  const dir = mkConfig(['ask', null, null]);
  try {
    assert.match(run('anything', dir).stderr, /secret-guard\.js did not run/);
  } finally { rmConfig(dir); }
});

test('names a guard whose file exports no verdict', () => {
  const dir = mkConfig([null, null, null]);
  try {
    fs.writeFileSync(path.join(dir, 'tools', 'bash-safety.js'), "'use strict';module.exports={};");
    assert.match(run('anything', dir).stderr, /bash-safety\.js did not run — it exports no verdict/);
  } finally { rmConfig(dir); }
});

test('exits 0 on malformed stdin JSON', () => {
  const r = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
});
