'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { get: count, increment } = require('../tools/background-call-counter');

const HOOK = path.join(__dirname, '..', 'hooks', 'SessionStart.js');

// The dispatcher spawns each tool out of the config dir, so a stub standing in for one
// records that it ran without the real tool's dependencies reaching the fixture.
function stubTool(dir, name, body = '') {
  fs.writeFileSync(path.join(dir, 'tools', name), body);
}

// A config dir whose tools do nothing, so a session start says nothing about this machine.
function mkConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  fs.mkdirSync(path.join(dir, 'tools'));
  stubTool(dir, 'submodule-status-check.js');
  stubTool(dir, 'session-env-prune.js');
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

test('runs the prune that clears state left by sessions that are over', () => {
  const dir = mkConfig();
  try {
    const marker = path.join(dir, 'pruned');
    stubTool(dir, 'session-env-prune.js',
      `require('fs').writeFileSync(${JSON.stringify(marker)}, '');\n`);

    const r = runSessionStart(dir);

    assert.strictEqual(r.status, 0);
    assert.ok(fs.existsSync(marker));
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
