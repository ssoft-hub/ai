'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');
const skillsDir = path.join(repoDir, 'skills');

function corpusFiles() {
  const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(skillsDir, entry.name, 'SKILL.md'))
    .filter(file => fs.existsSync(file));
  return [...skills, path.join(repoDir, 'AGENTS.md')];
}

const COLOUR = /^(?:red|green|amber|yellow|orange)(?:d?en)?(?:s|ed|ing|ish)?$/;

function isInitialism(word) {
  return /^[A-Z]{2,}$/.test(word);
}

function colourFaults(text) {
  const faults = [];
  let fenced = false;
  String(text).replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    for (const word of line.replace(/`[^`\n]*`/g, ' ').match(/[A-Za-z]+/g) || []) {
      if (!isInitialism(word) && COLOUR.test(word.toLowerCase())) {
        faults.push({ line: index + 1, word });
      }
    }
  });
  return faults;
}

test('a colour standing for a state is a fault', () => {
  assert.deepStrictEqual(colourFaults('a green suite is the only safe time'),
    [{ line: 1, word: 'green' }]);
});

test('a verb made out of a colour reports a state the same way', () => {
  assert.deepStrictEqual(colourFaults('one more commit reddens the suite'),
    [{ line: 1, word: 'reddens' }]);
});

test('a colour naming a phase of a practice is a fault like any other', () => {
  assert.deepStrictEqual(colourFaults('hands off the red-green-refactor order'),
    [{ line: 1, word: 'red' }, { line: 1, word: 'green' }]);
});

test('a colour inside a code span is quoted rather than used', () => {
  assert.deepStrictEqual(colourFaults('the phrase `CI green` names no condition'), []);
});

test('an initialism spelling a colour is not one', () => {
  assert.deepStrictEqual(colourFaults('cover RED: rate, error rate, duration'), []);
});

test('a fenced block is a sample rather than prose', () => {
  assert.deepStrictEqual(colourFaults('```\ngh pr checks --until green\n```'), []);
});

test('no colour in the corpus stands for a state', () => {
  const faults = [];
  for (const file of corpusFiles()) {
    const relative = path.relative(repoDir, file).replace(/\\/g, '/');
    for (const fault of colourFaults(fs.readFileSync(file, 'utf8'))) {
      faults.push(`${relative}:${fault.line}: ${fault.word}`);
    }
  }
  assert.deepStrictEqual(faults, [], `name the state instead:\n${faults.join('\n')}`);
});
