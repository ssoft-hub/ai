'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const agentsDir = path.join(__dirname, '..', 'agents');
const skillsDir = path.join(__dirname, '..', 'skills');

function personaFiles() {
  const files = fs.readdirSync(agentsDir).filter(name => name.endsWith('.md'));
  // A vacuous pass would hide the personas going missing entirely.
  if (files.length === 0) throw new Error(`no persona files in ${agentsDir}`);
  return files;
}

function readPersona(file) {
  return fs.readFileSync(path.join(agentsDir, file), 'utf8').replace(/\r\n/g, '\n');
}

// Only the top-level scalars: a nested `metadata:` key is indented and never shadows one.
function frontmatter(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---/);
  if (!block) return {};
  const fields = {};
  for (const line of block[1].split('\n')) {
    const field = line.match(/^([A-Za-z][\w-]*):[ \t]*(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

// A skill reference is `<name>` skill, or a `<a>` / `<b>` skills pair. The word after the
// name is what tells one apart from the persona and command names a body also backticks.
function namedSkills(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  return [...body.matchAll(/((?:`[a-z][a-z0-9-]*`(?:\s*(?:\/|and)\s*)?)+)\s+skills?\b/g)]
    .flatMap(mention => [...mention[1].matchAll(/`([a-z][a-z0-9-]*)`/g)].map(name => name[1]));
}

test('every persona lists the Skill tool in its frontmatter', () => {
  for (const file of personaFiles()) {
    const tools = (frontmatter(readPersona(file)).tools || '').split(',').map(name => name.trim());
    assert.ok(tools.includes('Skill'), `${file} cannot load a skill: tools: ${tools.join(', ')}`);
  }
});

test('every persona frontmatter carries a name', () => {
  for (const file of personaFiles()) {
    assert.ok(frontmatter(readPersona(file)).name, `${file} has no name in its frontmatter`);
  }
});

test('every persona frontmatter carries a description', () => {
  for (const file of personaFiles()) {
    assert.ok(frontmatter(readPersona(file)).description,
      `${file} has no description in its frontmatter, so nothing states when to invoke it`);
  }
});

test('every persona names at least one skill', () => {
  for (const file of personaFiles()) {
    assert.ok(namedSkills(readPersona(file)).length > 0,
      `${file} names no skill — the reference format changed, or the list was dropped`);
  }
});

test('every skill a persona names exists under skills/', () => {
  for (const file of personaFiles()) {
    for (const skill of namedSkills(readPersona(file))) {
      assert.ok(fs.existsSync(path.join(skillsDir, skill, 'SKILL.md')),
        `${file} names \`${skill}\` skill, which has no skills/${skill}/SKILL.md`);
    }
  }
});
