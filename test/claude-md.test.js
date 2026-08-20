'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  IMPORT_LINE, importsRules, removableLines, addImport, removeImport,
} = require('../lib/claude-md');

const FENCE = '```';
const TICK = '`';

test('importsRules finds the import on a line of its own', () => {
  assert.strictEqual(importsRules('# Mine\n\n' + IMPORT_LINE + '\n'), true);
});

test('importsRules finds the import on a re-indented line', () => {
  assert.strictEqual(importsRules('# Mine\n\n   ' + IMPORT_LINE + '\n'), true);
});

test('importsRules finds the import among the words of a line', () => {
  assert.strictEqual(importsRules('See ' + IMPORT_LINE + ' for the rules.\n'), true);
});

test('importsRules ignores the import inside a fenced block', () => {
  assert.strictEqual(
    importsRules('# Mine\n\n' + FENCE + '\n' + IMPORT_LINE + '\n' + FENCE + '\n'), false);
});

test('importsRules ignores the import inside an inline code span', () => {
  assert.strictEqual(importsRules('Add ' + TICK + IMPORT_LINE + TICK + ' by hand.\n'), false);
});

test('importsRules ignores the import inside a double-backtick span', () => {
  const span = TICK + TICK + IMPORT_LINE + TICK + TICK;
  assert.strictEqual(importsRules('Add ' + span + ' by hand.\n'), false);
});

test('importsRules does not read a longer path as the import', () => {
  assert.strictEqual(importsRules(IMPORT_LINE + '.bak\n'), false);
});

test('importsRules is false for a file that never mentions it', () => {
  assert.strictEqual(importsRules('# Mine\n\nMy rules.\n'), false);
});

test('removableLines takes a line that is nothing but the import', () => {
  assert.deepStrictEqual(removableLines('# Mine\n' + IMPORT_LINE + '\n'), [1]);
});

test('removableLines leaves a line carrying the import among other words', () => {
  assert.deepStrictEqual(removableLines('See ' + IMPORT_LINE + ' for the rules.\n'), []);
});

test('removableLines leaves the import inside a list item', () => {
  assert.deepStrictEqual(removableLines('- ' + IMPORT_LINE + '\n'), []);
});

test('removableLines leaves the import inside a fenced block', () => {
  assert.deepStrictEqual(
    removableLines(FENCE + '\n' + IMPORT_LINE + '\n' + FENCE + '\n'), []);
});

// The round trip is the contract: whatever shape the file was in, taking the import back
// out has to leave exactly the bytes it started with.
for (const [shape, original] of [
  ['a file ending in one newline', '# Mine\n\nMy rules.\n'],
  ['a file ending in several blank lines', '# Mine\n\nMy rules.\n\n\n'],
  ['a file with no trailing newline', '# Mine\n\nMy rules.'],
  ['a one-line file', '# Mine\n'],
]) {
  test('addImport then removeImport restores ' + shape + ' byte for byte', () => {
    const { text, added } = addImport(original);
    assert.ok(importsRules(text), 'the import is there once added');
    assert.strictEqual(removeImport(text, added), original);
  });
}

test('addImport on an empty file writes the import line alone', () => {
  const { text, added } = addImport('');
  assert.strictEqual(text, IMPORT_LINE + '\n');
  assert.strictEqual(removeImport(text, added), '');
});

test('removeImport keeps the newline ending the last line the user wrote', () => {
  const tidied = '# Mine\n\nMy rules.\n' + IMPORT_LINE + '\n';
  assert.strictEqual(removeImport(tidied, { separator: true }), '# Mine\n\nMy rules.\n');
});

test('removeImport takes only the import line when the user moved it', () => {
  const moved = '# Mine\n\n' + IMPORT_LINE + '\n\nMy rules.\n';
  assert.strictEqual(removeImport(moved, { separator: true }), "# Mine\n\n\nMy rules.\n");
});

test('removeImport reports nothing to remove when the user reworded the line', () => {
  const reworded = '# Mine\n\nSee ' + IMPORT_LINE + ' for the rules.\n';
  assert.strictEqual(removeImport(reworded, { separator: true }), null);
});

test('removeImport reports nothing to remove when the import sits in a fence', () => {
  const fenced = '# Mine\n\n' + FENCE + '\n' + IMPORT_LINE + '\n' + FENCE + '\n';
  assert.strictEqual(removeImport(fenced, { separator: true }), null);
});
