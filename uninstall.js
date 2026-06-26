'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const manifestPath = path.join(claudeDir, '.claude-config-manifest.json');
const backupsDir = path.join(claudeDir, '.claude-config-backups');

function log(msg) { process.stdout.write(msg + '\n'); }
function warn(msg) { process.stderr.write('warn: ' + msg + '\n'); }

if (!fs.existsSync(manifestPath)) {
  warn(`no manifest at ${manifestPath} — nothing to uninstall`);
  process.exit(0);
}

let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
catch (e) { warn(`manifest unreadable: ${e.message}`); process.exit(1); }

log(`Uninstalling using manifest from ${manifest.installedAt}${DRY_RUN ? ' (dry run)' : ''}\n`);

log('removing files created by install:');
for (const f of manifest.createdFiles) {
  if (!fs.existsSync(f)) continue;
  if (!DRY_RUN) fs.unlinkSync(f);
  log(`  ${DRY_RUN ? '[dry]' : '    '} removed ${f}`);
}

// Revert the merge install performed on settings.json by subtracting exactly the
// items it added (recorded in manifest.settings). Unlike a snapshot restore, this
// preserves any settings other tools or the user added after install.
function revertSettings(record) {
  const { dest, preexisted, additions } = record;
  if (!fs.existsSync(dest)) { log(`  ${DRY_RUN ? '[dry]' : '    '} ${dest} already absent`); return; }

  let cur;
  try { cur = JSON.parse(fs.readFileSync(dest, 'utf8')); }
  catch { warn(`${dest} is not valid JSON — leaving as-is`); return; }

  for (const [ev, cmds] of Object.entries(additions.hooks || {})) {
    if (!cur.hooks?.[ev]) continue;
    const rm = new Set(cmds);
    cur.hooks[ev] = cur.hooks[ev]
      .map(entry => ({ ...entry, hooks: (entry.hooks || []).filter(h => !rm.has(h.command)) }))
      .filter(entry => (entry.hooks || []).length > 0);
    if (cur.hooks[ev].length === 0) delete cur.hooks[ev];
  }
  if (cur.hooks && Object.keys(cur.hooks).length === 0) delete cur.hooks;

  for (const [key, vals] of Object.entries(additions.permissions || {})) {
    if (!cur.permissions?.[key]) continue;
    const rm = new Set(vals);
    cur.permissions[key] = cur.permissions[key].filter(p => !rm.has(p));
    if (cur.permissions[key].length === 0) delete cur.permissions[key];
  }
  if (cur.permissions && Object.keys(cur.permissions).length === 0) delete cur.permissions;

  // Delete only a file install itself created that has nothing left but $schema;
  // a preexisting file (or one carrying foreign keys) is always rewritten, never removed.
  const meaningful = Object.keys(cur).filter(k => k !== '$schema');
  if (meaningful.length === 0 && !preexisted) {
    if (!DRY_RUN) fs.unlinkSync(dest);
    log(`  ${DRY_RUN ? '[dry]' : '    '} removed ${dest}`);
  } else {
    if (!DRY_RUN) fs.writeFileSync(dest, JSON.stringify(cur, null, 2) + '\n');
    log(`  ${DRY_RUN ? '[dry]' : '    '} reverted additions in ${dest}`);
  }
}

if (manifest.settings) {
  log('\nreverting settings.json additions:');
  revertSettings(manifest.settings);
}

log('\nrestoring backups:');
let restoreFailed = false;
for (const { dest, backup } of manifest.backups) {
  if (!fs.existsSync(backup)) {
    warn(`backup missing: ${backup} — cannot restore ${dest}`);
    restoreFailed = true;
    continue;
  }
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(backup, dest);
    fs.unlinkSync(backup);
  }
  log(`  ${DRY_RUN ? '[dry]' : '    '} restored ${dest} ← ${backup}`);
}

function isInside(dir, stopAt) {
  const rel = path.relative(stopAt, dir);
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

log('\ncleaning empty dirs:');
const dirsToClean = new Set(manifest.createdFiles.map(f => path.dirname(f)));
for (const dir of dirsToClean) pruneEmptyDirs(dir, claudeDir);

if (fs.existsSync(backupsDir)) {
  try {
    if (!fs.readdirSync(backupsDir).length && !DRY_RUN) fs.rmdirSync(backupsDir);
  } catch {}
}

if (restoreFailed) {
  warn(`one or more backups missing — manifest kept at ${manifestPath} for retry`);
  process.exit(1);
}

if (!DRY_RUN) fs.unlinkSync(manifestPath);
log(`\nremoved manifest: ${manifestPath}`);
log('Done.');
