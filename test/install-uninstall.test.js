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

const RULES_FILE = 'claude-config-rules.md';
const IMPORT_LINE = '@' + RULES_FILE;

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
}

function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

const shippedHooks = () => JSON.parse(
  fs.readFileSync(path.join(repoDir, 'config', 'settings.json'), 'utf8')).hooks;

function runInstall(dir, extraArgs = []) {
  const r = spawnSync('node', [installJs, ...extraArgs], {
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

test('install deploys the spec-architect persona agent', () => {
  const dir = mkTmp();
  try {
    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);
    assert.ok(fs.existsSync(path.join(dir, 'agents', 'spec-architect.md')));
  } finally { rmTmp(dir); }
});

test('install deploys the ship command', () => {
  const dir = mkTmp();
  try {
    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);
    assert.ok(fs.existsSync(path.join(dir, 'commands', 'ship.md')));
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

test('install registers the statusline command and ships its tool', () => {
  const dir = mkTmp();
  try {
    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(dir, 'tools', 'statusline.js')));
    const s = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
    assert.match(s.statusLine.command, /statusline\.js/);
  } finally { rmTmp(dir); }
});

test('install+uninstall gives back a statusLine another tool had registered', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    const original = { statusLine: { type: 'command', command: 'other-tool-statusline' } };
    fs.writeFileSync(settingsPath, JSON.stringify(original, null, 2));

    runInstall(dir);
    const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.match(merged.statusLine.command, /statusline\.js/, 'repo statusLine takes over');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
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

test('install records hook commands a settings.json already carries', () => {
  const dir = mkTmp();
  try {
    const hooks = shippedHooks();
    fs.writeFileSync(path.join(dir, 'settings.json'),
      JSON.stringify({ hooks, permissions: { defaultMode: 'acceptEdits' } }, null, 2));

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const m = JSON.parse(fs.readFileSync(path.join(dir, '.claude-config-manifest.json'), 'utf8'));
    assert.deepStrictEqual(
      Object.keys(m.settings.additions.hooks).sort(), Object.keys(hooks).sort());
  } finally { rmTmp(dir); }
});

test('uninstall removes hook commands install found already in settings.json', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(
      { hooks: shippedHooks(), permissions: { defaultMode: 'acceptEdits' } }, null, 2));

    runInstall(dir);
    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);

    const after = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(!after.hooks, `hooks left behind: ${Object.keys(after.hooks || {}).join(', ')}`);
  } finally { rmTmp(dir); }
});

test('install claiming a hook command already in settings.json leaves one entry', () => {
  const dir = mkTmp();
  try {
    const settingsPath = path.join(dir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ hooks: shippedHooks() }, null, 2));

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const merged = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    for (const [ev, entries] of Object.entries(merged.hooks))
      assert.strictEqual(entries.length, 1, `${ev} duplicated`);
  } finally { rmTmp(dir); }
});

test('install re-claims live hook commands its manifest records as unowned', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    const mpath = path.join(dir, '.claude-config-manifest.json');
    const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    // A manifest owning none of the hook commands the settings file carries.
    m.settings.additions.hooks = {};
    fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');

    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);

    const m2 = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    assert.deepStrictEqual(
      Object.keys(m2.settings.additions.hooks).sort(), Object.keys(shippedHooks()).sort());
  } finally { rmTmp(dir); }
});

// `<config dir>/CLAUDE.md` is the user's own file, so install adds one import line and
// leaves the rest, the way it merges settings.json rather than replacing it.
test('install adds one import line to a preexisting CLAUDE.md and keeps the rest', () => {
  const dir = mkTmp();
  try {
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    const original = '# User CLAUDE.md\n\nCustom rules.\n';
    fs.writeFileSync(claudeMdPath, original);

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const after = fs.readFileSync(claudeMdPath, 'utf8');
    assert.ok(after.startsWith(original),
      `the user's own rules must survive install verbatim, got: ${JSON.stringify(after)}`);
    assert.ok(after.includes(IMPORT_LINE), 'install adds the import line');
    assert.ok(fs.existsSync(path.join(dir, RULES_FILE)), 'install owns the rules file');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    assert.strictEqual(fs.readFileSync(claudeMdPath, 'utf8'), original,
      'uninstall gives the file back byte for byte');
  } finally { rmTmp(dir); }
});

