'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mergeSettings, additionsFromRepo, subtractAdditions } = require('./lib/settings');

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

// Every dest path written this run, so upgrade can prune files a previous
// install created but the current repo no longer ships.
const written = new Set();

function isTracked(dest) {
  return manifest.createdFiles.includes(dest) || manifest.backups.some(b => b.dest === dest);
}

function isInside(p, stopAt) {
  const rel = path.relative(stopAt, p);
  return rel.length > 0 && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function pruneEmptyDirs(start, stopAt) {
  if (DRY_RUN) return;
  let dir = start;
  while (isInside(dir, stopAt) && fs.existsSync(dir)) {
    try {
      if (fs.readdirSync(dir).length) break;
      fs.rmdirSync(dir);
    } catch { break; }
    dir = path.dirname(dir);
  }
}

// Files sharing a basename (every skill is a SKILL.md) are backed up within one millisecond.
let backupSeq = 0;

function backupPathFor(dest) {
  let bak;
  do { bak = path.join(backupsDir, `${path.basename(dest)}.${Date.now()}-${backupSeq++}.bak`); }
  while (fs.existsSync(bak));
  return bak;
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
  backupBeforeWrite(dest);
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  written.add(dest);
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

// Record what install currently owns in settings.json. Because installSettings
// strips the previous install's additions before re-merging, `additions` always
// describes current ownership exactly — so this replaces, never accumulates.
function recordSettings(dest, preexisted, additions) {
  manifest.settings = { dest, preexisted, additions };
}

function installSettings() {
  const src = path.join(repoDir, 'config', 'settings.json');
  if (!fs.existsSync(src)) { warn(`source not found: ${src}`); return; }
  const dest = path.join(claudeDir, 'settings.json');
  const repo = JSON.parse(fs.readFileSync(src, 'utf8'));
  written.add(dest);

  // settings.json is merged, not snapshot-replaced: uninstall reverts by
  // subtracting exactly what was added, so no backup is taken here.
  const prior = manifest.settings?.dest === dest ? manifest.settings : null;

  if (!fs.existsSync(dest)) {
    if (!DRY_RUN) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    recordSettings(dest, prior ? prior.preexisted : false, additionsFromRepo(repo));
    log(`  ${logPrefix} config/settings.json → ${dest} (created)`);
    return;
  }

  let existing;
  try { existing = JSON.parse(fs.readFileSync(dest, 'utf8')); }
  catch { warn(`${dest} is not valid JSON — skipping merge`); return; }

  // On upgrade, strip what the previous install added before re-merging the
  // current repo settings. This drops entries that drifted (e.g. a changed hook
  // command) or were removed upstream, instead of leaving stale duplicates.
  const base = prior ? subtractAdditions(existing, prior.additions) : existing;
  const { out: merged, additions } = mergeSettings(base, repo);
  if (!DRY_RUN) fs.writeFileSync(dest, JSON.stringify(merged, null, 2) + '\n');
  recordSettings(dest, prior ? prior.preexisted : true, additions);
  log(`  ${logPrefix} config/settings.json → ${dest} (merged)`);
  for (const [ev, cmds] of Object.entries(additions.hooks))
    log(`      registered ${cmds.length} hook${cmds.length === 1 ? '' : 's'} for ${ev}`);
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
  written.add(dest);
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

// agents/ and commands/ are optional — unlike hooks/tools/skills, a fresh
// checkout of this repo may not carry any yet, so absence isn't warned on.
log('\nagents/');
const agentsDir = path.join(repoDir, 'agents');
if (fs.existsSync(agentsDir)) copyDir(agentsDir, path.join(claudeDir, 'agents'));
else log(`  ${logPrefix} (none)`);

log('\ncommands/');
const commandsDir = path.join(repoDir, 'commands');
if (fs.existsSync(commandsDir)) copyDir(commandsDir, path.join(claudeDir, 'commands'));
else log(`  ${logPrefix} (none)`);

log('\nsettings.json');
installSettings();

log('\nCLAUDE.md');
installCLAUDEmd();

if (!SKIP_GIT) {
  log('\ngit hooks');
  installGitHook();
}

// A rename only reaches a machine whose manifest still names the old path. Warn about
// the ones it doesn't own so a lost manifest doesn't leave a skill live under both
// names — an untracked file may be the user's own, so it is never deleted here.
function warnRetiredPaths() {
  const src = path.join(repoDir, 'config', 'retired.json');
  if (!fs.existsSync(src)) return;
  let retired;
  try { retired = JSON.parse(fs.readFileSync(src, 'utf8')).retired; }
  catch { warn(`${src} is not valid JSON — skipping retired-path check`); return; }
  if (!Array.isArray(retired)) return;
  let found = 0;
  for (const rel of retired) {
    const dest = path.join(claudeDir, rel);
    if (!fs.existsSync(dest) || isTracked(dest)) continue;
    found++;
    warn(`${dest} was retired upstream and install does not own it — `
      + 'remove it by hand if it is a leftover from an older install');
  }
  log(`  ${logPrefix} ${found ? `${found} left for manual removal` : '(none)'}`);
}

// Upgrade hygiene: remove files a previous install created under claudeDir that
// the current repo no longer ships (renamed/deleted hooks, tools, skills).
// Scoped to claudeDir so the git pre-commit hook (outside it) is never touched.
log('\nretired paths install does not own:');
warnRetiredPaths();

log('\npruning files no longer shipped:');
const orphans = manifest.createdFiles.filter(
  f => isInside(f, claudeDir) && !written.has(f) && fs.existsSync(f),
);
for (const f of orphans) {
  if (!DRY_RUN) fs.unlinkSync(f);
  log(`  ${logPrefix} removed ${f}`);
}

// A path install overwrote rather than created is given back to the content it had
// before, instead of being left live: uninstall would otherwise be the only step that
// ever restores it, and until then the retired name keeps loading.
const orphanBackups = manifest.backups.filter(
  b => isInside(b.dest, claudeDir) && !written.has(b.dest),
);
for (const { dest, backup } of orphanBackups) {
  if (fs.existsSync(backup)) {
    if (!DRY_RUN) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(backup, dest);
      fs.unlinkSync(backup);
    }
    log(`  ${logPrefix} restored ${dest} ← ${backup} (no longer shipped)`);
  } else {
    // Nothing left to restore from, so the record goes rather than staying: uninstall
    // treats a missing backup as a hard failure and keeps the manifest for a retry that
    // can never succeed, which would wedge every later uninstall over one path this
    // repo no longer ships. The file itself may carry edits, so it is left alone.
    warn(`backup missing: ${backup} — ${dest} is no longer tracked and stays as it is; `
      + 'remove it by hand if it is a leftover from an older install');
  }
}
// Both outcomes end install's ownership of the path, so every record drops either way.
if (orphanBackups.length) {
  const released = new Set(orphanBackups.map(b => b.dest));
  manifest.backups = manifest.backups.filter(b => !released.has(b.dest));
}

if (orphans.length) {
  const orphanSet = new Set(orphans);
  manifest.createdFiles = manifest.createdFiles.filter(f => !orphanSet.has(f));
  for (const dir of new Set(orphans.map(f => path.dirname(f)))) pruneEmptyDirs(dir, claudeDir);
} else if (!orphanBackups.length) {
  log(`  ${logPrefix} (none)`);
}

manifest.updatedAt = new Date().toISOString();
if (!DRY_RUN) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
log(`\nManifest: ${manifestPath}`);
log('Done.');
