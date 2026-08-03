'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { trigger, buildSkillList, buildContext } = require('../tools/skills-reminder');
const { loadCatalog } = require('../tools/skill-catalog');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skills-reminder-'));
}
function rmTmp(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function writeSkill(skillsDir, name, description, metadata = '') {
  const dir = path.join(skillsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n${metadata}---\nbody\n`);
}

test('trigger strips leading "Apply when"', () => {
  assert.strictEqual(trigger('Apply when writing tests'), 'writing tests');
});

test('trigger leaves text without "Apply when" unchanged', () => {
  assert.strictEqual(trigger('Short description'), 'Short description');
});

test('trigger keeps a long description whole', () => {
  const long = 'Apply when ' + 'word '.repeat(30).trim();
  assert.strictEqual(trigger(long), 'word '.repeat(30).trim());
});

test('buildSkillList returns empty array for missing directory', () => {
  assert.deepStrictEqual(buildSkillList(path.join(os.tmpdir(), 'does-not-exist-xyz')), []);
});

test('buildSkillList includes every skill directory with a SKILL.md', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'Apply when doing alpha things');
    writeSkill(tmp, 'beta', 'Apply when doing beta things');
    const list = buildSkillList(tmp);
    assert.strictEqual(list.length, 2);
    assert.ok(list.some(e => e.startsWith('alpha ')));
    assert.ok(list.some(e => e.startsWith('beta ')));
  } finally {
    rmTmp(tmp);
  }
});

test('buildSkillList skips directories without SKILL.md', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, 'no-skill-here'));
    writeSkill(tmp, 'real', 'Apply when real');
    assert.deepStrictEqual(buildSkillList(tmp), ['real [domain]: real']);
  } finally {
    rmTmp(tmp);
  }
});

test('buildSkillList skips SKILL.md without a description field', () => {
  const tmp = mkTmp();
  try {
    const dir = path.join(tmp, 'broken');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: broken\n---\nbody\n');
    assert.deepStrictEqual(buildSkillList(tmp), []);
  } finally {
    rmTmp(tmp);
  }
});

test('buildSkillList leaves out a skill that opts out with reminder: false', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'intent-only', 'Apply when intent says so');
    writeSkill(tmp, 'file-bound', 'Apply when editing a hook',
      'metadata:\n  paths: ["**/hooks/*.js"]\n  reminder: false\n');
    assert.deepStrictEqual(buildSkillList(tmp), ['intent-only [domain]: intent says so']);
  } finally {
    rmTmp(tmp);
  }
});

test('buildSkillList keeps a path-triggered skill whose intent is wider than its files', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'api-design', 'Apply when designing an API', 'metadata:\n  paths: ["**/*.h"]\n');
    assert.deepStrictEqual(buildSkillList(tmp), ['api-design [domain]: designing an API']);
  } finally {
    rmTmp(tmp);
  }
});

test('buildSkillList orders process before domain before narrow', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'aaa-narrow', 'Apply when narrow', 'metadata:\n  tier: narrow\n');
    writeSkill(tmp, 'bbb-process', 'Apply when process', 'metadata:\n  tier: process\n');
    writeSkill(tmp, 'ccc-domain', 'Apply when domain', 'metadata:\n  tier: domain\n');
    assert.deepStrictEqual(buildSkillList(tmp).map(e => e.split(' ')[0]),
      ['bbb-process', 'ccc-domain', 'aaa-narrow']);
  } finally {
    rmTmp(tmp);
  }
});

test('buildContext returns null when no skills found', () => {
  assert.strictEqual(buildContext(path.join(os.tmpdir(), 'does-not-exist-xyz')), null);
});

test('buildContext lists one skill per line under the header', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'Apply when doing alpha things');
    writeSkill(tmp, 'beta', 'Apply when doing beta things');
    const ctx = buildContext(tmp);
    assert.ok(ctx.startsWith('SKILLS'));
    assert.ok(ctx.includes('\n- alpha [domain]: doing alpha things'));
    assert.ok(ctx.includes('\n- beta [domain]: doing beta things'));
  } finally {
    rmTmp(tmp);
  }
});

test('buildContext header names the Skill tool as the way to apply a skill', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'Apply when doing alpha things');
    assert.ok(buildContext(tmp).includes('Skill tool'));
  } finally {
    rmTmp(tmp);
  }
});

test('buildSkillList covers every skill in this repo that has not opted out', () => {
  const realSkillsDir = path.join(__dirname, '..', 'skills');
  const intentOnly = loadCatalog(realSkillsDir).filter(s => s.reminder);
  const list = buildSkillList(realSkillsDir);
  assert.strictEqual(list.length, intentOnly.length);
  for (const skill of intentOnly) {
    assert.ok(list.some(e => e.startsWith(`${skill.name} [`)), `missing entry for ${skill.name}`);
  }
});
