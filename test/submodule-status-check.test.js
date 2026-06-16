'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseStatus, check } = require('../tools/submodule-status-check');

test('parseStatus finds ahead-of-root-ref submodules (+ prefix)', () => {
  const issues = parseStatus('+abc1234 libs/foo (heads/main)\n');
  assert.strictEqual(issues.length, 1);
  assert.strictEqual(issues[0].prefix, '+');
  assert.strictEqual(issues[0].name, 'ahead of root ref');
});

test('parseStatus finds uninitialized submodules (- prefix)', () => {
  const issues = parseStatus('-abc1234 libs/bar\n');
  assert.strictEqual(issues.length, 1);
  assert.strictEqual(issues[0].name, 'not initialized');
});

test('parseStatus finds merge-conflicted submodules (U prefix)', () => {
  const issues = parseStatus('Uabc1234 libs/baz\n');
  assert.strictEqual(issues.length, 1);
  assert.strictEqual(issues[0].name, 'merge conflict');
});

test('parseStatus ignores clean submodules (space prefix)', () => {
  const issues = parseStatus(' abc1234 libs/clean (heads/main)\n');
  assert.strictEqual(issues.length, 0);
});

test('parseStatus ignores blank lines', () => {
  const issues = parseStatus('\n\n');
  assert.strictEqual(issues.length, 0);
});

test('parseStatus handles mixed output', () => {
  const issues = parseStatus(' abc1234 ok\n+def5678 ahead\n-ghi9012 uninit\n');
  assert.strictEqual(issues.length, 2);
});

test('check returns no issues when .gitmodules is absent', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'submod-check-'));
  try {
    assert.deepStrictEqual(check(tmp), { issues: [] });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
