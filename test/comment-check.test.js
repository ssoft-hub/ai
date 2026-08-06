'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { syntaxFor, isPlainCommentLine, addedCommentLines, extractEdits, check } = require('../tools/comment-check');

const cFamily = syntaxFor('x.cpp');
const hash = syntaxFor('x.py');
const dash = syntaxFor('x.sql');
const semicolon = syntaxFor('x.ini');
const percent = syntaxFor('x.tex');
const markup = syntaxFor('x.html');

test('detects a leading // comment', () => {
  assert.strictEqual(isPlainCommentLine('// note', cFamily), true);
});

test('detects a trailing // comment after code', () => {
  assert.strictEqual(isPlainCommentLine('int x = 5; // meaning of x', cFamily), true);
});

test('ignores a URL containing //', () => {
  assert.strictEqual(isPlainCommentLine('const std::string url = "https://example.com";', cFamily), false);
});

test('excludes Doxygen /// comments', () => {
  assert.strictEqual(isPlainCommentLine('/// Brief description.', cFamily), false);
});

test('excludes Doxygen //! comments', () => {
  assert.strictEqual(isPlainCommentLine('//! Brief description.', cFamily), false);
});

test('excludes Doxygen /** block comments', () => {
  assert.strictEqual(isPlainCommentLine('/** Brief description.', cFamily), false);
});

test('detects a plain block comment opener', () => {
  assert.strictEqual(isPlainCommentLine('/* explanation */', cFamily), true);
});

test('detects a trailing block comment after code', () => {
  assert.strictEqual(isPlainCommentLine('int x = 5; /* meaning of x */', cFamily), true);
});

test('ignores a /* inside a glob string', () => {
  assert.strictEqual(isPlainCommentLine('const glob = "**/*.cpp";', cFamily), false);
});

test('detects a // comment beside a doc-like glob string', () => {
  assert.strictEqual(isPlainCommentLine('const glob = "/**/*.cpp"; // why this glob', cFamily), true);
});

test('detects a plain block comment closer', () => {
  assert.strictEqual(isPlainCommentLine(' * still explaining */', cFamily), true);
});

test('ignores a line with no comment', () => {
  assert.strictEqual(isPlainCommentLine('int x = 5;', cFamily), false);
});

test('detects a leading # comment', () => {
  assert.strictEqual(isPlainCommentLine('# note', hash), true);
});

test('detects a trailing # comment after code', () => {
  assert.strictEqual(isPlainCommentLine('x = 5  # why 5', hash), true);
});

test('ignores a # that opens a quoted colour literal', () => {
  assert.strictEqual(isPlainCommentLine('background: "#ffffff"', hash), false);
});

test('ignores a shebang line', () => {
  assert.strictEqual(isPlainCommentLine('#!/usr/bin/env python3', hash), false);
});

test('ignores a // in a language whose comments start with #', () => {
  assert.strictEqual(isPlainCommentLine('url = "https://example.com"  ', hash), false);
});

test('detects a -- comment', () => {
  assert.strictEqual(isPlainCommentLine('SELECT 1; -- why', dash), true);
});

test('ignores a decrement in a -- language', () => {
  assert.strictEqual(isPlainCommentLine('counter--;', dash), false);
});

test('detects a ; comment', () => {
  assert.strictEqual(isPlainCommentLine('key = value ; why', semicolon), true);
});

test('detects a % comment', () => {
  assert.strictEqual(isPlainCommentLine('% why this macro', percent), true);
});

test('ignores an escaped percent sign', () => {
  assert.strictEqual(isPlainCommentLine('50\\% of the width', percent), false);
});

test('detects an HTML comment', () => {
  assert.strictEqual(isPlainCommentLine('<!-- why this section -->', markup), true);
});

test('syntaxFor returns nothing for a file with no known comment syntax', () => {
  assert.strictEqual(syntaxFor('data.bin'), undefined);
});

test('syntaxFor leaves prose files to their own skills', () => {
  assert.strictEqual(syntaxFor('CHANGELOG.md'), undefined);
});

test('syntaxFor recognises a name without an extension', () => {
  assert.ok(syntaxFor('/repo/Dockerfile'));
});

test('syntaxFor recognises CMakeLists.txt while .txt alone stays unknown', () => {
  assert.ok(syntaxFor('/repo/CMakeLists.txt'));
  assert.strictEqual(syntaxFor('/repo/notes.txt'), undefined);
});

test('addedCommentLines finds only lines new to newText', () => {
  const added = addedCommentLines('int x = 5;', 'int x = 5;\n// why 5\nint y = 6;', cFamily);
  assert.deepStrictEqual(added, ['// why 5']);
});

test('addedCommentLines ignores a comment already present in oldText', () => {
  const added = addedCommentLines('// why 5\nint x = 5;', '// why 5\nint x = 6;', cFamily);
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

test('check flags a new comment in a .js file', () => {
  const r = check({ old_string: 'const x = 5;', new_string: 'const x = 5; // why 5' }, 'foo.js');
  assert.deepStrictEqual(r.added, ['const x = 5; // why 5']);
});

test('check flags a new comment in a .py file', () => {
  const r = check({ old_string: 'x = 5', new_string: 'x = 5  # why 5' }, 'foo.py');
  assert.deepStrictEqual(r.added, ['x = 5  # why 5']);
});

test('check skips a file with no known comment syntax', () => {
  const r = check({ old_string: '', new_string: '// note' }, 'foo.bin');
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

test('syntaxFor recognises a dotfile whose whole name is the extension', () => {
  assert.ok(syntaxFor('/repo/.gitignore'));
  assert.ok(syntaxFor('/repo/.editorconfig'));
});

test('syntaxFor recognises a build file whatever case it is written in', () => {
  for (const name of ['Makefile', 'makefile', 'Gemfile', 'Rakefile', '.gitattributes', '.dockerignore', '.env']) {
    assert.ok(syntaxFor(`/repo/${name}`), name);
  }
});
