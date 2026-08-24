'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');
const skillFile = path.join(repoDir, 'skills', 'pr-rules', 'SKILL.md');
const agentsFile = path.join(repoDir, 'AGENTS.md');

function read(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (text.trim() === '') throw new Error(`${file} is empty`);
  return text;
}

function sectionOf(file, heading) {
  const text = read(file);
  const start = text.indexOf(`\n${heading}\n`);
  if (start < 0) throw new Error(`no "${heading}" section in ${file}`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start + 1, end < 0 ? undefined : end);
}

function steps() {
  const markers = [...sectionOf(skillFile, '## Workflow').matchAll(/^\*\*(\d+)\. ([^*]+)\*\*/gm)]
    .map(marker => ({ number: Number(marker[1]), name: marker[2].trim() }));
  if (markers.length === 0) throw new Error('no step marker under "## Workflow"');
  return markers;
}

// The lookahead ends a name at a further "the", so one citation cannot swallow the next.
const named = /\bthe\s+([A-Z](?:(?!\bthe\b)[^.;:|]){0,120}?)\s+steps?\b/g;
const numbersIn = text => [...text.matchAll(/\d+/g)].map(match => Number(match[0]));

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return ['.git', 'node_modules'].includes(entry.name) ? [] : markdownFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

function citingRegions() {
  const workflow = sectionOf(skillFile, '## Workflow');
  const regions = [{
    where: 'skills/pr-rules/SKILL.md, outside "## Workflow"',
    text: read(skillFile).replace(workflow, workflow.replace(/[^\n]/g, ' ')),
  }];
  for (const file of markdownFiles(repoDir)) {
    if (file === skillFile || path.basename(file) === 'CHANGELOG.md') continue;
    const text = read(file);
    const cites = text.includes('`pr-rules`');
    const where = path.relative(repoDir, file).split(path.sep).join('/');
    for (const paragraph of text.split(/\n\s*\n/))
      if (paragraph.includes('`pr-rules`') || (cites && [...paragraph.matchAll(named)].length > 0))
        regions.push({ where, text: paragraph });
  }
  if (regions.length === 1)
    throw new Error('no file outside the skill cites `pr-rules`, so nothing here reads a citation');
  return regions;
}

function resolvesToSteps(citation, names) {
  let left = citation.replace(/\s+/g, ' ');
  for (const name of [...names, 'Workflow'].sort((first, second) => second.length - first.length))
    left = left.split(name).join(' ');
  return left.replace(/\band\b|[\s,]/g, '') === '';
}

function stepColumn() {
  const rows = sectionOf(agentsFile, '### Lifecycle map').split('\n')
    .filter(line => line.startsWith('|'));
  const header = rows.find(row => row.includes('`pr-rules` step'));
  if (!header) throw new Error('no "`pr-rules` step" column in the lifecycle map');
  const at = header.split('|').findIndex(cell => cell.includes('`pr-rules` step'));
  const cells = rows.slice(rows.indexOf(header) + 2).map(row => (row.split('|')[at] || '').trim());
  if (cells.length === 0) throw new Error('the lifecycle map carries no row under its header');
  return cells;
}

test('the workflow steps run contiguously from 1', () => {
  const numbers = steps().map(step => step.number);
  assert.deepStrictEqual(numbers, numbers.map((_, at) => at + 1),
    'a step inserted or dropped renumbers every step after it');
});

test('every step cited by name is one the workflow carries', () => {
  const names = steps().map(step => step.name);
  const citations = [];
  for (const region of citingRegions())
    for (const citation of region.text.matchAll(named)) {
      citations.push(citation[1]);
      assert.ok(resolvesToSteps(citation[1], names),
        `${region.where} cites "${citation[1]}" as a step, and the workflow carries ${names.join(', ')}`);
    }
  assert.ok(citations.length > 0,
    'no step is cited by name at all, so nothing outside the workflow resolves against its markers');
});

test('every row of the lifecycle map names the step it sits at', () => {
  const names = steps().map(step => step.name);
  for (const cell of stepColumn()) {
    assert.deepStrictEqual(numbersIn(cell), [],
      `the lifecycle map places a row at "${cell}", where a number is renumbered by hand`);
    assert.ok(cell === 'none' || cell === '—' || names.some(name => cell.includes(name)),
      `"${cell}" names none of the steps: ${names.join(', ')}`);
  }
});
