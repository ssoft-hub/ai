'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');
const skillsDir = path.join(repoDir, 'skills');

// The headings the owning skill carries and the phrase its ownership-map line states.
// The citation heading identifies the owner; No skill name is written into this file:
// which skill owns the statement is read off the catalog.
const SECTION = 'Where the Place Comes From';
const TABLE_SECTION = 'What This Reaches';
const CONCERN = 'where an artifact a rule produces is put';
const OWNERSHIP_MAP = 'Skill ownership map';

const HEADING = /^##\s+(.*)$/;
const FENCE = /^\s*(?:```|~~~)/;

// The `##` headings of a file in order, each with its body, a fenced `##` line counted
// as neither.
function sections(text) {
  const found = [];
  let current = null;
  let fenced = false;
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      if (current) current.body.push(line);
      continue;
    }
    const heading = !fenced && line.match(HEADING);
    if (heading) {
      current = { heading: heading[1].trim(), body: [] };
      found.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }
  return found;
}

function carriesSection(text) {
  return sections(text).some(section => section.heading === SECTION);
}

function tableRows(bodyLines) {
  return bodyLines
    .filter(line => /^\s*\|.*\|\s*$/.test(line))
    .map(line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()))
    .filter(cells => !cells.every(cell => /^:?-+:?$/.test(cell)));
}

