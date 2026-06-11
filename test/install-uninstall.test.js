'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoDir = path.resolve(__dirname, '..');
const installJs = path.join(repoDir, 'install.js');
const uninstallJs = path.join(repoDir, 'uninstall.js');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
}

function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function runInstall(dir, extraArgs = []) {
  const r = spawnSync('node', [installJs, '--no-git-hook', ...extraArgs], {
    cwd: repoDir,
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    encoding: 'utf8',
  });
  return r;
}

function runUninstall(dir, extraArgs = []) {
  const r = spawnSync('node', [uninstallJs, ...extraArgs], {
    cwd: repoDir,
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    encoding: 'utf8',
  });
  return r;
}

test('install creates files and manifest on empty dir', () => {
  const dir = mkTmp();
  try {
    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);
    assert.ok(fs.existsSync(path.join(dir, '.claude-config-manifest.json')));
    assert.ok(fs.existsSync(path.join(dir, 'hooks', 'PreToolUse.js')));
    assert.ok(fs.existsSync(path.join(dir, 'tools', 'bash-safety.js')));
    assert.ok(fs.existsSync(path.join(dir, 'skills', 'cpp-coding', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(dir, 'settings.json')));
    assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')));
  } finally { rmTmp(dir); }
});

test('uninstall removes everything when nothing was preexisting', () => {
  const dir = mkTmp();
  try {
    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);
    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    const remaining = fs.readdirSync(dir);
    assert.deepStrictEqual(remaining, [], `expected empty dir, got: ${remaining.join(', ')}`);
  } finally { rmTmp(dir); }
});

test('install+uninstall restores preexisting settings.json byte-for-byte', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    const original = {
      permissions: { allow: ['Bash(ls)'], deny: ['Bash(rm -rf /)'] },
      customField: 'preserved',
      hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'user-hook' }] }] },
    };
    const originalText = JSON.stringify(original, null, 2);
    fs.writeFileSync(settingsPath, originalText);

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(merged.permissions.allow.includes('Bash(ls)'), 'preserved user allow');
    assert.ok(merged.customField === 'preserved', 'preserved unknown field');
    assert.ok(merged.hooks.PreToolUse.length >= 2, 'merged hook entries');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);

    const restoredText = fs.readFileSync(settingsPath, 'utf8');
    assert.strictEqual(restoredText, originalText, 'settings.json restored byte-for-byte');
  } finally { rmTmp(dir); }
});

test('install merges hooks into a partial settings.json missing some events', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }, null, 2));

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(merged.hooks?.PreToolUse?.length >= 1, 'PreToolUse added');
    assert.ok(merged.hooks?.PostToolUse?.length >= 1, 'PostToolUse added');
    assert.ok(merged.hooks?.Stop?.length >= 1, 'Stop added');
    assert.ok(merged.hooks?.UserPromptSubmit?.length >= 1, 'UserPromptSubmit added');
    assert.ok(merged.permissions.allow.includes('Bash(ls)'), 'user allow preserved');
    assert.ok(merged.permissions.ask?.some(p => p.includes('git push')), 'repo ask permissions merged');
  } finally { rmTmp(dir); }
});

test('install+uninstall restores preexisting CLAUDE.md', () => {
  const dir = mkTmp();
  try {
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    const original = '# User CLAUDE.md\n\nCustom rules.\n';
    fs.writeFileSync(claudeMdPath, original);

    runInstall(dir);
    assert.notStrictEqual(fs.readFileSync(claudeMdPath, 'utf8'), original, 'install overwrites with backup');

    runUninstall(dir);
    assert.strictEqual(fs.readFileSync(claudeMdPath, 'utf8'), original, 'CLAUDE.md restored');
  } finally { rmTmp(dir); }
});

test('install preserves user defaultMode when repo settings has none', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ permissions: { defaultMode: 'acceptEdits' } }));

    runInstall(dir);
    const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.strictEqual(merged.permissions.defaultMode, 'acceptEdits', 'user defaultMode preserved');
  } finally { rmTmp(dir); }
});

test('reinstall does not double-backup', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    const original = JSON.stringify({ permissions: { allow: ['Bash(echo)'] } }, null, 2);
    fs.writeFileSync(settingsPath, original);

    runInstall(dir);
    runInstall(dir);

    const manifest = JSON.parse(fs.readFileSync(path.join(dir, '.claude-config-manifest.json'), 'utf8'));
    const settingsBackups = manifest.backups.filter(b => b.dest === settingsPath);
    assert.strictEqual(settingsBackups.length, 1, 'only one backup for settings.json across reinstalls');

    runUninstall(dir);
    assert.strictEqual(fs.readFileSync(settingsPath, 'utf8'), original, 'restored original after double install');
  } finally { rmTmp(dir); }
});

test('dry-run does not write files', () => {
  const dir = mkTmp();
  try {
    const r = runInstall(dir, ['--dry-run']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(path.join(dir, 'hooks', 'PreToolUse.js')));
    assert.ok(!fs.existsSync(path.join(dir, '.claude-config-manifest.json')));
  } finally { rmTmp(dir); }
});

test('uninstall on dir with no manifest is a no-op', () => {
  const dir = mkTmp();
  try {
    const r = runUninstall(dir);
    assert.strictEqual(r.status, 0);
    assert.deepStrictEqual(fs.readdirSync(dir), []);
  } finally { rmTmp(dir); }
});
