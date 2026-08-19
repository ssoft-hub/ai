'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { divergedSkills, divergenceReport } = require('../check-install');

const skillsDir = path.join(__dirname, '..', 'skills');
const checkInstallJs = path.join(__dirname, '..', 'check-install.js');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function shippedSkills() {
  return fs.readdirSync(skillsDir)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
}

// Divergence goes in the largest file, so a comparison reading a prefix cannot pass.
function largestSkill() {
  return shippedSkills()
    .map(name => [name, fs.statSync(path.join(skillsDir, name, 'SKILL.md')).size])
    .sort((a, b) => b[1] - a[1])[0][0];
}

// The tree install.js leaves behind, built here instead of by running it: no test may
// write to the machine's own configuration directory.
function copySkillsInto(dir, names) {
  for (const name of names) {
    const dest = path.join(dir, 'skills', name, 'SKILL.md');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(skillsDir, name, 'SKILL.md'), dest);
  }
}

function withConfigDir(dir, fn) {
  const before = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = dir;
  try { return fn(); }
  finally {
    if (before === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = before;
  }
}

// The script reads the skills of the checkout holding it, so a copy in a temp dir has none.
function runCheck(dir, script = checkInstallJs) {
  return spawnSync(process.execPath, [script], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir }, encoding: 'utf8',
  });
}

test('reports the one installed copy that differs from the repository by a byte', () => {
  const dir = mkTmp();
  try {
    const names = shippedSkills();
    copySkillsInto(dir, names);
    fs.appendFileSync(path.join(dir, 'skills', names[0], 'SKILL.md'), '\n');
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), [`skills/${names[0]}/SKILL.md`]);
  } finally { rmTmp(dir); }
});

// Flipped mid-file, not appended: a length comparison passes every other divergence here.
test('reports an installed copy edited without changing its length', () => {
  const dir = mkTmp();
  try {
    const names = shippedSkills();
    copySkillsInto(dir, names);
    const installed = path.join(dir, 'skills', names[0], 'SKILL.md');
    const bytes = fs.readFileSync(installed);
    bytes[Math.floor(bytes.length / 2)] ^= 1;
    fs.writeFileSync(installed, bytes);
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), [`skills/${names[0]}/SKILL.md`]);
  } finally { rmTmp(dir); }
});

test('reports a copy of the largest skill whose last byte was edited', () => {
  const dir = mkTmp();
  try {
    const name = largestSkill();
    copySkillsInto(dir, shippedSkills());
    const installed = path.join(dir, 'skills', name, 'SKILL.md');
    const bytes = fs.readFileSync(installed);
    bytes[bytes.length - 1] ^= 1;
    fs.writeFileSync(installed, bytes);
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), [`skills/${name}/SKILL.md`]);
  } finally { rmTmp(dir); }
});

// install.js copies bytes, so a line ending is a difference `node install.js` reconciles.
test('reports a copy that differs from the repository only in its line endings', () => {
  const dir = mkTmp();
  try {
    const names = shippedSkills();
    copySkillsInto(dir, names);
    const installed = path.join(dir, 'skills', names[0], 'SKILL.md');
    const text = fs.readFileSync(installed, 'utf8');
    fs.writeFileSync(installed, text.includes('\r\n')
      ? text.replace(/\r\n/g, '\n')
      : text.replace(/\n/g, '\r\n'));
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), [`skills/${names[0]}/SKILL.md`]);
  } finally { rmTmp(dir); }
});

test('reports nothing when a matching copy carries a different modification time', () => {
  const dir = mkTmp();
  try {
    const names = shippedSkills();
    copySkillsInto(dir, names);
    const stamp = new Date(2020, 0, 1);
    for (const name of names) fs.utimesSync(path.join(dir, 'skills', name, 'SKILL.md'), stamp, stamp);
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), []);
  } finally { rmTmp(dir); }
});

test('reports nothing when every installed copy matches the repository', () => {
  const dir = mkTmp();
  try {
    copySkillsInto(dir, shippedSkills());
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), []);
  } finally { rmTmp(dir); }
});

test('reports the one skill the configuration directory carries no copy of', () => {
  const dir = mkTmp();
  try {
    const names = shippedSkills();
    copySkillsInto(dir, names.slice(1));
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), [`skills/${names[0]}/SKILL.md`]);
  } finally { rmTmp(dir); }
});

// Pins the enumeration and the whole result list at once: a check narrowed to some of
// the skills, or to some of the divergences, still passes every one-element case above.
test('reports every shipped skill when the installed skills directory is empty', () => {
  const dir = mkTmp();
  try {
    fs.mkdirSync(path.join(dir, 'skills'), { recursive: true });
    const expected = shippedSkills().map(name => `skills/${name}/SKILL.md`);
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), expected);
  } finally { rmTmp(dir); }
});

test('reports nothing when the configuration directory holds no skills directory', () => {
  const dir = mkTmp();
  try {
    assert.deepStrictEqual(withConfigDir(dir, divergedSkills), []);
  } finally { rmTmp(dir); }
});

test('the report gives every diverged path a line of its own', () => {
  const lines = divergenceReport(['skills/ddd/SKILL.md', 'skills/editing/SKILL.md']).split('\n');
  assert.ok(lines.includes('skills/ddd/SKILL.md'));
  assert.ok(lines.includes('skills/editing/SKILL.md'));
});

test('the report names the command that reconciles the two copies', () => {
  assert.match(divergenceReport(['skills/ddd/SKILL.md']), /node install\.js/);
});

test('run as a script it fails and states the report when a copy differs', () => {
  const dir = mkTmp();
  try {
    const names = shippedSkills();
    copySkillsInto(dir, names);
    fs.appendFileSync(path.join(dir, 'skills', names[0], 'SKILL.md'), '\n');
    const r = runCheck(dir);
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, new RegExp(`skills/${names[0]}/SKILL\\.md`));
  } finally { rmTmp(dir); }
});

test('run as a script it succeeds when every installed copy matches', () => {
  const dir = mkTmp();
  try {
    copySkillsInto(dir, shippedSkills());
    assert.strictEqual(runCheck(dir).status, 0);
  } finally { rmTmp(dir); }
});

test('run as a script it states how many copies it compared and where', () => {
  const dir = mkTmp();
  try {
    const names = shippedSkills();
    copySkillsInto(dir, names);
    const r = runCheck(dir);
    assert.strictEqual(r.status, 0);
    assert.ok(r.stdout.startsWith(`${names.length} `));
    assert.ok(r.stdout.includes(path.join(dir, 'skills')));
  } finally { rmTmp(dir); }
});

test('run as a script it states that a directory with no skills was not compared', () => {
  const dir = mkTmp();
  try {
    const r = runCheck(dir);
    assert.strictEqual(r.status, 0);
    assert.ok(r.stdout.includes(path.join(dir, 'skills')));
  } finally { rmTmp(dir); }
});

test('run from a checkout carrying no skills it fails instead of reporting a match', () => {
  const checkout = mkTmp();
  const dir = mkTmp();
  try {
    const script = path.join(checkout, 'check-install.js');
    fs.copyFileSync(checkInstallJs, script);
    copySkillsInto(dir, shippedSkills());
    const r = runCheck(dir, script);
    assert.notStrictEqual(r.status, 0);
    assert.ok(r.stderr.includes(path.join(checkout, 'skills')));
  } finally { rmTmp(checkout); rmTmp(dir); }
});
