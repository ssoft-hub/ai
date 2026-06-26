'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DISPATCHER = path.join(__dirname, '..', 'hooks', 'PostToolUse.js');

// Build a temp CLAUDE_CONFIG_DIR whose lint tools are stubs that echo their
// argv. This lets the test assert *which* tools the dispatcher invoked and with
// what config path, without depending on real clang-format / cppcheck binaries.
function makeStubConfigDir() {
  const cfgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-cfg-'));
  const toolsDir = path.join(cfgDir, 'tools');
  fs.mkdirSync(toolsDir);
  for (const name of ['clang-format.js', 'clang-tidy.js', 'cppcheck.js']) {
    fs.writeFileSync(
      path.join(toolsDir, name),
      `process.stdout.write('INVOKED ${name} ' + (process.argv[3] || '') + '\\n');\n`,
    );
  }
  return cfgDir;
}

// A temp directory marked as a git repo root (an empty .git file is enough —
// the dispatcher only existsSync()-checks it).
function makeRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-repo-'));
  fs.writeFileSync(path.join(repo, '.git'), '');
  return repo;
}

function runDispatcher(cfgDir, filePath) {
  const r = spawnSync('node', [DISPATCHER], {
    input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: filePath } }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfgDir },
  });
  return r.stdout || '';
}

function cleanup(...dirs) {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
}

test('no config files in repo → no lint tool is invoked', () => {
  const cfgDir = makeStubConfigDir();
  const repo = makeRepo();
  try {
    const out = runDispatcher(cfgDir, path.join(repo, 'x.cpp'));
    assert.strictEqual(out.trim(), '');
  } finally {
    cleanup(cfgDir, repo);
  }
});

test('.cppcheck present → cppcheck runs with its path; others skipped', () => {
  const cfgDir = makeStubConfigDir();
  const repo = makeRepo();
  const cppcheckCfg = path.join(repo, '.cppcheck');
  fs.writeFileSync(cppcheckCfg, '');
  try {
    const out = runDispatcher(cfgDir, path.join(repo, 'x.cpp'));
    assert.match(out, /INVOKED cppcheck\.js/);
    assert.match(out, /\.cppcheck/);
    assert.doesNotMatch(out, /INVOKED clang-format\.js/);
    assert.doesNotMatch(out, /INVOKED clang-tidy\.js/);
  } finally {
    cleanup(cfgDir, repo);
  }
});

test('config at repo root is found from a subdirectory file', () => {
  const cfgDir = makeStubConfigDir();
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, '.clang-format'), '');
  const sub = path.join(repo, 'src', 'core');
  fs.mkdirSync(sub, { recursive: true });
  try {
    const out = runDispatcher(cfgDir, path.join(sub, 'x.cpp'));
    assert.match(out, /INVOKED clang-format\.js/);
    assert.doesNotMatch(out, /INVOKED cppcheck\.js/);
  } finally {
    cleanup(cfgDir, repo);
  }
});

test('config above the repo boundary (parent repo) is not used', () => {
  const cfgDir = makeStubConfigDir();
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-parent-'));
  fs.writeFileSync(path.join(parent, '.clang-format'), ''); // lives outside the repo
  const repo = path.join(parent, 'repo');
  fs.mkdirSync(repo);
  fs.writeFileSync(path.join(repo, '.git'), ''); // boundary stops here
  try {
    const out = runDispatcher(cfgDir, path.join(repo, 'x.cpp'));
    assert.strictEqual(out.trim(), '');
  } finally {
    cleanup(cfgDir, parent);
  }
});
