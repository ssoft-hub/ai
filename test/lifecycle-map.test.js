'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');
const agentsPath = path.join(repoDir, 'AGENTS.md');
const skillsDir = path.join(repoDir, 'skills');

const COLUMNS = ['Skill', 'Stage', 'Trigger', 'Input', 'Output',
  'Entry criterion', 'Exit criterion'];

function isSeparatorRow(row) {
  return row.length > 0 && row.every(cell => /^:?-+:?$/.test(cell));
}

function parseRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

// The two markdown tables sitting under the "### Lifecycle map" heading, up to the next
// heading of level 1-3. Each is returned as { header, rows }, the separator row dropped.
function lifecycleMapTables() {
  const text = fs.readFileSync(agentsPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const start = lines.findIndex(l => l.trim() === '### Lifecycle map');
  assert.notStrictEqual(start, -1, 'AGENTS.md carries no ### Lifecycle map heading');
  let end = lines.findIndex((l, i) => i > start && /^#{1,3}\s/.test(l));
  if (end === -1) end = lines.length;

  const blocks = [];
  let current = null;
  for (const line of lines.slice(start + 1, end)) {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (!current) { current = []; blocks.push(current); }
      current.push(parseRow(line));
    } else {
      current = null;
    }
  }
  assert.strictEqual(blocks.length, 2,
    `### Lifecycle map carries ${blocks.length} table(s) below its heading, expected 2`);

  return blocks.map(rawRows => {
    const [header, ...rest] = rawRows;
    return { header, rows: rest.filter(r => !isSeparatorRow(r)) };
  });
}

function columnIndex(header, name) {
  const idx = header.indexOf(name);
  assert.notStrictEqual(idx, -1, `column ${name} is missing from header ${JSON.stringify(header)}`);
  return idx;
}

function namesSkill(cellText, skillName) {
  return cellText.includes('`' + skillName + '`');
}

// A vacuous pass would hide the skills going missing entirely.
function skillDirectories() {
  const names = fs.readdirSync(skillsDir)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
  if (names.length === 0) throw new Error(`no skill directories found in ${skillsDir}`);
  return names;
}

test('every directory under skills/ is named in the stage table or the second table', () => {
  const [stageTable, secondTable] = lifecycleMapTables();
  const stageSkillsCol = columnIndex(stageTable.header, 'Skills');
  const secondSkillCol = columnIndex(secondTable.header, 'Skill');

  const stageText = stageTable.rows.map(r => r[stageSkillsCol]).join(' ');
  const secondText = secondTable.rows.map(r => r[secondSkillCol]).join(' ');

  const missing = skillDirectories().filter(
    name => !namesSkill(stageText, name) && !namesSkill(secondText, name));
  assert.deepStrictEqual(missing, []);
});

test('the second table carries the seven columns in order', () => {
  const [, secondTable] = lifecycleMapTables();
  assert.deepStrictEqual(secondTable.header, COLUMNS);
});

test('every row of the second table holds one cell per column', () => {
  const [, secondTable] = lifecycleMapTables();
  const skillCol = columnIndex(secondTable.header, 'Skill');
  const wrong = secondTable.rows
    .filter(row => row.length !== secondTable.header.length)
    .map(row => `${row[skillCol] || '(unnamed row)'}: ${row.length} cells`);
  assert.deepStrictEqual(wrong, []);
});

test('every cell of the second table is filled', () => {
  const [, secondTable] = lifecycleMapTables();
  const skillCol = columnIndex(secondTable.header, 'Skill');

  const empty = [];
  for (const row of secondTable.rows) {
    row.forEach((cell, i) => {
      if (cell.trim() === '') empty.push(`${row[skillCol] || '(unnamed row)'}.${secondTable.header[i]}`);
    });
  }
  assert.deepStrictEqual(empty, []);
});

test('every Stage cell in the second table names a stage of the table above or cross-cutting', () => {
  const [stageTable, secondTable] = lifecycleMapTables();
  const stageCol = columnIndex(stageTable.header, 'Stage');
  const stageNames = stageTable.rows.map(r => r[stageCol]);

  const secondStageCol = columnIndex(secondTable.header, 'Stage');
  const secondSkillCol = columnIndex(secondTable.header, 'Skill');

  const invalid = secondTable.rows
    .filter(r => r[secondStageCol] !== 'cross-cutting' && !stageNames.includes(r[secondStageCol]))
    .map(r => `${r[secondSkillCol]}: ${r[secondStageCol]}`);
  assert.deepStrictEqual(invalid, []);
});

test('a second-table row naming a stage is named in that stage row\'s Skills cell', () => {
  const [stageTable, secondTable] = lifecycleMapTables();
  const stageCol = columnIndex(stageTable.header, 'Stage');
  const stageSkillsCol = columnIndex(stageTable.header, 'Skills');
  const secondStageCol = columnIndex(secondTable.header, 'Stage');
  const secondSkillCol = columnIndex(secondTable.header, 'Skill');

  const disagreements = [];
  for (const row of secondTable.rows) {
    const stageName = row[secondStageCol];
    if (stageName === 'cross-cutting') continue;
    // A stage name absent from the table above is caught by the previous test; nothing
    // here can be checked against a row that does not exist.
    const stageRow = stageTable.rows.find(r => r[stageCol] === stageName);
    if (!stageRow) continue;
    const skillName = row[secondSkillCol].replace(/`/g, '');
    if (!namesSkill(stageRow[stageSkillsCol], skillName)) {
      disagreements.push(`${skillName} -> ${stageName}`);
    }
  }
  assert.deepStrictEqual(disagreements, []);
});
