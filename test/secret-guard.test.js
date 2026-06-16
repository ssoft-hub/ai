'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { check, extractContent } = require('../tools/secret-guard');

test('blocks RSA private key', () => {
  const r = check('-----BEGIN RSA PRIVATE KEY-----\nMII...\n-----END RSA PRIVATE KEY-----', 'key.pem');
  assert.strictEqual(r.action, 'block');
});

test('blocks OpenSSH private key', () => {
  const r = check('-----BEGIN OPENSSH PRIVATE KEY-----', 'id_rsa');
  assert.strictEqual(r.action, 'block');
});

test('blocks ED25519 private key', () => {
  assert.strictEqual(check('-----BEGIN ED25519 PRIVATE KEY-----', 'id_ed25519').action, 'block');
});

test('blocks DSA private key', () => {
  assert.strictEqual(check('-----BEGIN DSA PRIVATE KEY-----', 'id_dsa').action, 'block');
});

test('blocks PGP private key block', () => {
  assert.strictEqual(check('-----BEGIN PGP PRIVATE KEY BLOCK-----', 'secret.asc').action, 'block');
});

test('blocks AWS Access Key', () => {
  assert.strictEqual(check('AKIAIOSFODNN7EXAMPLE', 'config.js').action, 'block');
});

test('blocks GitHub PAT ghp_', () => {
  assert.strictEqual(check('token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789"', 'cfg').action, 'block');
});

test('blocks GitHub PAT ghs_', () => {
  assert.strictEqual(check('token = "ghs_abcdefghijklmnopqrstuvwxyz0123456789"', 'cfg').action, 'block');
});

test('blocks GitHub PAT ghu_ (user)', () => {
  assert.strictEqual(check('token = "ghu_abcdefghijklmnopqrstuvwxyz0123456789"', 'cfg').action, 'block');
});

test('blocks GitHub PAT gho_ (OAuth)', () => {
  assert.strictEqual(check('token = "gho_abcdefghijklmnopqrstuvwxyz0123456789"', 'cfg').action, 'block');
});

test('blocks GitHub PAT ghr_ (refresh)', () => {
  assert.strictEqual(check('token = "ghr_abcdefghijklmnopqrstuvwxyz0123456789"', 'cfg').action, 'block');
});

test('blocks GitHub fine-grained PAT', () => {
  const pat = 'github_pat_' + 'A'.repeat(82);
  assert.strictEqual(check(`token = "${pat}"`, 'cfg').action, 'block');
});

test('skips binary by extension', () => {
  assert.strictEqual(check('-----BEGIN RSA PRIVATE KEY-----', 'image.png').action, 'pass');
});

test('warns on api_key assignment', () => {
  const r = check('api_key = "abcdefghijklmnopqrstuvwxyz123"', 'cfg.js');
  assert.strictEqual(r.action, 'warn');
});

test('warns on Bearer token', () => {
  const r = check('Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456', 'cfg');
  assert.strictEqual(r.action, 'warn');
});

test('warns on JWT', () => {
  const jwt = 'eyJ' + 'A'.repeat(30) + '.' + 'B'.repeat(30) + '.' + 'C'.repeat(30);
  assert.strictEqual(check(`token=${jwt}`, 'cfg').action, 'warn');
});

test('passes empty content', () => {
  assert.strictEqual(check('', 'cfg').action, 'pass');
});

test('passes innocuous text', () => {
  assert.strictEqual(check('hello world', 'cfg').action, 'pass');
});

test('extractContent reads Edit/Write new_string', () => {
  assert.strictEqual(extractContent({ new_string: 'hello' }), 'hello');
});

test('extractContent reads NotebookEdit new_source', () => {
  assert.strictEqual(extractContent({ new_source: 'print(1)' }), 'print(1)');
});

test('extractContent reads Write content', () => {
  assert.strictEqual(extractContent({ content: 'hello' }), 'hello');
});

test('extractContent joins MultiEdit edits[].new_string', () => {
  const toolInput = { edits: [{ new_string: 'foo' }, { new_string: 'bar' }] };
  assert.strictEqual(extractContent(toolInput), 'foo\nbar');
});

test('extractContent tolerates missing new_string in an edit', () => {
  const toolInput = { edits: [{ old_string: 'x' }, { new_string: 'bar' }] };
  assert.strictEqual(extractContent(toolInput), '\nbar');
});

test('extractContent returns empty string for null/undefined tool_input', () => {
  assert.strictEqual(extractContent(null), '');
  assert.strictEqual(extractContent(undefined), '');
});

test('detects AWS key inside MultiEdit edits array', () => {
  const content = extractContent({ edits: [{ new_string: 'safe' }, { new_string: 'AKIAIOSFODNN7EXAMPLE' }] });
  assert.strictEqual(check(content, 'config.js').action, 'block');
});

test('detects private key inside NotebookEdit new_source', () => {
  const content = extractContent({ new_source: '-----BEGIN RSA PRIVATE KEY-----' });
  assert.strictEqual(check(content, 'notebook.ipynb').action, 'block');
});
