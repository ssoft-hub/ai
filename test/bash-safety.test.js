'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { check } = require('../tools/bash-safety');

const TOOL = path.join(__dirname, '..', 'tools', 'bash-safety.js');

test('blocks rm -rf /', () => {
  assert.strictEqual(check('rm -rf /').action, 'block');
});

test('blocks rm -fr /', () => {
  assert.strictEqual(check('rm -fr /').action, 'block');
});

test('blocks rm -Rf /', () => {
  assert.strictEqual(check('rm -Rf /').action, 'block');
});

test('blocks rm -rfv ~/', () => {
  assert.strictEqual(check('rm -rfv ~/').action, 'block');
});

test('blocks rm -rf $HOME/', () => {
  assert.strictEqual(check('rm -rf $HOME/').action, 'block');
});

test('blocks rmdir /s /q C:\\', () => {
  assert.strictEqual(check('rmdir /s /q C:\\').action, 'block');
});

test('blocks format C:', () => {
  assert.strictEqual(check('format C:').action, 'block');
});

test('blocks sudo rm -rf /', () => {
  assert.strictEqual(check('sudo rm -rf /').action, 'block');
});

test('blocks rm -rf "$HOME" (quoted, no trailing slash)', () => {
  assert.strictEqual(check('rm -rf "$HOME"').action, 'block');
});

test('blocks rm -rf $HOME (no trailing slash, unquoted)', () => {
  assert.strictEqual(check('rm -rf $HOME').action, 'block');
});

test('warns on DEL /Q /S reversed order', () => {
  assert.strictEqual(check('DEL /Q /S foo').action, 'warn');
});

test('warns on DEL /S /Q uppercase', () => {
  assert.strictEqual(check('DEL /S /Q foo').action, 'warn');
});

test('warns on rm -r foo/', () => {
  assert.strictEqual(check('rm -r foo/').action, 'warn');
});

test('warns on rm -fr foo (recursive but not root)', () => {
  assert.strictEqual(check('rm -fr foo').action, 'warn');
});

test('asks before plain git push', () => {
  assert.strictEqual(check('git push origin main').action, 'ask');
});

test('asks before git push after a chain operator', () => {
  assert.strictEqual(check('cd /d/foo && git push origin main').action, 'ask');
});

test('asks before git push after a newline (cd || cd fallback then push)', () => {
  assert.strictEqual(check('cd /d/foo || cd "D:/foo"\ngit push origin main').action, 'ask');
});

test('asks before git push --force', () => {
  assert.strictEqual(check('git push --force origin main').action, 'ask');
});

test('asks before git push -f', () => {
  assert.strictEqual(check('git push -f origin main').action, 'ask');
});

test('does not prompt on git push named inside a commit message', () => {
  assert.strictEqual(check('git commit -m "how to git push safely"').action, 'pass');
});

test('does not prompt on "(git push)" named inside a commit message', () => {
  assert.strictEqual(check('git commit -m "run (git push) in a subshell"').action, 'pass');
});

test('warns on git reset --hard', () => {
  assert.strictEqual(check('git reset --hard HEAD').action, 'warn');
});

test('warns on git clean -fd', () => {
  assert.strictEqual(check('git clean -fd').action, 'warn');
});

test('warns on DROP TABLE', () => {
  assert.strictEqual(check('DROP TABLE users').action, 'warn');
});

test('warns on Remove-Item -Recurse -Force', () => {
  assert.strictEqual(check('Remove-Item -Recurse -Force foo').action, 'warn');
});

test('passes safe rm', () => {
  assert.strictEqual(check('rm foo.txt').action, 'pass');
});

test('passes git status', () => {
  assert.strictEqual(check('git status').action, 'pass');
});

test('passes ls -la', () => {
  assert.strictEqual(check('ls -la').action, 'pass');
});

test('emits a PreToolUse ask decision for git push', () => {
  const r = spawnSync('node', [TOOL], {
    input: JSON.stringify({ tool_input: { command: 'git push origin main' } }),
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
});
