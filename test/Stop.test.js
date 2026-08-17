'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { counterPath, get: count, increment } = require('../tools/bg-agent-counter');

const HOOK = path.join(__dirname, '..', 'hooks', 'Stop.js');

// A config dir whose notification records that it ran instead of raising one.
function mkConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  fs.mkdirSync(path.join(dir, 'tools'));
  fs.writeFileSync(path.join(dir, 'tools', 'stop-notify.js'),
    "require('fs').writeFileSync(require('path').join(__dirname, '..', 'notified'), '');\n");
  return dir;
}

function rmConfig(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function notified(dir) {
  return fs.existsSync(path.join(dir, 'notified'));
}

function runStop(dir) {
  return spawnSync('node', [HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    encoding: 'utf8', stdio: 'pipe',
  });
}

// The hook reads the counter file itself, so every file shape is put to that reader and to
// the tool's: the notification waits exactly while the tool counts a call in the same file.
for (const content of [null, '', '.', '..', '0', '2', 'garbage', 'garbage.']) {
  const label = content === null ? 'no counter file' : `a counter file holding ${JSON.stringify(content)}`;

  test(`notifies over ${label} exactly when it counts no pending call`, () => {
    const dir = mkConfig();
    try {
      if (content !== null) fs.writeFileSync(counterPath(dir), content);
      const pending = count(dir);

      const r = runStop(dir);

      assert.strictEqual(r.status, 0);
      assert.strictEqual(notified(dir), pending === 0);
      assert.strictEqual(count(dir), Math.max(0, pending - 1));
    } finally { rmConfig(dir); }
  });
}

test('takes one call off the count while another is still pending', () => {
  const dir = mkConfig();
  try {
    increment(dir);
    increment(dir);

    const r = runStop(dir);

    assert.strictEqual(r.status, 0);
    assert.strictEqual(count(dir), 1);
    assert.strictEqual(notified(dir), false);
  } finally { rmConfig(dir); }
});

test('notifies once the last pending call is off the count', () => {
  const dir = mkConfig();
  try {
    increment(dir);

    runStop(dir);
    runStop(dir);

    assert.strictEqual(notified(dir), true);
  } finally { rmConfig(dir); }
});
