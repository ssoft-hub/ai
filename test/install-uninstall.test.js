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

test('install copies agents/ and commands/ when the repo ships them, skips gracefully otherwise', () => {
  const dir = mkTmp();
  const agentsDir = path.join(repoDir, 'agents');
  const commandsDir = path.join(repoDir, 'commands');
  const repoShipsAgents = fs.existsSync(agentsDir);
  const repoShipsCommands = fs.existsSync(commandsDir);
  try {
    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);
    assert.strictEqual(fs.existsSync(path.join(dir, 'agents')), repoShipsAgents);
    assert.strictEqual(fs.existsSync(path.join(dir, 'commands')), repoShipsCommands);
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

test('install+uninstall reverts a preexisting settings.json to its prior content', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    const original = {
      permissions: { allow: ['Bash(ls)'], deny: ['Bash(rm -rf /)'] },
      customField: 'preserved',
      hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'user-hook' }] }] },
    };
    fs.writeFileSync(settingsPath, JSON.stringify(original, null, 2));

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(merged.permissions.allow.includes('Bash(ls)'), 'preserved user allow');
    assert.ok(merged.customField === 'preserved', 'preserved unknown field');
    assert.ok(merged.hooks.PreToolUse.length >= 2, 'merged hook entries');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);

    // Reverting the merge yields the original content (the user's hook and
    // permissions remain; install's additions are gone).
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(settingsPath, 'utf8')), original);
  } finally { rmTmp(dir); }
});

test('uninstall preserves settings added by other tools after install', () => {
  const dir = mkTmp();
  try {
    const ri = runInstall(dir); // creates settings.json from scratch
    assert.strictEqual(ri.status, 0, ri.stderr);

    const settingsPath = path.join(dir, 'settings.json');
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    // A second tool extends the shared settings.json after our install.
    s.hooks.PreCompact = [{ hooks: [{ type: 'command', command: 'other-tool-hook' }] }];
    s.permissions.allow.push('Bash(othertool *)');
    s.mcpServers = { foo: { command: 'foo' } };
    fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);

    assert.ok(fs.existsSync(settingsPath), 'file kept because foreign settings remain');
    const after = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    // Foreign additions survive…
    assert.deepStrictEqual(after.hooks.PreCompact, s.hooks.PreCompact, 'foreign hook kept');
    assert.ok(after.permissions.allow.includes('Bash(othertool *)'), 'foreign permission kept');
    assert.deepStrictEqual(after.mcpServers, { foo: { command: 'foo' } }, 'foreign top-level key kept');
    // …while install's own hooks and permissions are removed.
    assert.ok(!after.hooks.PreToolUse, 'install PreToolUse removed');
    assert.ok(!after.permissions.allow.includes('Bash(*)'), 'install permission removed');
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

test('reinstall records settings additions once and uninstall reverts them', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    const original = { permissions: { allow: ['Bash(echo)'] } };
    fs.writeFileSync(settingsPath, JSON.stringify(original, null, 2));

    runInstall(dir);
    runInstall(dir);

    const manifest = JSON.parse(fs.readFileSync(path.join(dir, '.claude-config-manifest.json'), 'utf8'));
    assert.ok(manifest.settings, 'settings additions recorded');
    assert.strictEqual(manifest.settings.preexisted, true, 'earliest preexisted flag kept');
    assert.ok(!manifest.backups.some(b => b.dest === settingsPath), 'settings.json is not snapshot-backed-up');

    runUninstall(dir);
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(settingsPath, 'utf8')), original, 'reverted to original after double install');
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

test('upgrade prunes a file a previous install created but no longer ships', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    // A file shipped by an earlier version, still tracked in the manifest.
    const stale = path.join(dir, 'tools', 'obsolete.js');
    fs.writeFileSync(stale, '// removed upstream');
    const mpath = path.join(dir, '.claude-config-manifest.json');
    const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    m.createdFiles.push(stale);
    fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');

    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(stale), 'stale file removed on upgrade');
    const m2 = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    assert.ok(!m2.createdFiles.includes(stale), 'stale file dropped from manifest');
    assert.ok(fs.existsSync(path.join(dir, 'tools', 'bash-safety.js')), 'still-shipped file kept');
  } finally { rmTmp(dir); }
});

test('upgrade replaces a drifted hook command instead of duplicating it', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    const settingsPath = path.join(dir, 'settings.json');
    const mpath = path.join(dir, '.claude-config-manifest.json');

    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const currentCmd = s.hooks.PreToolUse[0].hooks[0].command;
    const oldCmd = 'node -e "OLD_LAUNCHER"';
    // Rewrite both the file and the manifest as if the previous install used oldCmd.
    s.hooks.PreToolUse = [{ hooks: [{ type: 'command', command: oldCmd }] }];
    fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');
    const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    m.settings.additions.hooks.PreToolUse = [oldCmd];
    fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');

    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);

    const after = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const cmds = after.hooks.PreToolUse.flatMap(e => e.hooks.map(h => h.command));
    assert.deepStrictEqual(cmds, [currentCmd], 'drifted command replaced, not duplicated');
  } finally { rmTmp(dir); }
});

test('reinstall does not duplicate hook entries', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    runInstall(dir);
    const s = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
    for (const [ev, entries] of Object.entries(s.hooks))
      assert.strictEqual(entries.length, 1, `${ev} has a single entry after reinstall`);
  } finally { rmTmp(dir); }
});

test('manifest records installedAt and updatedAt', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    const m = JSON.parse(fs.readFileSync(path.join(dir, '.claude-config-manifest.json'), 'utf8'));
    assert.ok(m.installedAt, 'installedAt recorded');
    assert.ok(m.updatedAt, 'updatedAt recorded');
  } finally { rmTmp(dir); }
});
