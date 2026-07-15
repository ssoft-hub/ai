'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { isPlainCommentLine, addedCommentLines, extractEdits, check } = require('../tools/comment-check');

test('detects a leading // comment', () => {
  assert.strictEqual(isPlainCommentLine('// note'), true);
});

test('detects a trailing // comment after code', () => {
  assert.strictEqual(isPlainCommentLine('int x = 5; // meaning of x'), true);
});

test('ignores a URL containing //', () => {
  assert.strictEqual(isPlainCommentLine('const std::string url = "https://example.com";'), false);
});

test('excludes Doxygen /// comments', () => {
  assert.strictEqual(isPlainCommentLine('/// Brief description.'), false);
});

test('excludes Doxygen //! comments', () => {
  assert.strictEqual(isPlainCommentLine('//! Brief description.'), false);
});

test('excludes Doxygen /** block comments', () => {
  assert.strictEqual(isPlainCommentLine('/** Brief description.'), false);
});

test('detects a plain block comment opener', () => {
  assert.strictEqual(isPlainCommentLine('/* explanation */'), true);
});

test('detects a plain block comment closer', () => {
  assert.strictEqual(isPlainCommentLine(' * still explaining */'), true);
});

test('ignores a line with no comment', () => {
  assert.strictEqual(isPlainCommentLine('int x = 5;'), false);
});

test('addedCommentLines finds only lines new to newText', () => {
  const added = addedCommentLines('int x = 5;', 'int x = 5;\n// why 5\nint y = 6;');
  assert.deepStrictEqual(added, ['// why 5']);
});

test('addedCommentLines ignores a comment already present in oldText', () => {
  const added = addedCommentLines('// why 5\nint x = 5;', '// why 5\nint x = 6;');
  assert.deepStrictEqual(added, []);
});

test('extractEdits reads a single Edit old_string/new_string pair', () => {
  const edits = extractEdits({ old_string: 'a', new_string: 'b' });
  assert.deepStrictEqual(edits, [{ old: 'a', new: 'b' }]);
});

test('extractEdits reads MultiEdit edits array', () => {
  const edits = extractEdits({ edits: [{ old_string: 'a', new_string: 'b' }, { old_string: 'c', new_string: 'd' }] });
  assert.deepStrictEqual(edits, [{ old: 'a', new: 'b' }, { old: 'c', new: 'd' }]);
});

test('extractEdits returns empty array for Write (no prior content available)', () => {
  assert.deepStrictEqual(extractEdits({ content: 'whatever' }), []);
});

test('extractEdits returns empty array for null tool_input', () => {
  assert.deepStrictEqual(extractEdits(null), []);
});

test('check flags a new comment in a .cpp file', () => {
  const r = check({ old_string: 'int x = 5;', new_string: 'int x = 5; // why 5' }, 'foo.cpp');
  assert.deepStrictEqual(r.added, ['int x = 5; // why 5']);
});

test('check skips non-C++ files', () => {
  const r = check({ old_string: '', new_string: '// note' }, 'foo.js');
  assert.deepStrictEqual(r.added, []);
});

test('check skips when file_path is missing', () => {
  const r = check({ old_string: '', new_string: '// note' }, '');
  assert.deepStrictEqual(r.added, []);
});

test('check aggregates across MultiEdit edits', () => {
  const toolInput = { edits: [
    { old_string: 'a;', new_string: 'a; // one' },
    { old_string: 'b;', new_string: 'b; // two' },
  ] };
  const r = check(toolInput, 'foo.h');
  assert.deepStrictEqual(r.added, ['a; // one', 'b; // two']);
});