// The install that replaced CLAUDE.md recorded the user's file as a backup. Upgrading has
// to hand it back before adding the import line, or the later restore pass would put the
// snapshot over the edit and the user would keep our copy for one more install.
test('install hands back a CLAUDE.md an older install had replaced', () => {
  const dir = mkTmp();
  try {
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    const original = '# User rules\n\nMine.\n';
    const backupsDir = path.join(dir, '.claude-config-backups');
    const backup = path.join(backupsDir, 'CLAUDE.md.old.bak');
    fs.mkdirSync(backupsDir, { recursive: true });
    fs.writeFileSync(backup, original);
    fs.writeFileSync(claudeMdPath, '# the copy an older install shipped\n');
    fs.writeFileSync(path.join(dir, '.claude-config-manifest.json'), JSON.stringify({
      version: 1, installedAt: 'old', createdFiles: [],
      backups: [{ dest: claudeMdPath, backup }],
    }, null, 2) + '\n');

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const after = fs.readFileSync(claudeMdPath, 'utf8');
    assert.ok(after.startsWith(original), `user content handed back, got: ${JSON.stringify(after)}`);
    assert.ok(after.includes(IMPORT_LINE), 'and the import line added');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    assert.strictEqual(fs.readFileSync(claudeMdPath, 'utf8'), original,
      'uninstall leaves the user with exactly what they started with');
  } finally { rmTmp(dir); }
});

// The other upgrade shape: an older install found no CLAUDE.md and created one, so the
// file on disk is install's own copy rather than the user's and nothing is handed back.
test('install replaces a CLAUDE.md an older install had created with the import line', () => {
  const dir = mkTmp();
  try {
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# the copy an older install shipped\n\nRules we used to inline.\n');
    fs.writeFileSync(path.join(dir, '.claude-config-manifest.json'), JSON.stringify({
      version: 1, installedAt: 'old', createdFiles: [claudeMdPath], backups: [],
    }, null, 2) + '\n');

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);
    assert.strictEqual(fs.readFileSync(claudeMdPath, 'utf8').trim(), IMPORT_LINE,
      "install's own former copy is not kept as if it were the user's writing");

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    assert.ok(!fs.existsSync(claudeMdPath), 'and the file goes again, since install owns it');
  } finally { rmTmp(dir); }
});

test('install warns and keeps CLAUDE.md when the recorded backup has gone', () => {
  const dir = mkTmp();
  try {
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    const onDisk = '# whatever is there now\n';
    fs.writeFileSync(claudeMdPath, onDisk);
    fs.writeFileSync(path.join(dir, '.claude-config-manifest.json'), JSON.stringify({
      version: 1, installedAt: 'old', createdFiles: [],
      backups: [{ dest: claudeMdPath, backup: path.join(dir, '.claude-config-backups', 'gone.bak') }],
    }, null, 2) + '\n');

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);
    assert.match(ri.stderr, /backup missing/, 'the lost backup is reported, not passed over');
    const after = fs.readFileSync(claudeMdPath, 'utf8');
    assert.ok(after.startsWith(onDisk), 'nothing is invented in place of the lost backup');
    assert.ok(after.includes(IMPORT_LINE), 'and the import line still lands');
  } finally { rmTmp(dir); }
});

test('installing twice leaves one import line in CLAUDE.md', () => {
  const dir = mkTmp();
  try {
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Mine\n');
    assert.strictEqual(runInstall(dir).status, 0);
    assert.strictEqual(runInstall(dir).status, 0);
    const lines = fs.readFileSync(claudeMdPath, 'utf8')
      .split('\n').filter(l => l.includes(IMPORT_LINE));
    assert.strictEqual(lines.length, 1, 'the second install must not add a duplicate');
  } finally { rmTmp(dir); }
});

test('uninstall deletes the rules file and keeps a CLAUDE.md install did not create', () => {
  const dir = mkTmp();
  try {
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Mine\n');
    assert.strictEqual(runInstall(dir).status, 0);
    assert.strictEqual(runUninstall(dir).status, 0);
    assert.ok(!fs.existsSync(path.join(dir, RULES_FILE)), 'the rules file goes');
    assert.strictEqual(fs.readFileSync(claudeMdPath, 'utf8'), '# Mine\n',
      "the user's CLAUDE.md stays, holding exactly what it held before");
  } finally { rmTmp(dir); }
});

test('install creates CLAUDE.md holding the import line alone, and uninstall removes it', () => {
  const dir = mkTmp();
  try {
    const claudeMdPath = path.join(dir, 'CLAUDE.md');
    assert.strictEqual(runInstall(dir).status, 0);
    assert.strictEqual(fs.readFileSync(claudeMdPath, 'utf8').trim(), IMPORT_LINE,
      'a CLAUDE.md install created carries nothing else');
    assert.strictEqual(runUninstall(dir).status, 0);
    assert.ok(!fs.existsSync(claudeMdPath), 'a file install created is removed again');
  } finally { rmTmp(dir); }
});

