'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { commandIn, writePathIn, backgroundIn } = require('../tools/payload');
const { routeFor, BY_NAME, COMMAND_GUARDS, WRITE_GUARDS } = require('../hooks/PreToolUse');
const { writeTargetOf, startedInBackground } = require('../hooks/PostToolUse');

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
  ['Bash', { command: 'npm test', run_in_background: true }],
  ['PowerShell', { command: 'npm test', run_in_background: false }],
  ['Bash', { command: 'npm test', run_in_background: 'true' }],
  ['mcp__shell__exec', { command: 'sleep 30', run_in_background: true }],
  ['Agent', { prompt: 'do it', run_in_background: true }],
  ['PatchFile', { file_path: ['a.cpp'], content: 'x' }],
  ['PatchFile', { file_path: 7, content: 'x' }],
  ['Edit', { file_path: { toString: () => 'a.cpp' } }],
  ['RunAndPatch', { command: 'echo x', file_path: ['a.cpp'], content: 'x' }],
  ['Edit', { file_path: 'a.cpp', new_string: 'x', command: 'rm -rf /' }],
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

test('backgroundIn reads the field marking a call as run in the background', () => {
  assert.strictEqual(backgroundIn({ command: 'npm test', run_in_background: true }), true);
});

test('backgroundIn returns false for a payload naming no background run', () => {
  assert.strictEqual(backgroundIn({ command: 'npm test' }), false);
  assert.strictEqual(backgroundIn({ run_in_background: false }), false);
  assert.strictEqual(backgroundIn({ run_in_background: 'true' }), false);
  assert.strictEqual(backgroundIn(undefined), false);
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

// The guards behind it hand the path to `path.extname`, which throws on anything else.
test('writePathIn returns nothing for a target that is not a string', () => {
  assert.strictEqual(writePathIn({ file_path: ['a.cpp'], content: 'x' }, 'PatchFile'), '');
  assert.strictEqual(writePathIn({ file_path: 7, content: 'x' }, 'PatchFile'), '');
  assert.strictEqual(writePathIn({ file_path: { toString: () => 'a.cpp' } }, 'Edit'), '');
});

test('writePathIn reads a write target that arrives beside a command', () => {
  assert.strictEqual(writePathIn({ command: 'echo x', file_path: 'a.cpp', content: 'x' }, 'RunAndPatch'), 'a.cpp');
});

test('the dispatcher routes every payload shape the way the payload rule reads it', () => {
  for (const [toolName, input] of PAYLOADS) {
    const expected = [
      ...(BY_NAME[toolName] ?? []),
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

test('the after-the-fact dispatcher reads a background payload the way the payload rule does', () => {
  for (const [toolName, input] of PAYLOADS) {
    assert.strictEqual(startedInBackground(input), backgroundIn(input),
      `disagreed on ${toolName} ${JSON.stringify(input)}`);
  }
});

test('a background call reaches no guard before it runs', () => {
  assert.deepStrictEqual(routeFor({ prompt: 'do it', run_in_background: true }, 'Agent'), []);
  assert.deepStrictEqual(routeFor({ command: 'npm test', run_in_background: true }, 'Bash'), COMMAND_GUARDS);
});

test('an agent call naming no background run reaches no guard', () => {
  assert.deepStrictEqual(routeFor({ prompt: 'do it' }, 'Agent'), []);
});

test('the name map covers every tool whose payload alone would not say what it does', () => {
  assert.deepStrictEqual(routeFor({ file_path: 'a.cpp' }, 'Edit'), WRITE_GUARDS);
  assert.deepStrictEqual(routeFor({ file_path: 'a.cpp' }, 'PatchFile'), []);
});

// The name map adds to what the payload says rather than standing in for it.
test('a named edit tool carrying a command reaches both sets of guards', () => {
  const routed = routeFor({ file_path: 'a.cpp', new_string: 'x', command: 'rm -rf /' }, 'Edit');
  for (const guard of [...COMMAND_GUARDS, ...WRITE_GUARDS]) {
    assert.ok(routed.includes(guard), `${guard} was not routed`);
  }
  assert.strictEqual(routed.length, new Set(routed).size);
});
