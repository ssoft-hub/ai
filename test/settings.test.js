'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  mergeSettings,
  additionsFromRepo,
  subtractAdditions,
  isEffectivelyEmpty,
} = require('../lib/settings');

const hookEntry = cmd => ({ hooks: [{ type: 'command', command: cmd }] });
const repo = cmds => ({ hooks: { PreToolUse: [hookEntry(cmds)] } });

test('mergeSettings adds repo hooks into an empty object', () => {
  const { out, additions } = mergeSettings({}, repo('CMD'));
  assert.strictEqual(out.hooks.PreToolUse.length, 1);
  assert.deepStrictEqual(additions.hooks.PreToolUse, ['CMD']);
});

test('mergeSettings does not re-add an existing command', () => {
  const existing = { hooks: { PreToolUse: [hookEntry('CMD')] } };
  const { out, additions } = mergeSettings(existing, repo('CMD'));
  assert.strictEqual(out.hooks.PreToolUse.length, 1, 'no duplicate entry');
  assert.deepStrictEqual(additions.hooks, {}, 'nothing recorded as added');
});

test('mergeSettings preserves foreign keys and permissions', () => {
  const existing = { customField: 1, permissions: { allow: ['Bash(ls)'] } };
  const { out } = mergeSettings(existing, { permissions: { allow: ['Read'] } });
  assert.strictEqual(out.customField, 1);
  assert.deepStrictEqual(out.permissions.allow, ['Bash(ls)', 'Read']);
});

test('mergeSettings records only newly added permission entries', () => {
  const existing = { permissions: { allow: ['Read'] } };
  const { additions } = mergeSettings(existing, { permissions: { allow: ['Read', 'Edit'] } });
  assert.deepStrictEqual(additions.permissions.allow, ['Edit']);
});

test('additionsFromRepo lists every repo command and permission', () => {
  const a = additionsFromRepo({ hooks: { PreToolUse: [hookEntry('CMD')] }, permissions: { ask: ['Bash(git push *)'] } });
  assert.deepStrictEqual(a.hooks.PreToolUse, ['CMD']);
  assert.deepStrictEqual(a.permissions.ask, ['Bash(git push *)']);
});

test('subtractAdditions removes recorded items and prunes empties', () => {
  const settings = { hooks: { PreToolUse: [hookEntry('CMD')] }, permissions: { allow: ['Read'] } };
  subtractAdditions(settings, { hooks: { PreToolUse: ['CMD'] }, permissions: { allow: ['Read'] } });
  assert.ok(!settings.hooks, 'emptied hooks object pruned');
  assert.ok(!settings.permissions, 'emptied permissions object pruned');
});

test('subtractAdditions keeps foreign entries alongside removed ones', () => {
  const settings = { hooks: { PreToolUse: [hookEntry('CMD'), hookEntry('USER')] } };
  subtractAdditions(settings, { hooks: { PreToolUse: ['CMD'] } });
  const cmds = settings.hooks.PreToolUse.flatMap(e => e.hooks.map(h => h.command));
  assert.deepStrictEqual(cmds, ['USER']);
});

test('strip-before-merge replaces a drifted command without duplicating', () => {
  // First install registers CMD_V1 and records it as an addition.
  const { out: v1, additions } = mergeSettings({}, repo('CMD_V1'));
  // Upgrade: the repo command changed to CMD_V2.
  const base = subtractAdditions(v1, additions);
  const { out: v2 } = mergeSettings(base, repo('CMD_V2'));
  const cmds = v2.hooks.PreToolUse.flatMap(e => e.hooks.map(h => h.command));
  assert.deepStrictEqual(cmds, ['CMD_V2'], 'old command dropped, new one present, no duplicate');
});

const statusLine = cmd => ({ type: 'command', command: cmd });

test('mergeSettings installs the repo statusLine and records the replaced one', () => {
  const existing = { statusLine: statusLine('PLUGIN') };
  const { out, additions } = mergeSettings(existing, { statusLine: statusLine('REPO') });
  assert.deepStrictEqual(out.statusLine, statusLine('REPO'));
  assert.deepStrictEqual(additions.replaced.statusLine, { had: true, prior: statusLine('PLUGIN') });
});

test('mergeSettings records that no statusLine was replaced', () => {
  const { additions } = mergeSettings({}, { statusLine: statusLine('REPO') });
  assert.deepStrictEqual(additions.replaced.statusLine, { had: false });
});

test('additionsFromRepo records the statusLine of a settings file created from scratch', () => {
  const a = additionsFromRepo({ statusLine: statusLine('REPO') });
  assert.deepStrictEqual(a.replaced.statusLine, { had: false });
});

test('subtractAdditions gives a replaced statusLine back', () => {
  const settings = { statusLine: statusLine('REPO') };
  subtractAdditions(settings, { replaced: { statusLine: { had: true, prior: statusLine('PLUGIN') } } });
  assert.deepStrictEqual(settings.statusLine, statusLine('PLUGIN'));
});

test('subtractAdditions drops a statusLine that install itself introduced', () => {
  const settings = { statusLine: statusLine('REPO') };
  subtractAdditions(settings, { replaced: { statusLine: { had: false } } });
  assert.ok(!('statusLine' in settings));
});

test('install then uninstall round-trips a statusLine the user already had', () => {
  const before = { statusLine: statusLine('PLUGIN') };
  const { out, additions } = mergeSettings(before, { statusLine: statusLine('REPO') });
  assert.deepStrictEqual(subtractAdditions(out, additions), before);
});

test('isEffectivelyEmpty is true for {} and a $schema-only object', () => {
  assert.strictEqual(isEffectivelyEmpty({}), true);
  assert.strictEqual(isEffectivelyEmpty({ $schema: 'x' }), true);
});

test('isEffectivelyEmpty is false when any real key remains', () => {
  assert.strictEqual(isEffectivelyEmpty({ $schema: 'x', permissions: {} }), false);
});
