'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gitCalls } = require('../tools/git-command');
const { commands } = require('../tools/shell-lex');

// The configured aliases are read once per process, so a case pinning them needs its own.
function callsWithConfig(config, command) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  try {
    const file = path.join(dir, 'gitconfig');
    fs.writeFileSync(file, config);
    const script = `process.stdout.write(JSON.stringify(require(${JSON.stringify(
      path.join(__dirname, '..', 'tools', 'git-command.js'))}).gitCalls(${JSON.stringify(command)})))`;
    const r = spawnSync(process.execPath, ['-e', script], {
      env: { ...process.env, GIT_CONFIG_GLOBAL: file }, encoding: 'utf8',
    });
    assert.strictEqual(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('reads the subcommand of a plain git call', () => {
  assert.deepStrictEqual(gitCalls('git push origin main'), [{ sub: 'push', args: ['origin', 'main'] }]);
});

test('skips a separated global option value', () => {
  assert.deepStrictEqual(gitCalls('git -C module/utility push'), [{ sub: 'push', args: [] }]);
});

test('skips an attached global option value', () => {
  assert.deepStrictEqual(gitCalls('git --git-dir=.git status'), [{ sub: 'status', args: [] }]);
});

test('skips several global options in a row', () => {
  assert.deepStrictEqual(gitCalls('git --no-pager -c user.name=x -C dir clean -fd'),
    [{ sub: 'clean', args: ['-fd'] }]);
});

test('reads a git call behind a transparent prefix', () => {
  assert.deepStrictEqual(gitCalls('sudo git push'), [{ sub: 'push', args: [] }]);
});

test('reads a git call behind an environment assignment', () => {
  assert.deepStrictEqual(gitCalls('GIT_SSH_COMMAND=ssh git push'), [{ sub: 'push', args: [] }]);
});

test('reads every git call in a chain', () => {
  assert.deepStrictEqual(gitCalls('git add . && git commit -m x'),
    [{ sub: 'add', args: ['.'] }, { sub: 'commit', args: ['-m', 'x'] }]);
});

test('ignores a git call named inside a quoted argument', () => {
  assert.deepStrictEqual(gitCalls('gh issue comment 84 -b "run git push first"'), []);
});

test('ignores a command whose name merely ends in git', () => {
  assert.deepStrictEqual(gitCalls('legit push'), []);
});

test('reports no call for git without a subcommand', () => {
  assert.deepStrictEqual(gitCalls('git --version'), []);
});

test('keeps a quoted option value as one argument', () => {
  assert.deepStrictEqual(gitCalls('git commit -m "two words"'),
    [{ sub: 'commit', args: ['-m', 'two words'] }]);
});

test('reads a git call invoked by an absolute path', () => {
  assert.deepStrictEqual(gitCalls('/usr/bin/git push origin main'), [{ sub: 'push', args: ['origin', 'main'] }]);
});

test('reads a git call invoked as git.exe', () => {
  assert.deepStrictEqual(gitCalls('git.exe push'), [{ sub: 'push', args: [] }]);
});

test('reads a git call whose quoted path carries a space', () => {
  assert.deepStrictEqual(gitCalls('"C:/Program Files/Git/bin/git.exe" push'), [{ sub: 'push', args: [] }]);
});

test('reads a git call invoked by a Windows path', () => {
  assert.deepStrictEqual(gitCalls('C:\\Tools\\git.exe status'), [{ sub: 'status', args: [] }]);
});

test('ignores a quoted string that merely names git', () => {
  assert.deepStrictEqual(gitCalls('echo "git push"'), []);
});

test('reads a git call inside bash -c', () => {
  assert.deepStrictEqual(gitCalls('bash -c "git push origin main"'), [{ sub: 'push', args: ['origin', 'main'] }]);
});

test('reads a git call inside sh -c with single quotes', () => {
  assert.deepStrictEqual(gitCalls("sh -c 'git -C module push'"), [{ sub: 'push', args: [] }]);
});

test('reads a git call inside powershell -Command', () => {
  assert.deepStrictEqual(gitCalls('powershell -Command "git push"'), [{ sub: 'push', args: [] }]);
});

test('reads a git call inside cmd /c', () => {
  assert.deepStrictEqual(gitCalls('cmd /c "git push"'), [{ sub: 'push', args: [] }]);
});

test('reads a git call a node -e string runs', () => {
  assert.deepStrictEqual(gitCalls(`node -e "require('child_process').execSync('git push')"`),
    [{ sub: 'push', args: [] }]);
});

test('reads a git call a python -c string runs', () => {
  assert.deepStrictEqual(gitCalls(`python -c "import os; os.system('git push origin main')"`),
    [{ sub: 'push', args: ['origin', 'main'] }]);
});

test('reads a git call inside a powershell -EncodedCommand payload', () => {
  const encoded = Buffer.from('git push origin main', 'utf16le').toString('base64');
  assert.deepStrictEqual(gitCalls(`powershell -EncodedCommand ${encoded}`),
    [{ sub: 'push', args: ['origin', 'main'] }]);
});

test('expands an alias defined on the command line', () => {
  assert.deepStrictEqual(gitCalls('git -c alias.p=push p origin main'),
    [{ sub: 'push', args: ['origin', 'main'] }]);
});

test('expands an alias whose value carries options', () => {
  assert.deepStrictEqual(gitCalls('git -c alias.pf="push --force" pf origin main'),
    [{ sub: 'push', args: ['--force', 'origin', 'main'] }]);
});

test('reads the command a shell alias runs', () => {
  assert.deepStrictEqual(gitCalls(`git -c alias.p='!git push origin main' p`),
    [{ sub: 'push', args: ['origin', 'main'] }]);
});

test('expands an alias configured in the global git config', () => {
  assert.deepStrictEqual(callsWithConfig('[alias]\n\tp = push\n', 'git p origin main'),
    [{ sub: 'push', args: ['origin', 'main'] }]);
});

test('expands a configured shell alias to the command it runs', () => {
  assert.deepStrictEqual(callsWithConfig('[alias]\n\tsync = "!git push --force"\n', 'git sync'),
    [{ sub: 'push', args: ['--force'] }]);
});

test('expands an alias whose value continues on the next line', () => {
  assert.deepStrictEqual(callsWithConfig('[alias]\n\tsync = "!git push \\\n\t--force"\n', 'git sync'),
    [{ sub: 'push', args: ['--force'] }]);
});

test('reads no alias out of an [alias "sub"] section header', () => {
  assert.deepStrictEqual(callsWithConfig('[alias "x"]\n\tp = push\n', 'git p'),
    [{ sub: 'p', args: [] }]);
});

test('leaves a subcommand no alias renames alone', () => {
  assert.deepStrictEqual(callsWithConfig('[alias]\n\tp = push\n', 'git status'),
    [{ sub: 'status', args: [] }]);
});

test('reads a command in a subshell as a command', () => {
  assert.deepStrictEqual(commands('(git push)').map(argv => argv.map(t => t.word)), [['git', 'push']]);
});

test('reads a command in a substitution as a command', () => {
  assert.deepStrictEqual(commands('out=$(git push)').map(argv => argv.map(t => t.word)),
    [['git', 'push']]);
});

test('stops descending into nested strings once the budget is spent', () => {
  const inner = Array.from({ length: 400 }, (_, i) => `'echo ${i}'`).join(' ');
  const calls = commands(`bash -c "node -e ${inner}"`);
  assert.ok(calls.length <= 128, `descended into ${calls.length} commands`);
  assert.strictEqual(calls[0][0].word, 'bash');
});

test('leaves a redirection target out of the argv', () => {
  assert.deepStrictEqual(commands('git log > out.txt').map(argv => argv.map(t => t.word)),
    [['git', 'log']]);
});
