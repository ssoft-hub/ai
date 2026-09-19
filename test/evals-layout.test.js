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

// A `##` line inside a fenced block opens no section and ends none.
function section(skill, heading) {
  const lines = skill.split('\n');
  let fenced = false;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^ {0,3}```/.test(lines[i])) fenced = !fenced;
    if (fenced || !lines[i].startsWith('## ')) continue;
    if (start >= 0) return lines.slice(start, i).join('\n').trim();
    if (lines[i] === `## ${heading}`) start = i;
  }
  return start < 0 ? null : lines.slice(start).join('\n').trim();
}

// The quote opens at the heading's own line: a `## ` naming the section inside a sentence
// of the rubric's prose is a mention, and slicing from it would quote half a section.
function quotedSection(skill, body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const at = lines.findIndex(line => line.startsWith('## '));
  if (at === -1) return null;
  const heading = lines[at].slice(3).trim();
  return { heading, quote: lines.slice(at).join('\n').trim(), section: section(skill, heading) };
}

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

// A missing section fails the equality too, as a quote the walk cut short.
function assertQuotesWholeSection(grader, skillPath, q) {
  assert.notStrictEqual(q.section, null,
    `${grader} quotes "${q.heading}", a heading ${skillPath} carries no section under: `
    + 'the skill renamed the section, or a `## ` line of the rubric\'s own prose stands above the quote');
  assert.strictEqual(q.quote, q.section,
    `${grader} quotes "${q.heading}" from its heading to the line before the next, `
    + 'and a quote stopping earlier states half a rule');
}

test('an llm rubric quoting a section of the skill quotes the whole of it', () => {
  let quoted = 0;
  for (const suite of suites()) {
    const skillPath = path.join(repoDir, 'skills', suite, 'SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8').replace(/\r\n/g, '\n');
    for (const caseDir of cases(suite)) for (const g of graders(caseDir).filter(g => g.type === 'llm')) {
      const q = quotedSection(skill, g.body);
      if (q === null) continue;
      quoted++;
      assertQuotesWholeSection(`${rel(caseDir)}/graders/${g.name}`, rel(skillPath), q);
    }
  }
  assert.ok(quoted > 0, 'a rubric quotes a section');
});

const QUOTED_SECTION = path.join(__dirname, 'fixtures', 'quoted-section');
const fixture = name => fs.readFileSync(path.join(QUOTED_SECTION, name), 'utf8').replace(/\r\n/g, '\n');
const fixtureRubric = name => fixture(name).replace(FRONTMATTER, '').trim();

test('a section runs past a ## heading standing inside a fenced block', () => {
  const q = quotedSection(fixture('skill.md'), fixtureRubric('quotes-the-whole-section.md'));
  assert.strictEqual(q.quote, q.section);
});

test('a quote cut at a fenced heading is a substring of the skill and still no whole section', () => {
  const skill = fixture('skill.md');
  const q = quotedSection(skill, fixtureRubric('stops-at-the-fenced-heading.md'));
  assert.ok(skill.includes(q.quote), 'the cut quote is what a containment check accepts');
  assert.notStrictEqual(q.quote, q.section);
});

test('a rubric whose first ## line names no section of the skill reports that heading', () => {
  const q = quotedSection(fixture('skill.md'), fixtureRubric('shows-a-heading-above-the-quote.md'));
  assert.throws(
    () => assertQuotesWholeSection('the fixture rubric', 'the fixture skill', q),
    /quotes "Out of scope", a heading the fixture skill carries no section under/,
    'the failure names the heading the skill carries no section under, not a quote cut short');
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

test('a file beside the suites is no suite, so the walk takes directories alone', () => {
  const guide = path.join(evalsDir, 'README.md');
  assert.ok(fs.existsSync(guide), `${rel(guide)} states how a case is written`);
  assert.ok(!suites().includes('README.md'), 'the walk takes no file for a suite');
});

test('a rubric naming the section inline quotes it from the heading line, not from the mention', () => {
  const q = quotedSection(fixture('skill.md'), fixtureRubric('mentions-the-heading-inline.md'));
  assert.strictEqual(q.quote, q.section);
});
