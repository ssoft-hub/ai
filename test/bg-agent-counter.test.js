'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { counterPath, get, increment } = require('../tools/bg-agent-counter');

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

test('stdin handler increments on a background shell call', () => {
  const dir = mkTmp();
  try {
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm test', run_in_background: true } });
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
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm test', run_in_background: false } });
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

test('stdin handler exits 0 when the count cannot be written', () => {
  const dir = mkTmp();
  try {
    fs.mkdirSync(counterPath(dir));
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm test', run_in_background: true } });
    const r = spawnSync('node', [toolPath], {
      input, encoding: 'utf8', stdio: 'pipe',
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    });
    assert.strictEqual(r.status, 0);
    assert.match(r.stderr, /not counted/);
  } finally { rmTmp(dir); }
});

test('concurrent increments from separate processes all land', async () => {
  const dir = mkTmp();
  const calls = 4;
  const started = [];
  try {
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm test', run_in_background: true } });
    const finished = [];
    for (let i = 0; i < calls; i++) {
      const child = spawn('node', [toolPath], {
        stdio: ['pipe', 'ignore', 'ignore'],
        env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
      });
      // A child that exits before the write makes it an EPIPE, which with no handler here
      // takes the runner down instead of failing this test.
      child.stdin.on('error', () => {});
      started.push(child);
      finished.push(new Promise(resolve => child.on('exit', resolve)));
    }
    // Started first and fed together, so the counts overlap instead of following startup order.
    await new Promise(resolve => setTimeout(resolve, 300));
    for (const child of started) child.stdin.end(input);
    await Promise.all(finished);

    assert.strictEqual(get(dir), calls);
  } finally {
    for (const child of started) child.kill();
    rmTmp(dir);
  }
});
