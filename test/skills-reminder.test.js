'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { shortHint, buildSkillList, buildContext } = require('../tools/skills-reminder');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skills-reminder-'));
}
function rmTmp(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function writeSkill(skillsDir, name, description) {
  const dir = path.join(skillsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\nbody\n`);
}

test('shortHint strips leading "Apply when"', () => {
  assert.strictEqual(shortHint('Apply when writing tests'), 'writing tests');
});

test('shortHint leaves short text without "Apply when" unchanged', () => {
  assert.strictEqual(shortHint('Short description'), 'Short description');
});

test('shortHint truncates long text at word boundary with ellipsis', () => {
  const long = 'a'.repeat(40) + ' ' + 'b'.repeat(40);
  const hint = shortHint(long);
  assert.ok(hint.length <= 71);
  assert.ok(hint.endsWith('…'));
  assert.ok(!hint.includes('b'));
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
    assert.ok(list.some(e => e.startsWith('alpha:')));
    assert.ok(list.some(e => e.startsWith('beta:')));
  } finally {
    rmTmp(tmp);
  }
});

test('buildSkillList skips directories without SKILL.md', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, 'no-skill-here'));
    writeSkill(tmp, 'real', 'Apply when real');
    assert.deepStrictEqual(buildSkillList(tmp), ['real: real']);
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

test('buildContext returns null when no skills found', () => {
  assert.strictEqual(buildContext(path.join(os.tmpdir(), 'does-not-exist-xyz')), null);
});

test('buildContext produces a pipe-joined reminder string', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'Apply when doing alpha things');
    writeSkill(tmp, 'beta', 'Apply when doing beta things');
    const ctx = buildContext(tmp);
    assert.ok(ctx.startsWith('SKILLS'));
    assert.ok(ctx.includes('alpha: doing alpha things'));
    assert.ok(ctx.includes('beta: doing beta things'));
    assert.ok(ctx.includes(' | '));
  } finally {
    rmTmp(tmp);
  }
});

test('buildContext output matches every real skill directory in this repo', () => {
  const realSkillsDir = path.join(__dirname, '..', 'skills');
  const dirs = fs.readdirSync(realSkillsDir).filter(name =>
    fs.existsSync(path.join(realSkillsDir, name, 'SKILL.md')));
  const list = buildSkillList(realSkillsDir);
  assert.strictEqual(list.length, dirs.length);
  for (const name of dirs) {
    assert.ok(list.some(e => e.startsWith(`${name}:`)), `missing entry for ${name}`);
  }
});
