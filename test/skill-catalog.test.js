'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { globToRegExp, parseFrontmatter, loadCatalog, matchSkills } = require('../tools/skill-catalog');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-catalog-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
function writeSkill(skillsDir, name, frontmatter) {
  const dir = path.join(skillsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n${frontmatter}---\nbody\n`);
}

test('globToRegExp matches an extension anywhere below the root', () => {
  const re = globToRegExp('**/*.cpp');
  assert.ok(re.test('D:/work/src/foo.cpp'));
  assert.ok(re.test('foo.cpp'));
  assert.ok(!re.test('D:/work/src/foo.h'));
});

test('globToRegExp keeps a single star inside one path segment', () => {
  const re = globToRegExp('**/test/*.test.js');
  assert.ok(re.test('D:/repo/test/secret-guard.test.js'));
  assert.ok(!re.test('D:/repo/test/nested/secret-guard.test.js'));
});

test('globToRegExp matches any alternative inside braces', () => {
  const re = globToRegExp('**/*.{py,sh,yml}');
  assert.ok(re.test('D:/repo/tools/x.py'));
  assert.ok(re.test('D:/repo/x.yml'));
  assert.ok(!re.test('D:/repo/x.rb'));
});

test('globToRegExp keeps a brace alternative from spanning a directory', () => {
  const re = globToRegExp('*.{js,ts}');
  assert.ok(re.test('x.ts'));
  assert.ok(!re.test('src/x.ts'));
});

test('globToRegExp escapes regex metacharacters in literal text', () => {
  const re = globToRegExp('**/CHANGELOG.md');
  assert.ok(re.test('D:/repo/CHANGELOG.md'));
  assert.ok(!re.test('D:/repo/CHANGELOGxmd'));
});

test('globToRegExp keeps a deeply nested pattern with one wildcard a segment', () => {
  const re = globToRegExp('**/a/*/b/*/c/*.h');
  assert.ok(re.test('D:/repo/a/x/b/y/c/z.h'));
  assert.ok(!re.test('D:/repo/a/x/b/y/c/z.cpp'));
});

// Past the cap a pattern matches nothing rather than spending the hook's budget deciding.
test('globToRegExp answers at once for a pattern crowding one segment with wildcards', () => {
  const re = globToRegExp(`**/${'*a'.repeat(8)}`);
  const started = Date.now();
  assert.ok(!re.test(`D:/repo/src/${'a'.repeat(48)}b.txt`));
  assert.ok(Date.now() - started < 1000);
});

test('parseFrontmatter reads a block sequence', () => {
  const fm = parseFrontmatter('---\nname: x\nmetadata:\n  paths:\n    - "**/*.cpp"\n    - "**/*.h"\n---\nbody\n');
  assert.deepStrictEqual(fm.paths, ['**/*.cpp', '**/*.h']);
});

test('parseFrontmatter reads an inline sequence', () => {
  const fm = parseFrontmatter('---\nname: x\nmetadata:\n  with: [comments, cpp-encapsulation]\n---\nbody\n');
  assert.deepStrictEqual(fm.with, ['comments', 'cpp-encapsulation']);
});

test('parseFrontmatter reads the contexts a skill is bound to', () => {
  const fm = parseFrontmatter('---\nname: x\nmetadata:\n  bound-to:\n    - node\n    - claude-code\n---\nbody\n');
  assert.deepStrictEqual(fm.boundTo, ['node', 'claude-code']);
});

test('parseFrontmatter keeps a comma that sits inside a quoted inline item', () => {
  const fm = parseFrontmatter('---\nname: x\nmetadata:\n  paths: ["**/a,b.md", "**/c.md"]\n---\nbody\n');
  assert.deepStrictEqual(fm.paths, ['**/a,b.md', '**/c.md']);
});

test('parseFrontmatter stops at the closing delimiter', () => {
  const fm = parseFrontmatter('---\nname: x\n---\ntier: process\n');
  assert.strictEqual(fm.tier, undefined);
});

test('parseFrontmatter reads a CRLF file', () => {
  const fm = parseFrontmatter('---\r\nname: x\r\nmetadata:\r\n  tier: process\r\n  paths:\r\n    - "**/*.h"\r\n---\r\nbody\r\n');
  assert.strictEqual(fm.tier, 'process');
  assert.deepStrictEqual(fm.paths, ['**/*.h']);
});

test('parseFrontmatter returns an empty object without frontmatter', () => {
  assert.deepStrictEqual(parseFrontmatter('no frontmatter here\n'), {});
});

test('parseFrontmatter returns an empty object when the delimiter never closes', () => {
  assert.deepStrictEqual(parseFrontmatter('---\ndescription: d\ntier: process\n'), {});
});

test('parseFrontmatter reads a block whose closing delimiter is the last byte', () => {
  assert.strictEqual(parseFrontmatter('---\ntier: process\n---').tier, 'process');
});

test('loadCatalog defaults tier to domain and leaves paths empty', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'description: Apply when alpha\n');
    assert.deepStrictEqual(loadCatalog(tmp), [
      { name: 'alpha', description: 'Apply when alpha', tier: 'domain', paths: [], companions: [], boundTo: [], reminder: true, always: false },
    ]);
  } finally { rmTmp(tmp); }
});

test('loadCatalog carries the always declaration, and defaults it to false', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'description: d\nmetadata:\n  always: true\n');
    writeSkill(tmp, 'beta', 'description: d\n');
    const catalog = loadCatalog(tmp);
    assert.strictEqual(catalog.find(s => s.name === 'alpha').always, true);
    assert.strictEqual(catalog.find(s => s.name === 'beta').always, false);
  } finally { rmTmp(tmp); }
});

test('loadCatalog carries every context a skill declares', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'description: d\nmetadata:\n  bound-to: [node, claude-code]\n');
    assert.deepStrictEqual(loadCatalog(tmp)[0].boundTo, ['node', 'claude-code']);
  } finally { rmTmp(tmp); }
});

test('loadCatalog keeps a path-triggered skill in the reminder by default', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n');
    assert.strictEqual(loadCatalog(tmp)[0].reminder, true);
  } finally { rmTmp(tmp); }
});

test('loadCatalog reads reminder: false', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'description: d\nmetadata:\n  reminder: false\n');
    assert.strictEqual(loadCatalog(tmp)[0].reminder, false);
  } finally { rmTmp(tmp); }
});

test('loadCatalog skips a directory without SKILL.md', () => {
  const tmp = mkTmp();
  try {
    fs.mkdirSync(path.join(tmp, 'empty'));
    writeSkill(tmp, 'real', 'description: Apply when real\n');
    assert.deepStrictEqual(loadCatalog(tmp).map(s => s.name), ['real']);
  } finally { rmTmp(tmp); }
});

test('matchSkills returns skills whose paths match the edited file', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'cpp-coding', 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n');
    writeSkill(tmp, 'node-testing', 'description: d\nmetadata:\n  paths: ["**/test/*.test.js"]\n');
    assert.deepStrictEqual(matchSkills(loadCatalog(tmp), 'D:/repo/src/a.cpp'), ['cpp-coding']);
  } finally { rmTmp(tmp); }
});

test('matchSkills pulls in companions of a matched skill', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'cpp-coding', 'description: d\nmetadata:\n  tier: domain\n  paths: ["**/*.cpp"]\n  with: [comments]\n');
    writeSkill(tmp, 'comments', 'description: d\nmetadata:\n  tier: narrow\n');
    assert.deepStrictEqual(matchSkills(loadCatalog(tmp), 'D:/repo/a.cpp'), ['cpp-coding', 'comments']);
  } finally { rmTmp(tmp); }
});

test('matchSkills orders process before domain before narrow', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'narrow-one', 'description: d\nmetadata:\n  tier: narrow\n  paths: ["**/*.cpp"]\n');
    writeSkill(tmp, 'process-one', 'description: d\nmetadata:\n  tier: process\n  paths: ["**/*.cpp"]\n');
    writeSkill(tmp, 'domain-one', 'description: d\nmetadata:\n  tier: domain\n  paths: ["**/*.cpp"]\n');
    assert.deepStrictEqual(matchSkills(loadCatalog(tmp), 'a.cpp'), ['process-one', 'domain-one', 'narrow-one']);
  } finally { rmTmp(tmp); }
});

test('matchSkills lists a companion once when two skills name it', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'a-skill', 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n  with: [comments]\n');
    writeSkill(tmp, 'b-skill', 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n  with: [comments]\n');
    writeSkill(tmp, 'comments', 'description: d\nmetadata:\n  tier: narrow\n');
    assert.deepStrictEqual(matchSkills(loadCatalog(tmp), 'a.cpp'), ['a-skill', 'b-skill', 'comments']);
  } finally { rmTmp(tmp); }
});

test('matchSkills lists a skill once when it is both path-matched and a companion', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'cpp-coding', 'description: d\nmetadata:\n  paths: ["**/*.h"]\n  with: [cpp-doxygen]\n');
    writeSkill(tmp, 'cpp-doxygen', 'description: d\nmetadata:\n  tier: narrow\n  paths: ["**/*.h"]\n');
    assert.deepStrictEqual(matchSkills(loadCatalog(tmp), 'a.h'), ['cpp-coding', 'cpp-doxygen']);
  } finally { rmTmp(tmp); }
});

test('matchSkills ignores a companion that names no installed skill', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'a-skill', 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n  with: [not-installed]\n');
    assert.deepStrictEqual(matchSkills(loadCatalog(tmp), 'a.cpp'), ['a-skill']);
  } finally { rmTmp(tmp); }
});

test('matchSkills returns nothing for a path no skill claims', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'cpp-coding', 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n');
    assert.deepStrictEqual(matchSkills(loadCatalog(tmp), 'D:/repo/readme.txt'), []);
  } finally { rmTmp(tmp); }
});

test('matchSkills normalises backslash paths before matching', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'cpp-coding', 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n');
    assert.deepStrictEqual(matchSkills(loadCatalog(tmp), 'D:\\repo\\src\\a.cpp'), ['cpp-coding']);
  } finally { rmTmp(tmp); }
});

// The catalog these two read is the repository's own skills/, so they fail when a
// skill's frontmatter stops claiming what it says it covers.
test('the comments skill claims a source file in every language family', () => {
  const catalog = loadCatalog(path.join(__dirname, '..', 'skills'));
  for (const file of ['a.cpp', 'a.js', 'a.py', 'a.sql', 'a.ini', 'a.tex', 'a.html']) {
    assert.ok(matchSkills(catalog, `D:/repo/${file}`).includes('comments'), file);
  }
});

test('the comments skill leaves a file carrying no code alone', () => {
  const catalog = loadCatalog(path.join(__dirname, '..', 'skills'));
  assert.ok(!matchSkills(catalog, 'D:/repo/notes.txt').includes('comments'));
});

test('globToRegExp drops an empty brace alternative', () => {
  const re = globToRegExp('*.{js,}');
  assert.ok(re.test('x.js'));
  assert.ok(!re.test('x.'));
});

test('globToRegExp matches a path whose case differs from the glob', () => {
  assert.ok(globToRegExp('**/*.cpp').test('D:/repo/A.CPP'));
});

test('the comments skill claims a build file named without an extension', () => {
  const catalog = loadCatalog(path.join(__dirname, '..', 'skills'));
  for (const file of ['Makefile', 'makefile', 'CMakeLists.txt', 'Dockerfile', '.gitignore']) {
    assert.ok(matchSkills(catalog, `D:/repo/${file}`).includes('comments'), file);
  }
});

test('loadCatalog skips a plain file sitting among the skill directories', () => {
  const tmp = mkTmp();
  try {
    fs.writeFileSync(path.join(tmp, 'notes.md'), 'not a skill\n');
    writeSkill(tmp, 'real', 'description: Apply when real\n');
    assert.deepStrictEqual(loadCatalog(tmp).map(s => s.name), ['real']);
  } finally { rmTmp(tmp); }
});

test('loadCatalog returns nothing for a skills directory that does not exist', () => {
  const tmp = mkTmp();
  try {
    assert.deepStrictEqual(loadCatalog(path.join(tmp, 'absent')), []);
  } finally { rmTmp(tmp); }
});

test('loadCatalog reads a SKILL.md edited since the previous call', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n');
    assert.deepStrictEqual(loadCatalog(tmp)[0].paths, ['**/*.cpp']);
    writeSkill(tmp, 'alpha', 'description: d\nmetadata:\n  paths: ["**/*.rs"]\n');
    assert.deepStrictEqual(loadCatalog(tmp)[0].paths, ['**/*.rs']);
  } finally { rmTmp(tmp); }
});

test('loadCatalog lists a SKILL.md added since the previous call', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'description: d\n');
    assert.deepStrictEqual(loadCatalog(tmp).map(s => s.name), ['alpha']);
    writeSkill(tmp, 'beta', 'description: d\n');
    assert.deepStrictEqual(loadCatalog(tmp).map(s => s.name), ['alpha', 'beta']);
  } finally { rmTmp(tmp); }
});

test('loadCatalog drops a SKILL.md removed since the previous call', () => {
  const tmp = mkTmp();
  try {
    writeSkill(tmp, 'alpha', 'description: d\n');
    writeSkill(tmp, 'beta', 'description: d\n');
    assert.deepStrictEqual(loadCatalog(tmp).map(s => s.name), ['alpha', 'beta']);
    fs.rmSync(path.join(tmp, 'beta'), { recursive: true, force: true });
    assert.deepStrictEqual(loadCatalog(tmp).map(s => s.name), ['alpha']);
  } finally { rmTmp(tmp); }
});
