'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoDir = __dirname;

// The resolution install.js applies, so the check reads the tree install writes.
function claudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// install.js copies one file out of each skill directory and nothing beside it.
function skillFile(dir, name) {
  return path.join(dir, 'skills', name, 'SKILL.md');
}

function installedSkillsDir() {
  return path.join(claudeDir(), 'skills');
}

// A directory with no skills/ has never been installed to, so it carries no stale copy.
function skillsAreInstalled() {
  return fs.existsSync(installedSkillsDir());
}

function shippedSkills() {
  const dir = path.join(repoDir, 'skills');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => fs.existsSync(skillFile(repoDir, name)));
}

function sameBytes(src, dest) {
  return fs.existsSync(dest) && fs.readFileSync(src).equals(fs.readFileSync(dest));
}

function divergedSkills(shipped = shippedSkills()) {
  if (!skillsAreInstalled()) return [];
  const installedDir = claudeDir();
  return shipped
    .filter(name => !sameBytes(skillFile(repoDir, name), skillFile(installedDir, name)))
    .map(name => `skills/${name}/SKILL.md`);
}

function divergenceReport(paths) {
  return [
    'The installed copy of each file below differs from this repository:', '',
    ...paths, '',
    'An agent reads the installed copy, so run `node install.js` to reconcile them.',
  ].join('\n');
}

if (require.main === module) {
  const shipped = shippedSkills();
  // Comparing none of them would report a match this checkout never made.
  if (!shipped.length) {
    process.stderr.write(
      `no SKILL.md found under ${path.join(repoDir, 'skills')}, which install.js copies\n`);
    process.exit(1);
  }
  const installedSkills = installedSkillsDir();
  if (!skillsAreInstalled()) {
    process.stdout.write(`${installedSkills} does not exist, so nothing was compared.\n`);
  } else {
    const diverged = divergedSkills(shipped);
    if (diverged.length) {
      process.stderr.write(divergenceReport(diverged) + '\n');
      process.exit(1);
    }
    process.stdout.write(
      `${shipped.length} skills match their copy under ${installedSkills}.\n`);
  }
}

module.exports = { divergedSkills, divergenceReport };
