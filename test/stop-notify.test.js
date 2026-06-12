'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { escPS, escAS } = require('../tools/stop-notify');

test('escPS escapes single quote', () => {
  assert.strictEqual(escPS("it's done"), "it''s done");
});

test('escPS leaves safe text alone', () => {
  assert.strictEqual(escPS('hello'), 'hello');
});

test('escPS escapes multiple quotes', () => {
  assert.strictEqual(escPS("'a'b'"), "''a''b''");
});

test('escPS coerces non-string', () => {
  assert.strictEqual(escPS(42), '42');
});

test('escAS escapes backslash', () => {
  assert.strictEqual(escAS('C:\\path'), 'C:\\\\path');
});

test('escAS escapes double quote', () => {
  assert.strictEqual(escAS('say "hi"'), 'say \\"hi\\"');
});

test('escAS escapes backslash before quote (order matters)', () => {
  assert.strictEqual(escAS('\\"'), '\\\\\\"');
});

test('escAS leaves safe text alone', () => {
  assert.strictEqual(escAS('hello'), 'hello');
});