test('install+uninstall restores a preexisting tools/ file', () => {
  const dir = mkTmp();
  try {
    const toolPath = path.join(dir, 'tools', 'bash-safety.js');
    const original = "// the user's own bash-safety tool\n";
    fs.mkdirSync(path.dirname(toolPath), { recursive: true });
    fs.writeFileSync(toolPath, original);

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);
    assert.notStrictEqual(fs.readFileSync(toolPath, 'utf8'), original, 'install overwrites with backup');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    assert.strictEqual(fs.readFileSync(toolPath, 'utf8'), original, 'tools/ file restored');
  } finally { rmTmp(dir); }
});

test('install+uninstall restores a preexisting empty file', () => {
  const dir = mkTmp();
  try {
    const toolPath = path.join(dir, 'tools', 'bash-safety.js');
    fs.mkdirSync(path.dirname(toolPath), { recursive: true });
    fs.writeFileSync(toolPath, '');

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);
    assert.notStrictEqual(fs.readFileSync(toolPath, 'utf8'), '', 'install overwrites with backup');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    assert.strictEqual(fs.readFileSync(toolPath, 'utf8'), '', 'empty file restored');
  } finally { rmTmp(dir); }
});

test('install+uninstall restores every preexisting skill file to its own content', () => {
  const dir = mkTmp();
  try {
    // Every skill file is named SKILL.md, so their backups collide on basename alone.
    const originals = new Map();
    for (const name of fs.readdirSync(path.join(repoDir, 'skills'))) {
      const file = path.join(dir, 'skills', name, 'SKILL.md');
      originals.set(file, `# the user's own ${name} skill\n`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, originals.get(file));
    }

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);
    const [firstFile, firstContent] = [...originals][0];
    assert.notStrictEqual(fs.readFileSync(firstFile, 'utf8'), firstContent, 'install overwrites with backup');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    for (const [file, content] of originals)
      assert.strictEqual(fs.readFileSync(file, 'utf8'), content, `${file} restored`);
  } finally { rmTmp(dir); }
});

test('install records a backup holding the pre-install content of a file it overwrote', () => {
  const dir = mkTmp();
  try {
    const toolPath = path.join(dir, 'tools', 'secret-guard.js');
    const original = "// the user's own secret-guard tool\n";
    fs.mkdirSync(path.dirname(toolPath), { recursive: true });
    fs.writeFileSync(toolPath, original);

    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const m = JSON.parse(fs.readFileSync(path.join(dir, '.claude-config-manifest.json'), 'utf8'));
    const record = m.backups.find(b => b.dest === toolPath);
    assert.ok(record, 'manifest names a backup for the overwritten path');
    assert.strictEqual(fs.readFileSync(record.backup, 'utf8'), original, 'backup holds the pre-install content');
  } finally { rmTmp(dir); }
});

test('a second install takes no further backup of a path it already owns', () => {
  const dir = mkTmp();
  try {
    const toolPath = path.join(dir, 'tools', 'bash-safety.js');
    const original = "// the user's own bash-safety tool\n";
    fs.mkdirSync(path.dirname(toolPath), { recursive: true });
    fs.writeFileSync(toolPath, original);

    runInstall(dir);
    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);

    const m = JSON.parse(fs.readFileSync(path.join(dir, '.claude-config-manifest.json'), 'utf8'));
    const records = m.backups.filter(b => b.dest === toolPath);
    assert.strictEqual(records.length, 1, 'a single backup entry after two installs');
    assert.strictEqual(fs.readFileSync(records[0].backup, 'utf8'), original, 'the first backup still holds the pre-install content');
  } finally { rmTmp(dir); }
});

