'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '..', 'skills');

// Skills the tradeoff axes may name because their own rules hold in every language.
// Empty: the axes name no skill at all, so naming one is a declaration to make here
// rather than an edit that passes unread.
const neutralSkills = [];

function readSkill(name) {
  return fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
}

function skillCatalogue() {
  const names = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  // A vacuous pass would hide the catalogue going missing entirely.
  if (names.length === 0) throw new Error(`no skill directories in ${skillsDir}`);
  return new Set(names);
}

// One `## ` section's body, up to the next heading of that level. Both throws keep a
// renamed or emptied heading from passing the check vacuously.
function section(text, heading) {
  const lines = text.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) throw new Error(`no "## ${heading}" section`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## '));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
  if (!body) throw new Error(`"## ${heading}" section is empty`);
  return body;
}

// A skill is referenced by its own name in backticks. Resolving each hyphenated token
// against the directories under `skills/` catches a skill added under a prefix nobody has
// thought of yet, where a list of known prefixes would miss it silently. A name carrying
// no hyphen is not matched; a language prefix brings one.
function skillsNamed(text, catalogue) {
  return [...text.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)+)`/g)]
    .map(match => match[1])
    .filter(name => catalogue.has(name) && !neutralSkills.includes(name));
}

// A backticked skill name here is a routing, never an illustration: the ban is flat.
test('the tradeoff axes of architecture name no skill outside the neutral list', () => {
  const axes = section(readSkill('architecture'), 'Common Tradeoff Axes');
  assert.deepStrictEqual(skillsNamed(axes, skillCatalogue()), [],
    'an axis applies in every language, so its rule is `architecture`\'s own to state');
});
