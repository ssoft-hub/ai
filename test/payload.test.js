'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { commandIn, writePathIn } = require('../tools/payload');
const { routeFor, BY_NAME, COMMAND_GUARDS, WRITE_GUARDS } = require('../hooks/PreToolUse');
const { writeTargetOf } = require('../hooks/PostToolUse');

const PAYLOADS = [
  ['Bash', { command: 'git push' }],
  ['Zsh', { command: '   ' }],
  ['Bash', { command: ['git', 'push'] }],
  ['PatchFile', { file_path: 'a.cpp', content: 'x' }],
  ['PatchFile', { path: 'a.cpp', new_string: 'x' }],
  ['PatchFile', { notebook_path: 'a.ipynb', new_source: 'x' }],
  ['PatchFile', { file_path: 'a.cpp', edits: [] }],
  ['Edit', { file_path: 'a.cpp' }],
  ['Read', { file_path: 'a.cpp' }],
  ['RunAndPatch', { command: 'echo x', file_path: 'a.cpp', content: 'x' }],
  ['PatchFile', { path: 'a.cpp', notebook_path: 'a.ipynb', content: 'x' }],
  ['PatchFile', { notebook_path: 'a.ipynb', path: 'a.cpp', new_source: 'x' }],
  ['Unknown', {}],
  ['Unknown', undefined],
];

test('commandIn returns the command a payload carries', () => {
  assert.strictEqual(commandIn({ command: 'git push' }), 'git push');
});

test('commandIn returns nothing for a blank or non-string command', () => {
  assert.strictEqual(commandIn({ command: '   ' }), '');
  assert.strictEqual(commandIn({ command: ['git', 'push'] }), '');
  assert.strictEqual(commandIn(undefined), '');
});

test('writePathIn takes a path arriving with the content written to it', () => {
  assert.strictEqual(writePathIn({ file_path: 'a.cpp', content: 'x' }, 'PatchFile'), 'a.cpp');
  assert.strictEqual(writePathIn({ path: 'a.cpp', new_string: 'x' }, 'PatchFile'), 'a.cpp');
  assert.strictEqual(writePathIn({ notebook_path: 'a.ipynb', new_source: 'x' }, 'PatchFile'), 'a.ipynb');
  assert.strictEqual(writePathIn({ file_path: 'a.cpp', edits: [] }, 'PatchFile'), 'a.cpp');
});

test('writePathIn takes a bare path from a known edit tool', () => {
  assert.strictEqual(writePathIn({ file_path: 'a.cpp' }, 'Edit'), 'a.cpp');
});

test('writePathIn returns nothing for a bare path from any other tool', () => {
  assert.strictEqual(writePathIn({ file_path: 'a.cpp' }, 'Read'), '');
  assert.strictEqual(writePathIn({ content: 'x' }, 'PatchFile'), '');
  assert.strictEqual(writePathIn(undefined, 'Read'), '');
});

test('writePathIn reads a write target that arrives beside a command', () => {
  assert.strictEqual(writePathIn({ command: 'echo x', file_path: 'a.cpp', content: 'x' }, 'RunAndPatch'), 'a.cpp');
});

test('the dispatcher routes every payload shape the way the payload rule reads it', () => {
  for (const [toolName, input] of PAYLOADS) {
    const expected = BY_NAME[toolName] ?? [
      ...(commandIn(input) ? COMMAND_GUARDS : []),
      ...(writePathIn(input, toolName) ? WRITE_GUARDS : []),
    ].filter((guard, i, all) => all.indexOf(guard) === i);
    assert.deepStrictEqual(routeFor(input, toolName), expected,
      `disagreed on ${toolName} ${JSON.stringify(input)}`);
  }
});

test('both dispatchers read a write payload the same way', () => {
  for (const [toolName, input] of PAYLOADS) {
    assert.strictEqual(writeTargetOf(input, toolName), writePathIn(input, toolName),
      `disagreed on ${toolName} ${JSON.stringify(input)}`);
  }
});

test('the name map covers every tool whose payload alone would not say what it does', () => {
  assert.deepStrictEqual(routeFor({ file_path: 'a.cpp' }, 'Edit'), WRITE_GUARDS);
  assert.deepStrictEqual(routeFor({ file_path: 'a.cpp' }, 'PatchFile'), []);
});
