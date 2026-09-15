'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');
const evalsDir = path.join(repoDir, 'evals');

// `claude plugin eval` writes its results under evals/results/ and reads no case from there.
const NOT_A_SUITE = new Set(['results']);

function suites() {
  const names = fs.readdirSync(evalsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !NOT_A_SUITE.has(entry.name))
    .map(entry => entry.name);
  if (!names.length) throw new Error(`no suite under ${evalsDir}`);
  return names;
}

function cases(suite) {
  const dir = path.join(evalsDir, suite);
  const names = fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name);
  if (!names.length) throw new Error(`no case under ${dir}`);
  return names.map(name => path.join(dir, name));
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

function graders(caseDir) {
  const dir = path.join(caseDir, 'graders');
  assert.ok(fs.existsSync(dir), `${rel(caseDir)} has a graders/ directory`);
  return fs.readdirSync(dir).map(name => {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    const frontmatter = text.match(FRONTMATTER)?.[1] ?? '';
    const body = text.replace(FRONTMATTER, '').trim();
    const type = frontmatter.match(/^type:\s*(\S+)/m)?.[1];
    return { name, text, frontmatter, body, type };
  });
}

const rel = p => path.relative(repoDir, p).replace(/\\/g, '/');

test('every suite is named after a skill of the catalog', () => {
  for (const suite of suites())
    assert.ok(fs.existsSync(path.join(repoDir, 'skills', suite, 'SKILL.md')), `${suite} is a skill`);
});

test('every case poses a prompt', () => {
  for (const suite of suites()) for (const caseDir of cases(suite)) {
    const file = path.join(caseDir, 'prompt.md');
    assert.ok(fs.existsSync(file), `${rel(file)} exists`);
    const text = fs.readFileSync(file, 'utf8');
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
    assert.ok(body.length > 0, `${rel(file)} carries a prompt below its frontmatter`);
    assert.doesNotMatch(body, /TODO/, `${rel(file)} is not the blank template`);
  }
});

const indicators = caseDir => graders(caseDir)
  .filter(g => g.type === 'tool_used' && /^tool:\s*Skill\s*$/m.test(g.frontmatter));

test('every case carries one tool_used: Skill indicator', () => {
  for (const suite of suites()) for (const caseDir of cases(suite))
    assert.strictEqual(indicators(caseDir).length, 1, `${rel(caseDir)} has one Skill indicator`);
});

test('the indicator of a case names the skill of its own suite, which alone tells the two arms apart', () => {
  for (const suite of suites()) for (const caseDir of cases(suite)) {
    const [indicator] = indicators(caseDir);
    assert.match(indicator.frontmatter, new RegExp(`^input_match:\\s*'claude-config:${suite}'$`, 'm'),
      `${rel(caseDir)}/graders/${indicator.name} counts a call loading ${suite}, not any Skill call`);
  }
});

test('every case carries a grader that scores beside its indicator', () => {
  for (const suite of suites()) for (const caseDir of cases(suite))
    assert.ok(graders(caseDir).length - indicators(caseDir).length >= 1,
      `${rel(caseDir)} has a grader that scores`);
});

test('every grader declares a type the eval knows', () => {
  const known = new Set(['regex', 'tool_used', 'tool_order', 'file_exists', 'llm', 'baseline']);
  for (const suite of suites()) for (const caseDir of cases(suite)) for (const g of graders(caseDir))
    assert.ok(known.has(g.type), `${rel(caseDir)}/graders/${g.name} declares type ${g.type}`);
});

test('every llm grader carries a rubric', () => {
  for (const suite of suites()) for (const caseDir of cases(suite))
    for (const g of graders(caseDir).filter(g => g.type === 'llm'))
      assert.ok(g.body.length > 0, `${rel(caseDir)}/graders/${g.name} carries a rubric`);
});

test('every pattern a grader carries is quoted in single quotes', () => {
  // A double-quoted YAML string reads `\s` as an escape and breaks the pattern.
  for (const suite of suites()) for (const caseDir of cases(suite)) for (const g of graders(caseDir))
    for (const key of ['pattern', 'input_match']) {
      const line = g.frontmatter.match(new RegExp(`^${key}:.*$`, 'm'))?.[0];
      if (line === undefined) continue;
      assert.match(line, new RegExp(`^${key}:\\s*'.*'$`),
        `${rel(caseDir)}/graders/${g.name} quotes its ${key} in single quotes`);
    }
});

test('an llm rubric quoting a section of the skill quotes it as the skill has it', () => {
  let quoted = 0;
  for (const suite of suites()) {
    const skill = fs.readFileSync(path.join(repoDir, 'skills', suite, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
    for (const caseDir of cases(suite)) for (const g of graders(caseDir).filter(g => g.type === 'llm')) {
      const body = g.body.replace(/\r\n/g, '\n');
      const heading = body.match(/^## (.+)$/m)?.[1];
      if (!heading) continue;
      quoted++;
      const start = body.indexOf(`## ${heading}`);
      assert.ok(skill.includes(body.slice(start).trim()), `${rel(caseDir)}/graders/${g.name} quotes "${heading}" as the skill states it`);
    }
  }
  assert.ok(quoted > 0, 'a rubric quotes a section');
});

test('a case prompt allows the Skill tool, or the indicator can never fire', () => {
  for (const suite of suites()) for (const caseDir of cases(suite)) {
    const text = fs.readFileSync(path.join(caseDir, 'prompt.md'), 'utf8');
    const frontmatter = text.match(FRONTMATTER)?.[1] ?? '';
    assert.match(frontmatter, /^allowed_tools:.*\bSkill\b/m, `${rel(caseDir)} allows Skill`);
  }
});

// Every grader file name, against the cases carrying it and the bytes each of them holds.
function copiesByGraderName() {
  const byName = new Map();
  for (const suite of suites()) for (const caseDir of cases(suite)) {
    const dir = path.join(caseDir, 'graders');
    for (const name of fs.readdirSync(dir)) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push({ where: rel(caseDir), bytes: fs.readFileSync(path.join(dir, name)) });
    }
  }
  return byName;
}

test('a grader name carries one rubric, byte for byte, in every case holding it', () => {
  const shared = [...copiesByGraderName()].filter(([, copies]) => copies.length > 1);
  // A case's frontmatter takes no `graders` key, so a rubric two cases share is two files.
  // A sweep finding no such name inspected nothing, and must not report success.
  if (!shared.length) throw new Error('no grader name stands in more than one case, so nothing was compared');
  for (const [name, copies] of shared) {
    const [first, ...rest] = copies;
    const differing = rest.filter(copy => !copy.bytes.equals(first.bytes)).map(copy => copy.where);
    assert.deepStrictEqual(differing, [],
      `${name} differs between ${first.where} and ${differing.join(', ')}: one grader name `
      + 'carries one rubric, and a case needing another rubric gives it another name');
  }
});
