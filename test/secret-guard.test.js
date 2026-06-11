'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { check } = require('../tools/secret-guard');

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
