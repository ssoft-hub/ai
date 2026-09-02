'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const repoDir = path.join(__dirname, '..');
const skillFile = path.join(repoDir, 'skills', 'code-navigation', 'SKILL.md');

function readSkill() {
  return fs.readFileSync(skillFile, 'utf8');
}

// The two commands the skill prints carry the term and the directory they run over, so
// the test measures the example the reader is shown rather than a copy of it.
function printedSearch() {
  const text = readSkill();
  const boundary = text.match(/\$ grep -rilw "([^"]+)" (\S+)/);
  const substring = text.match(/\$ grep -ril\s+"([^"]+)" (\S+)/);
  assert.ok(boundary && substring, 'the skill prints no word-boundary and substring pair');
  assert.strictEqual(boundary[1], substring[1], 'the two runs search different terms');
  assert.strictEqual(boundary[2], substring[2], 'the two runs search different directories');
  return { term: boundary[1], dir: boundary[2].replace(/\/$/, '') };
}

function filesUnder(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(full));
    else found.push(full);
  }
  return found;
}

function matching(term, dir, wordBoundary) {
  const pattern = new RegExp(wordBoundary ? `\\b${term}\\b` : term, 'i');
  return filesUnder(path.join(repoDir, dir))
    .filter(file => pattern.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(repoDir, file).split(path.sep).join('/'));
}

test('the word-boundary run matches the owner of the example alone', () => {
  const { term, dir } = printedSearch();
  assert.deepStrictEqual(matching(term, dir, true), ['skills/code-navigation/SKILL.md']);
});

test('every file the substring run adds holds the term inside a longer word', () => {
  const { term, dir } = printedSearch();
  const boundary = new Set(matching(term, dir, true));
  const added = matching(term, dir, false).filter(file => !boundary.has(file));
  assert.ok(added.length > 0, 'the substring run adds no file, so the example shows nothing');
  const pattern = new RegExp(`\\b${term}\\b`, 'i');
  for (const file of added) {
    assert.ok(!pattern.test(fs.readFileSync(path.join(repoDir, file), 'utf8')),
      `${file} holds ${term} on a word boundary, so it is not a longer-word match`);
  }
});

test('every word the skill names as a longer-word match is one', () => {
  const { term, dir } = printedSearch();
  const sentence = readSkill().match(/form adds —([\s\S]*?)among those words/);
  const words = sentence ? [...sentence[1].matchAll(/`([A-Za-z]+)`/g)].map(hit => hit[1]) : [];
  const added = new Set(matching(term, dir, false).filter(file => !matching(term, dir, true).includes(file)));
  const corpus = [...added].map(file => fs.readFileSync(path.join(repoDir, file), 'utf8')).join('\n');
  for (const word of words) {
    assert.ok(new RegExp(`\\b${word}\\b`, 'i').test(corpus),
      `the skill names ${word} as a longer-word match, and no file the run adds holds it`);
    assert.ok(new RegExp(term, 'i').test(word) && !new RegExp(`^${term}$`, 'i').test(word),
      `${word} does not hold ${term} inside a longer word`);
  }
});
