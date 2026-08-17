'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { get: count } = require('../tools/background-call-counter');

const repoDir = path.join(__dirname, '..');
const HOOK = path.join(repoDir, 'hooks', 'PostToolUse.js');

// A config dir with the real counter and what it requires, so the count of a test run is
// never written into the repository.
function mkCounterConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  fs.mkdirSync(path.join(dir, 'tools'));
  for (const tool of ['background-call-counter.js', 'payload.js']) {
    fs.copyFileSync(path.join(repoDir, 'tools', tool), path.join(dir, 'tools', tool));
  }
  return dir;
}

function rmConfig(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function sendInput(configDir, input) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(input),
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    encoding: 'utf8',
  });
}

test('counts a call that was started in the background', () => {
  const dir = mkCounterConfig();
  try {
    const input = { tool_name: 'Bash', tool_input: { command: 'npm test', run_in_background: true } };
    const r = sendInput(dir, input);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(count(dir), 1);
  } finally { rmConfig(dir); }
});

test('counts a background call from a tool it has never heard of', () => {
  const dir = mkCounterConfig();
  try {
    const input = { tool_name: 'mcp__runner__spawn', tool_input: { prompt: 'do it', run_in_background: true } };
    const r = sendInput(dir, input);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(count(dir), 1);
  } finally { rmConfig(dir); }
});

test('counts nothing for a call that names no background run', () => {
  const dir = mkCounterConfig();
  try {
    const input = { tool_name: 'Bash', tool_input: { command: 'npm test' } };
    const r = sendInput(dir, input);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(count(dir), 0);
  } finally { rmConfig(dir); }
});

test('says nothing to the model about a background call it counted', () => {
  const dir = mkCounterConfig();
  try {
    const input = { tool_name: 'Bash', tool_input: { command: 'npm test', run_in_background: true } };
    assert.strictEqual(sendInput(dir, input).stdout, '');
  } finally { rmConfig(dir); }
});
