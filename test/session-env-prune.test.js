'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { prune, RETENTION_MS } = require('../tools/session-env-prune');

const pruneJs = path.join(__dirname, '..', 'tools', 'session-env-prune.js');

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'session-env-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
// A state file whose last gated call was `age` milliseconds ago.
function writeState(dir, name, age) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, '{}');
  const at = new Date(Date.now() - age);
  fs.utimesSync(file, at, at);
  return file;
}

// The state of one session, under the session-env directory of a config dir of its own.
function mkConfigDir(name, age) {
  const dir = mkTmp();
  const sessionEnv = path.join(dir, 'session-env');
  fs.mkdirSync(sessionEnv);
  return { dir, state: writeState(sessionEnv, name, age) };
}

function runPrune(configDir, input) {
  return spawnSync('node', [pruneJs], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
}

test('removes state left behind by a session that is over', () => {
  const dir = mkTmp();
  try {
    const state = writeState(dir, 's1.skill-gate.json', 30 * DAY);
    prune(dir);
    assert.strictEqual(fs.existsSync(state), false);
  } finally { rmTmp(dir); }
});

test('keeps state a session is still using', () => {
  const dir = mkTmp();
  try {
    const state = writeState(dir, 's1.skill-gate.json', 0);
    prune(dir);
    assert.ok(fs.existsSync(state));
  } finally { rmTmp(dir); }
});

test('keeps the state of the session being started, however old it is', () => {
  const dir = mkTmp();
  try {
    const state = writeState(dir, 's1.skill-gate.json', 30 * DAY);
    prune(dir, 's1');
    assert.ok(fs.existsSync(state));
  } finally { rmTmp(dir); }
});

test('keeps the state a payload carrying no session id is written to', () => {
  const dir = mkTmp();
  try {
    const state = writeState(dir, 'unknown.skill-gate.json', 30 * DAY);
    prune(dir);
    assert.ok(fs.existsSync(state));
  } finally { rmTmp(dir); }
});

test('keeps the state of a subagent of the session being started', () => {
  const dir = mkTmp();
  try {
    const state = writeState(dir, 's1.a1.skill-gate.json', 30 * DAY);
    prune(dir, 's1');
    assert.ok(fs.existsSync(state));
  } finally { rmTmp(dir); }
});

test('removes state of another session whose id begins with the live one', () => {
  const dir = mkTmp();
  try {
    const state = writeState(dir, 's10.skill-gate.json', 30 * DAY);
    prune(dir, 's1');
    assert.strictEqual(fs.existsSync(state), false);
  } finally { rmTmp(dir); }
});

test('leaves the per-session directory Claude Code keeps beside its own state alone', () => {
  const dir = mkTmp();
  try {
    const theirs = path.join(dir, 'e2eb2f76-56ff-41fe-be3c-9ee662105090');
    fs.mkdirSync(theirs);
    prune(dir);
    assert.ok(fs.existsSync(theirs));
  } finally { rmTmp(dir); }
});

test('takes every file it can when one entry cannot be removed', () => {
  const dir = mkTmp();
  try {
    const first = writeState(dir, 'a.skill-gate.json', 30 * DAY);
    const last = writeState(dir, 'z.skill-gate.json', 30 * DAY);
    // Unlinking a directory fails on every platform, which is the entry a session
    // starting alongside this one would produce by removing a file mid-sweep.
    const stuck = path.join(dir, 'm.skill-gate.json');
    fs.mkdirSync(stuck);
    const aged = new Date(Date.now() - 30 * DAY);
    fs.utimesSync(stuck, aged, aged);

    assert.doesNotThrow(() => prune(dir));

    assert.strictEqual(fs.existsSync(first), false);
    assert.strictEqual(fs.existsSync(last), false);
  } finally { rmTmp(dir); }
});

test('keeps state whose last call is just inside the retention', () => {
  const dir = mkTmp();
  try {
    const state = writeState(dir, 's1.skill-gate.json', RETENTION_MS - MINUTE);
    prune(dir);
    assert.ok(fs.existsSync(state));
  } finally { rmTmp(dir); }
});

test('run as a script, finds the session-env of the config dir it is pointed at', () => {
  const { dir, state } = mkConfigDir('s1.skill-gate.json', 30 * DAY);
  try {
    const r = runPrune(dir, { session_id: 's2' });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(fs.existsSync(state), false);
  } finally { rmTmp(dir); }
});

test('run as a script, keeps the state of the session named in the payload', () => {
  const { dir, state } = mkConfigDir('s1.skill-gate.json', 30 * DAY);
  try {
    const r = runPrune(dir, { session_id: 's1' });
    assert.strictEqual(r.status, 0);
    assert.ok(fs.existsSync(state));
  } finally { rmTmp(dir); }
});

test('says nothing on the stdout a session start reads into the model context', () => {
  const { dir } = mkConfigDir('s1.skill-gate.json', 30 * DAY);
  try {
    assert.strictEqual(runPrune(dir, { session_id: 's2' }).stdout, '');
  } finally { rmTmp(dir); }
});

test('exits 0 on malformed stdin', () => {
  const { dir, state } = mkConfigDir('s1.skill-gate.json', 30 * DAY);
  try {
    const r = spawnSync('node', [pruneJs], {
      input: 'not json',
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    });
    assert.strictEqual(r.status, 0);
    assert.ok(fs.existsSync(state));
  } finally { rmTmp(dir); }
});

test('takes a directory no session has written state to yet', () => {
  const dir = mkTmp();
  try {
    assert.strictEqual(prune(path.join(dir, 'session-env')), 0);
  } finally { rmTmp(dir); }
});

test('removes state whose last call is just past the retention', () => {
  const dir = mkTmp();
  try {
    const state = writeState(dir, 's1.skill-gate.json', RETENTION_MS + MINUTE);
    prune(dir);
    assert.strictEqual(fs.existsSync(state), false);
  } finally { rmTmp(dir); }
});
