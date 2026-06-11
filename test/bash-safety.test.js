'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { check } = require('../tools/bash-safety');

test('blocks rm -rf /', () => {
  assert.strictEqual(check('rm -rf /').action, 'block');
});

test('blocks rm -fr / (flag-order bypass closed)', () => {
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

test('warns on git push --force', () => {
  const r = check('git push --force origin main');
  assert.strictEqual(r.action, 'warn');
  assert.ok(r.warnings.some(w => /--force/.test(w.msg)));
});

test('warns on git push -f', () => {
  assert.strictEqual(check('git push -f origin main').action, 'warn');
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
