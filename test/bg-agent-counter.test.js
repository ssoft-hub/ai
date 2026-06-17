'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { counterPath, get, increment, decrement, reset } = require('../tools/bg-agent-counter');

const toolPath = path.resolve(__dirname, '../tools/bg-agent-counter.js');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bg-agent-test-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

test('get returns 0 when file missing', () => {
  const dir = mkTmp();
  try {
    assert.strictEqual(get(dir), 0);
  } finally { rmTmp(dir); }
});

test('get returns 0 for invalid file content', () => {
  const dir = mkTmp();
  try {
    fs.writeFileSync(counterPath(dir), 'garbage');
    assert.strictEqual(get(dir), 0);
  } finally { rmTmp(dir); }
});

test('increment creates file with 1', () => {
  const dir = mkTmp();
  try {
    increment(dir);
    assert.strictEqual(get(dir), 1);
  } finally { rmTmp(dir); }
});

test('increment adds to existing count', () => {
  const dir = mkTmp();
  try {
    increment(dir);
    increment(dir);
    assert.strictEqual(get(dir), 2);
  } finally { rmTmp(dir); }
});

test('decrement subtracts one', () => {
  const dir = mkTmp();
  try {
    increment(dir);
    increment(dir);
    decrement(dir);
    assert.strictEqual(get(dir), 1);
  } finally { rmTmp(dir); }
});

test('decrement floors at 0', () => {
  const dir = mkTmp();
  try {
    decrement(dir);
    assert.strictEqual(get(dir), 0);
  } finally { rmTmp(dir); }
});

test('reset writes 0', () => {
  const dir = mkTmp();
  try {
    increment(dir);
    increment(dir);
    reset(dir);
    assert.strictEqual(get(dir), 0);
  } finally { rmTmp(dir); }
});

test('stdin handler increments on run_in_background: true', () => {
  const dir = mkTmp();
  try {
    const input = JSON.stringify({ tool_name: 'Agent', tool_input: { run_in_background: true } });
    const r = spawnSync('node', [toolPath], {
      input, encoding: 'utf8', stdio: 'pipe',
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(get(dir), 1);
  } finally { rmTmp(dir); }
});

test('stdin handler skips when run_in_background is false', () => {
  const dir = mkTmp();
  try {
    const input = JSON.stringify({ tool_name: 'Agent', tool_input: { run_in_background: false } });
    const r = spawnSync('node', [toolPath], {
      input, encoding: 'utf8', stdio: 'pipe',
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(get(dir), 0);
  } finally { rmTmp(dir); }
});

test('stdin handler skips when run_in_background absent', () => {
  const dir = mkTmp();
  try {
    const input = JSON.stringify({ tool_name: 'Agent', tool_input: { prompt: 'do something' } });
    const r = spawnSync('node', [toolPath], {
      input, encoding: 'utf8', stdio: 'pipe',
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(get(dir), 0);
  } finally { rmTmp(dir); }
});

test('stdin handler exits 0 on malformed JSON', () => {
  const dir = mkTmp();
  try {
    const r = spawnSync('node', [toolPath], {
      input: 'not json', encoding: 'utf8', stdio: 'pipe',
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    });
    assert.strictEqual(r.status, 0);
  } finally { rmTmp(dir); }
});
