'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_GIT = process.argv.includes('--no-git-hook');
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const repoDir = __dirname;
const manifestPath = path.join(claudeDir, '.claude-config-manifest.json');
const backupsDir = path.join(claudeDir, '.claude-config-backups');
const logPrefix = DRY_RUN ? '[dry]' : '    ';

function log(msg) { process.stdout.write(msg + '\n'); }
function warn(msg) { process.stderr.write('warn: ' + msg + '\n'); }

let manifest = { version: 1, installedAt: new Date().toISOString(), createdFiles: [], backups: [] };
if (fs.existsSync(manifestPath)) {
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch { warn(`existing manifest unreadable — overwriting: ${manifestPath}`); }
}

function isTracked(dest) {
  return manifest.createdFiles.includes(dest) || manifest.backups.some(b => b.dest === dest);
}

function backupPathFor(dest) {
  const ts = Date.now();
  return path.join(backupsDir, `${path.basename(dest)}.${ts}.bak`);
}

function backupBeforeWrite(dest) {
  if (isTracked(dest)) return;
  if (!fs.existsSync(dest)) {
    manifest.createdFiles.push(dest);
    return;
  }
  const bak = backupPathFor(dest);
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(bak), { recursive: true });
    fs.copyFileSync(dest, bak);
  }
  manifest.backups.push({ dest, backup: bak });
}

function copyFile(src, dest) {
  const wasMissing = !fs.existsSync(dest);
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  if (wasMissing && !isTracked(dest)) manifest.createdFiles.push(dest);
  log(`  ${logPrefix} ${path.relative(repoDir, src)} → ${dest}`);
}

function copyDir(srcDir, destDir, exclude = new Set()) {
  if (!fs.existsSync(srcDir)) { warn(`source not found: ${srcDir}`); return; }
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else copyFile(src, dest);
  }
}

function mergeUnique(existing, incoming) {
  return [...new Set([...existing, ...incoming])];
}

function mergeHookEvent(existing, incoming) {
  const existingCmds = new Set();
  for (const entry of existing)
    for (const h of (entry.hooks || []))
      if (h.command) existingCmds.add(h.command);

  const result = [...existing];
  let added = 0;
  for (const entry of incoming) {
    const newHooks = (entry.hooks || []).filter(h => !existingCmds.has(h.command));
    if (newHooks.length) { result.push({ ...entry, hooks: newHooks }); added += newHooks.length; }
  }
  return { result, added };
}

function mergeSettings(existing, repo) {
  const out = structuredClone(existing);
  const additions = {};

  if (repo.hooks) {
    out.hooks = out.hooks || {};
    for (const [ev, entries] of Object.entries(repo.hooks)) {
      const { result, added } = mergeHookEvent(out.hooks[ev] || [], entries);
      out.hooks[ev] = result;
      if (added) additions[ev] = added;
    }
  }

  if (repo.permissions) {
    out.permissions = out.permissions || {};
    for (const key of ['allow', 'ask', 'deny'])
      if (repo.permissions[key])
        out.permissions[key] = mergeUnique(out.permissions[key] || [], repo.permissions[key]);
  }

  return { out, additions };
}

function installSettings() {
  const src = path.join(repoDir, 'config', 'settings.json');
  if (!fs.existsSync(src)) { warn(`source not found: ${src}`); return; }
  const dest = path.join(claudeDir, 'settings.json');
  const repo = JSON.parse(fs.readFileSync(src, 'utf8'));

  backupBeforeWrite(dest);

  if (!fs.existsSync(dest)) {
    if (!DRY_RUN) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    log(`  ${logPrefix} config/settings.json → ${dest} (created)`);
    return;
  }
  let existing;
  try { existing = JSON.parse(fs.readFileSync(dest, 'utf8')); }
  catch { warn(`${dest} is not valid JSON — skipping merge`); return; }
  const { out: merged, additions } = mergeSettings(existing, repo);
  if (!DRY_RUN) fs.writeFileSync(dest, JSON.stringify(merged, null, 2) + '\n');
  log(`  ${logPrefix} config/settings.json → ${dest} (merged)`);
  for (const [ev, n] of Object.entries(additions))
    log(`      added ${n} hook${n === 1 ? '' : 's'} to ${ev}`);
}

function installCLAUDEmd() {
  const src = path.join(repoDir, 'config', 'CLAUDE.md');
  if (!fs.existsSync(src)) { warn(`source not found: ${src}`); return; }
  const dest = path.join(claudeDir, 'CLAUDE.md');
  backupBeforeWrite(dest);
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  log(`  ${logPrefix} config/CLAUDE.md → ${dest}`);
}

function installGitHook() {
  const preCommitSrc = path.join(repoDir, 'hooks', 'git', 'pre-commit');
  const gitDir = path.join(repoDir, '.git');
  if (!fs.existsSync(preCommitSrc) || !fs.existsSync(gitDir)) {
    warn('hooks/git/pre-commit not found or .git missing, skipping');
    return;
  }
  const dest = path.join(gitDir, 'hooks', 'pre-commit');
  backupBeforeWrite(dest);
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(preCommitSrc, dest);
    fs.chmodSync(dest, 0o755);
  }
  log(`  ${logPrefix} hooks/git/pre-commit → ${dest}`);
}

log(`Installing to: ${claudeDir}${DRY_RUN ? ' (dry run)' : ''}\n`);

log('hooks/');
copyDir(path.join(repoDir, 'hooks'), path.join(claudeDir, 'hooks'), new Set(['git']));

log('\ntools/');
copyDir(path.join(repoDir, 'tools'), path.join(claudeDir, 'tools'));

log('\nskills/');
const skillsDir = path.join(repoDir, 'skills');
if (!fs.existsSync(skillsDir)) {
  warn(`source not found: ${skillsDir}`);
} else {
  for (const name of fs.readdirSync(skillsDir)) {
    const skillFile = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    copyFile(skillFile, path.join(claudeDir, 'skills', name, 'SKILL.md'));
  }
}

log('\nsettings.json');
installSettings();

log('\nCLAUDE.md');
installCLAUDEmd();

if (!SKIP_GIT) {
  log('\ngit hooks');
  installGitHook();
}

if (!DRY_RUN) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
log(`\nManifest: ${manifestPath}`);
log('Done.');
