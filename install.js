'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const repoDir = __dirname;

function log(msg) { process.stdout.write(msg + '\n'); }
function warn(msg) { process.stderr.write('warn: ' + msg + '\n'); }

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!DRY_RUN) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
  log(`  ${DRY_RUN ? '[dry]' : '    '} ${path.relative(repoDir, src)} → ${dest}`);
}

function copyDir(srcDir, destDir, exclude = new Set()) {
  if (!fs.existsSync(srcDir)) { warn(`source not found: ${srcDir}`); return; }
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      copyFile(src, dest);
    }
  }
}

function copySettings() {
  const src = path.join(repoDir, 'settings.json');
  const dest = path.join(claudeDir, 'settings.json');
  if (fs.existsSync(dest)) {
    warn(`${dest} already exists — skipping (merge manually or delete and re-run)`);
    return;
  }
  copyFile(src, dest);
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
copySettings();

log('\ngit hooks');
const preCommitSrc = path.join(repoDir, 'hooks', 'git', 'pre-commit');
const gitDir = path.join(repoDir, '.git');
if (fs.existsSync(preCommitSrc) && fs.existsSync(gitDir)) {
  const dest = path.join(gitDir, 'hooks', 'pre-commit');
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(preCommitSrc, dest);
    fs.chmodSync(dest, 0o755);
  }
  log(`  ${DRY_RUN ? '[dry]' : '    '} hooks/git/pre-commit → ${dest}`);
} else {
  warn('hooks/git/pre-commit not found or .git missing, skipping');
}

log('\nDone.');
