'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { get: count, increment } = require('../tools/background-call-counter');

const HOOK = path.join(__dirname, '..', 'hooks', 'SessionStart.js');

// A config dir whose checks do nothing, so a session start says nothing about this machine.
function mkConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  fs.mkdirSync(path.join(dir, 'tools'));
  fs.writeFileSync(path.join(dir, 'tools', 'submodule-status-check.js'), '');
  return dir;
}

function rmConfig(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function runSessionStart(dir) {
  return spawnSync('node', [HOOK], {
    input: '{}',
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    encoding: 'utf8', stdio: 'pipe',
  });
}

test('clears a count left behind by a crashed session', () => {
  const dir = mkConfig();
  try {
    increment(dir);
    increment(dir);

    const r = runSessionStart(dir);

    assert.strictEqual(r.status, 0);
    assert.strictEqual(count(dir), 0);
  } finally { rmConfig(dir); }
});

test('writes a reset that is not itself readable as a pending call', () => {
  const dir = mkConfig();
  try {
    const r = runSessionStart(dir);

    assert.strictEqual(r.status, 0);
    assert.strictEqual(count(dir), 0);
  } finally { rmConfig(dir); }
});