test('a file install created is recorded as created, backed up by nothing, and removed by uninstall', () => {
  const dir = mkTmp();
  try {
    const created = path.join(dir, 'tools', 'bash-safety.js');
    const ri = runInstall(dir);
    assert.strictEqual(ri.status, 0, ri.stderr);

    const m = JSON.parse(fs.readFileSync(path.join(dir, '.claude-config-manifest.json'), 'utf8'));
    assert.ok(m.createdFiles.includes(created), 'recorded in createdFiles');
    assert.ok(!m.backups.some(b => b.dest === created), 'no backup entry');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    assert.ok(!fs.existsSync(created), 'removed by uninstall');
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

test('dry-run takes no backup of a file it would overwrite', () => {
  const dir = mkTmp();
  try {
    const toolPath = path.join(dir, 'tools', 'bash-safety.js');
    const original = "// the user's own bash-safety tool\n";
    fs.mkdirSync(path.dirname(toolPath), { recursive: true });
    fs.writeFileSync(toolPath, original);

    const r = runInstall(dir, ['--dry-run']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(fs.readFileSync(toolPath, 'utf8'), original, 'file left untouched');
    assert.ok(!fs.existsSync(path.join(dir, '.claude-config-backups')), 'no backup written');
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

test('upgrade removes a skill directory the repo renamed away from', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    // A skill installed under its previous name, still tracked in the manifest.
    const oldSkill = path.join(dir, 'skills', 'api-design', 'SKILL.md');
    fs.mkdirSync(path.dirname(oldSkill), { recursive: true });
    fs.writeFileSync(oldSkill, '# renamed upstream');
    const mpath = path.join(dir, '.claude-config-manifest.json');
    const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    m.createdFiles.push(oldSkill);
    fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');

    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(path.dirname(oldSkill)), 'old skill directory removed, not just its file');
    assert.ok(fs.existsSync(path.join(dir, 'skills', 'cpp-api-design', 'SKILL.md')), 'new name installed');
  } finally { rmTmp(dir); }
});

test('upgrade restores a retired path install overwrote instead of leaving it live', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    // A file the user owned before install overwrote it: the manifest carries a
    // backup rather than a createdFiles entry, and the repo no longer ships it.
    const retired = path.join(dir, 'skills', 'doxygen', 'SKILL.md');
    const backup = path.join(dir, '.claude-config-backups', 'SKILL.md.1.bak');
    const userContent = '# the user\'s own doxygen skill\n';
    fs.mkdirSync(path.dirname(retired), { recursive: true });
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(retired, '# shipped by an earlier version\n');
    fs.writeFileSync(backup, userContent);
    const mpath = path.join(dir, '.claude-config-manifest.json');
    const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    m.backups.push({ dest: retired, backup });
    fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');

    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(fs.readFileSync(retired, 'utf8'), userContent, 'pre-install content restored');
    assert.ok(!fs.existsSync(backup), 'backup consumed');
    const m2 = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    assert.ok(!m2.backups.some(b => b.dest === retired), 'backup record dropped');
  } finally { rmTmp(dir); }
});

test('upgrade releases a retired path whose backup file is gone, keeping uninstall usable', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    // The backup install took has since been deleted, so the pre-install content
    // cannot be put back and the record can only wedge a later uninstall.
    const retired = path.join(dir, 'skills', 'doxygen', 'SKILL.md');
    const backup = path.join(dir, '.claude-config-backups', 'SKILL.md.gone.bak');
    const onDisk = '# shipped by an earlier version\n';
    fs.mkdirSync(path.dirname(retired), { recursive: true });
    fs.writeFileSync(retired, onDisk);
    const mpath = path.join(dir, '.claude-config-manifest.json');
    const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    m.backups.push({ dest: retired, backup });
    fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');

    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stderr, /backup missing/, 'the unrestorable path is named');
    assert.strictEqual(fs.readFileSync(retired, 'utf8'), onDisk, 'file left as it is');
    const m2 = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    assert.ok(!m2.backups.some(b => b.dest === retired), 'unrestorable record dropped');

    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, `uninstall must not fail over a released path: ${ru.stderr}`);
  } finally { rmTmp(dir); }
});

test('install warns about a retired path it does not own and leaves the file alone', () => {
  const dir = mkTmp();
  try {
    // No manifest entry for it: install cannot tell a leftover from a file the
    // user wrote, so it names the path instead of deleting it.
    const stray = path.join(dir, 'skills', 'encapsulation', 'SKILL.md');
    fs.mkdirSync(path.dirname(stray), { recursive: true });
    fs.writeFileSync(stray, '# untracked\n');

    const r = runInstall(dir);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(stray), 'untracked file kept');
    assert.match(r.stderr, /skills[\\/]encapsulation[\\/]SKILL\.md was retired upstream/);
  } finally { rmTmp(dir); }
});

test('uninstall after a rename upgrade leaves the directory empty', () => {
  const dir = mkTmp();
  try {
    runInstall(dir);
    const oldSkill = path.join(dir, 'skills', 'api-design', 'SKILL.md');
    fs.mkdirSync(path.dirname(oldSkill), { recursive: true });
    fs.writeFileSync(oldSkill, '# renamed upstream');
    const mpath = path.join(dir, '.claude-config-manifest.json');
    const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    m.createdFiles.push(oldSkill);
    fs.writeFileSync(mpath, JSON.stringify(m, null, 2) + '\n');

    runInstall(dir);
    const ru = runUninstall(dir);
    assert.strictEqual(ru.status, 0, ru.stderr);
    const remaining = fs.readdirSync(dir);
    assert.deepStrictEqual(remaining, [], `expected empty dir, got: ${remaining.join(', ')}`);
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
