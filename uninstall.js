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