// The artifact kinds the statement ranges over, taken from the table it carries itself.
function producers(text) {
  const section = sections(text).find(entry => entry.heading === TABLE_SECTION);
  if (!section) return [];
  return tableRows(section.body)
    .map(cells => ({ artifact: cells[0], skill: (cells[1] ?? '').match(/^`([^`]+)`$/)?.[1] }))
    .filter(row => row.skill !== undefined);
}

// A citation resolves against the heading, so it carries the owning skill and that text.
const CITATION = new RegExp('`([a-z0-9]+(?:-[a-z0-9]+)*)`\\s*(?:→|->)\\s*' + SECTION, 'g');

function citations(text) {
  const flat = String(text).replace(/\s+/g, ' ');
  return [...new Set([...flat.matchAll(CITATION)].map(match => match[1]))];
}

function staleCitations(owningSkill, text) {
  return citations(text).filter(name => name !== owningSkill);
}

function strayCiters(named, citing) {
  return citing.filter(name => !named.includes(name));
}

// One entry per bullet of the map, a wrapped line joined to the bullet it continues.
function mapEntries(mapText) {
  const entries = [];
  for (const line of String(mapText).replace(/\r\n/g, '\n').split('\n')) {
    if (/^-\s/.test(line)) entries.push(line);
    else if (entries.length > 0 && /^\s+\S/.test(line)) {
      entries[entries.length - 1] += ' ' + line.trim();
    }
  }
  return entries;
}

function ownersNaming(concern, mapText) {
  const phrase = concern.toLowerCase();
  return mapEntries(mapText)
    .filter(entry => entry.toLowerCase().includes(phrase))
    .map(entry => entry.match(/^-\s+`([^`]+)`/)?.[1])
    .filter(name => name !== undefined);
}

function ownershipMap() {
  const text = fs.readFileSync(path.join(repoDir, 'AGENTS.md'), 'utf8');
  const map = sections(text).find(entry => entry.heading === OWNERSHIP_MAP);
  if (!map) throw new Error(`AGENTS.md carries no ## ${OWNERSHIP_MAP} heading`);
  return map.body.join('\n');
}

// Every file of this repository that routes a reader to a skill.
function corpusFiles() {
  const under = (dir, keep) => fs.readdirSync(path.join(repoDir, dir))
    .filter(keep)
    .map(name => path.join(repoDir, dir, name));
  return [
    ...under('skills', name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')))
      .map(dir => path.join(dir, 'SKILL.md')),
    ...under('commands', name => name.endsWith('.md')),
    ...under('agents', name => name.endsWith('.md')),
    ...under('templates', name => name.endsWith('.md')),
    path.join(repoDir, 'AGENTS.md'),
    path.join(repoDir, 'README.md'),
  ];
}

function skillNames() {
  const names = fs.readdirSync(skillsDir)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
  // A vacuous pass would hide the skills going missing entirely.
  if (names.length === 0) throw new Error(`no skill files in ${skillsDir}`);
  return names;
}

function readSkill(name) {
  return fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
}

function skillsCarryingSection() {
  return skillNames().filter(name => carriesSection(readSkill(name)));
}

// Every check below reads the statement off its owner, so a missing or doubled one throws
// rather than resolving to a file nobody wrote the rule in.
function owningSkill() {
  const carrying = skillsCarryingSection();
  if (carrying.length !== 1) {
    throw new Error(`## ${SECTION} stands in ${carrying.length} skills: ${carrying.join(', ')}`);
  }
  return carrying[0];
}

test('carriesSection finds the section under its own heading', () => {
  assert.strictEqual(carriesSection(`## ${SECTION}\n\n**Must**\n\nA rule.\n`), true);
});

test('carriesSection ignores the heading inside a fenced block', () => {
  assert.strictEqual(carriesSection(`\`\`\`markdown\n## ${SECTION}\n\`\`\`\n`), false);
});

test('carriesSection ignores a deeper heading of the same text', () => {
  assert.strictEqual(carriesSection(`### ${SECTION}\n\nA rule.\n`), false);
});

test('exactly one skill states where a produced artifact goes', () => {
  const carrying = skillsCarryingSection();
  assert.strictEqual(carrying.length, 1,
    `## ${SECTION} stands in ${carrying.length} skills: ${carrying.join(', ') || 'none'}`);
});

test('producers reads an artifact kind and the skill producing it off the table', () => {
  const text = `## ${TABLE_SECTION}\n\n**Must**\n\n| Artifact | Produced under |\n` +
    '|---|---|\n| a decision record | `architecture` |\n';
  assert.deepStrictEqual(producers(text),
    [{ artifact: 'a decision record', skill: 'architecture' }]);
});

test('producers drops a row whose second cell names no skill', () => {
  const text = `## ${TABLE_SECTION}\n\n**Must**\n\n| Artifact | Produced under |\n` +
    '|---|---|\n| a decision record | the architecture skill |\n';
  assert.deepStrictEqual(producers(text), []);
});

test('producers reads no table of another section', () => {
  const text = '## Some Rule\n\n| Artifact | Produced under |\n|---|---|\n' +
    `| a decision record | \`architecture\` |\n\n## ${TABLE_SECTION}\n\n**Must**\n\nA rule.\n`;
  assert.deepStrictEqual(producers(text), []);
});

test('the statement names the artifacts it ranges over', () => {
  const named = producers(readSkill(owningSkill()));
  assert.ok(named.length > 0, `## ${TABLE_SECTION} names no artifact and no skill producing one`);
});

test('every skill the statement names is one of the catalog', () => {
  const known = skillNames();
  const unknown = producers(readSkill(owningSkill()))
    .filter(row => !known.includes(row.skill))
    .map(row => `${row.artifact}: ${row.skill}`);
  assert.deepStrictEqual(unknown, []);
});

test('citations reads the skill a citation names', () => {
  assert.deepStrictEqual(citations(`Where it goes: \`editing\` → ${SECTION}.`), ['editing']);
});

test('citations reads a citation broken across lines', () => {
  const wrapped = `\`editing\` →\n${SECTION.replace(' Comes', '\nComes')}.`;
  assert.deepStrictEqual(citations(wrapped), ['editing']);
});

test('citations reads nothing from a mention carrying no arrow', () => {
  assert.deepStrictEqual(citations(`See \`editing\`, which states ${SECTION}.`), []);
});

test('staleCitations names a citation pointing at another skill', () => {
  assert.deepStrictEqual(staleCitations('editing', `\`architecture\` → ${SECTION}`),
    ['architecture']);
});

test('staleCitations passes a citation pointing at the skill carrying the statement', () => {
  assert.deepStrictEqual(staleCitations('editing', `\`editing\` → ${SECTION}`), []);
});

test('every citation in the repository names the skill carrying the statement', () => {
  const owner = owningSkill();
  const faults = [];
  for (const file of corpusFiles()) {
    const relative = path.relative(repoDir, file).replace(/\\/g, '/');
    for (const name of staleCitations(owner, fs.readFileSync(file, 'utf8'))) {
      faults.push(`${relative}: cites ${name}, which carries no ## ${SECTION}`);
    }
  }
  assert.deepStrictEqual(faults, [], faults.join('\n'));
});

test('every skill producing an artifact cites the statement', () => {
  const owner = owningSkill();
  const silent = producers(readSkill(owner))
    .map(row => row.skill)
    .filter(name => name !== owner && !citations(readSkill(name)).includes(owner));
  assert.deepStrictEqual(silent, []);
});

test('strayCiters names a citing skill the statement leaves unnamed', () => {
  assert.deepStrictEqual(strayCiters(['architecture'], ['architecture', 'debugging']),
    ['debugging']);
});

test('strayCiters passes a citing skill the statement names', () => {
  assert.deepStrictEqual(strayCiters(['architecture'], ['architecture']), []);
});

test('every skill citing the statement is one the statement names', () => {
  const owner = owningSkill();
  const named = producers(readSkill(owner)).map(row => row.skill);
  const citing = skillNames()
    .filter(name => name !== owner && citations(readSkill(name)).includes(owner));
  assert.deepStrictEqual(strayCiters(named, citing), []);
});

test('ownersNaming reads the skill whose line carries the concern', () => {
  const map = '- `artifact-placement` — where an artifact a rule\n' +
    '  produces is put.\n- `comments` — a comment in any language.\n';
  assert.deepStrictEqual(ownersNaming(CONCERN, map), ['artifact-placement']);
});

test('ownersNaming reads no line that leaves the concern unnamed', () => {
  assert.deepStrictEqual(ownersNaming(CONCERN, '- `editing` — a stale reading.\n'), []);
});

test('the ownership map carries the concern on the line of the skill stating it', () => {
  assert.deepStrictEqual(ownersNaming(CONCERN, ownershipMap()), [owningSkill()]);
});
