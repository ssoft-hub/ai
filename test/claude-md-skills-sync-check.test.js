'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { listSkillDirs, listReferencedSkills, check } = require('../tools/claude-md-skills-sync-check');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-md-sync-'));
}
function rmTmp(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('listSkillDirs returns empty array for missing directory', () => {
  assert.deepStrictEqual(listSkillDirs(path.join(os.tmpdir(), 'does-not-exist-xyz')), []);
});

test('listSkillDirs finds only directories containing SKILL.md', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, 'has-skill'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'has-skill', 'SKILL.md'), 'x');
    fs.mkdirSync(path.join(tmp, 'no-skill'));
    assert.deepStrictEqual(listSkillDirs(tmp), ['has-skill']);
  } finally {
    rmTmp(tmp);
  }
});

test('listReferencedSkills extracts backtick-quoted names from Skills section', () => {
  const text = '# Title\n\n## Skills — auto-apply\n\nUse `foo` skill.\nUse `bar` skill.\n\n## Next section\n\n`ignored`\n';
  assert.deepStrictEqual(listReferencedSkills(text).sort(), ['bar', 'foo']);
});

test('listReferencedSkills returns empty array when no Skills section exists', () => {
  assert.deepStrictEqual(listReferencedSkills('# Title\n\nNo skills section here.\n'), []);
});

test('listReferencedSkills dedupes repeated names', () => {
  const text = '## Skills — auto-apply\n`foo` and `foo` again.\n';
  assert.deepStrictEqual(listReferencedSkills(text), ['foo']);
});

test('check returns missing skills not referenced in CLAUDE.md', () => {
  const tmp = mkTmp();
  try {
    const skillsDir = path.join(tmp, 'skills');
    fs.mkdirSync(path.join(skillsDir, 'foo'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'foo', 'SKILL.md'), 'x');
    fs.mkdirSync(path.join(skillsDir, 'bar'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'bar', 'SKILL.md'), 'x');
    fs.writeFileSync(path.join(tmp, 'CLAUDE.md'), '## Skills — auto-apply\nUse `foo` skill.\n');

    assert.deepStrictEqual(check(tmp).missing, ['bar']);
  } finally {
    rmTmp(tmp);
  }
});

test('check returns no missing skills when all are referenced', () => {
  const tmp = mkTmp();
  try {
    const skillsDir = path.join(tmp, 'skills');
    fs.mkdirSync(path.join(skillsDir, 'foo'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'foo', 'SKILL.md'), 'x');
    fs.writeFileSync(path.join(tmp, 'CLAUDE.md'), '## Skills — auto-apply\nUse `foo` skill.\n');

    assert.deepStrictEqual(check(tmp).missing, []);
  } finally {
    rmTmp(tmp);
  }
});

test('check returns no missing skills when CLAUDE.md is absent', () => {
  const tmp = mkTmp();
  try {
    assert.deepStrictEqual(check(tmp).missing, []);
  } finally {
    rmTmp(tmp);
  }
});
