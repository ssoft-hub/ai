'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

function listSkillDirs(skillsDir) {
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir).filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
}

function listReferencedSkills(claudeMdText) {
  const section = claudeMdText.split(/^##\s+Skills/m)[1];
  if (!section) return [];
  const body = section.split(/^##\s+/m)[0];
  const matches = body.match(/`([a-z0-9-]+)`/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

function check(claudeDir) {
  const skillsDir = path.join(claudeDir, 'skills');
  const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) return { missing: [] };

  const dirs = new Set(listSkillDirs(skillsDir));
  const referenced = new Set(listReferencedSkills(fs.readFileSync(claudeMdPath, 'utf8')));
  const missing = [...dirs].filter(name => !referenced.has(name)).sort();
  return { missing };
}

if (require.main === module) {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const { missing } = check(claudeDir);
  if (missing.length) {
    process.stdout.write(
      'claude-md-skills-sync-check warning — CLAUDE.md "Skills — auto-apply" section ' +
      `is missing: ${missing.join(', ')}\n` +
      'Add their trigger lines (see AGENTS.md "Adding a skill").\n'
    );
  }
  process.exit(0);
}

module.exports = { listSkillDirs, listReferencedSkills, check };
