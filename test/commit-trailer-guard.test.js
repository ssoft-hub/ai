'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { check } = require('../tools/commit-trailer-guard');

test('blocks Co-Authored-By trailer', () => {
  const r = check('git commit -m "feat: x\n\nCo-Authored-By: Bot <bot@example.com>"');
  assert.strictEqual(r.action, 'block');
  assert.strictEqual(r.name, 'Co-Authored-By');
});

test('blocks lowercase co-authored-by trailer', () => {
  const r = check('git commit -m "fix: y\n\nco-authored-by: Bot <bot@example.com>"');
  assert.strictEqual(r.action, 'block');
});

test('blocks Generated-by trailer', () => {
  const r = check('git commit -m "chore: z\n\nGenerated-by: Claude"');
  assert.strictEqual(r.action, 'block');
  assert.strictEqual(r.name, 'Generated-by');
});

test('blocks on git commit --amend', () => {
  const r = check('git commit --amend -m "fix\n\nCo-Authored-By: Bot <bot@example.com>"');
  assert.strictEqual(r.action, 'block');
});

test('passes normal commit message', () => {
  const r = check('git commit -m "feat: add widget"');
  assert.strictEqual(r.action, 'pass');
});

test('blocks a trailer behind git -C <dir> commit', () => {
  const r = check('git -C module/utility commit -m "fix: x\n\nCo-Authored-By: Bot <bot@example.com>"');
  assert.strictEqual(r.action, 'block');
});

test('blocks a trailer behind git -c <name>=<value> commit', () => {
  const r = check('git -c user.name=x commit -m "fix: x\n\nGenerated-by: Claude"');
  assert.strictEqual(r.action, 'block');
});

test('blocks a trailer behind git invoked by an absolute path', () => {
  const r = check('/usr/bin/git commit -m "fix: x\n\nCo-Authored-By: Bot <bot@example.com>"');
  assert.strictEqual(r.action, 'block');
});

test('blocks a trailer behind sudo git commit', () => {
  const r = check('sudo git commit -m "fix: x\n\nCo-Authored-By: Bot <bot@example.com>"');
  assert.strictEqual(r.action, 'block');
});

test("blocks a trailer on the line after a <<$'EOF' here-document", () => {
  const r = check(["cat <<$'EOF'", 'body', 'EOF',
    'git commit -m "x" -m "Co-Authored-By: A <a@b>"'].join('\n'));
  assert.strictEqual(r.action, 'block');
});

test('blocks a trailer on a commit run from inside arithmetic', () => {
  const r = check('echo $(( $(git commit -m "x" -m "Co-Authored-By: A <a@b>") ))');
  assert.strictEqual(r.action, 'block');
});

test('blocks a trailer on a commit in (( )) the shell rereads as subshells', () => {
  const r = check('((git commit -m "x" -m "Co-Authored-By: A <a@b>"); (:))');
  assert.strictEqual(r.action, 'block');
});

test('passes non-commit Bash command', () => {
  const r = check('echo "Co-Authored-By: Bot"');
  assert.strictEqual(r.action, 'pass');
});

test('passes git commit-tree (word boundary, not a commit subcommand match issue)', () => {
  const r = check('git commit -m "no trailers here"');
  assert.strictEqual(r.action, 'pass');
});
