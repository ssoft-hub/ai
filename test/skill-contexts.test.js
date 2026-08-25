'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../tools/skill-catalog');

const repoDir = path.join(__dirname, '..');
const skillsDir = path.join(repoDir, 'skills');
const vocabularyFile = path.join(repoDir, 'config', 'skill-contexts.json');

// An empty vocabulary would resolve every declaration against nothing, so it throws.
function readVocabulary() {
  const contexts = JSON.parse(fs.readFileSync(vocabularyFile, 'utf8')).contexts;
  if (!contexts || Object.keys(contexts).length === 0) {
    throw new Error(`no contexts in ${vocabularyFile}`);
  }
  return contexts;
}

// A context and its ancestors, nearest first. A chain stopping short of the root would
// let a forbidden naming resolve as allowed, so an undefined parent or a cycle throws.
function chain(contexts, name) {
  const seen = [];
  for (let at = name; at !== null && at !== undefined; at = contexts[at].parent) {
    if (!(at in contexts)) throw new Error(`context "${at}" is not in the vocabulary`);
    if (seen.includes(at)) throw new Error(`context "${at}" is its own ancestor`);
    seen.push(at);
  }
  return seen;
}

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

// A skill is referenced by its own name in backticks. Resolving each backticked token
// against the directories under `skills/` catches a skill added under a prefix nobody has
// thought of yet, where a list of known prefixes would miss it silently.
function skillsNamed(text, catalogue) {
  return [...new Set([...text.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/g)].map(match => match[1]))]
    .filter(name => catalogue.has(name));
}

// A category is reachable from anywhere; an instance only from inside it.
function reaches(contexts, own, required) {
  if (!(required in contexts)) throw new Error(`context "${required}" is not in the vocabulary`);
  if (contexts[required].kind === 'category') return true;
  return own.some(context => chain(contexts, context).includes(required));
}

// Read through the parser the gate and the reminder read, so all three agree.
function boundTo(name) {
  return parseFrontmatter(readSkill(name)).boundTo ?? [];
}

test('every context names a parent the vocabulary defines', () => {
  const contexts = readVocabulary();
  for (const [name, entry] of Object.entries(contexts)) {
    if (name === 'universal') {
      assert.strictEqual(entry.parent, null, 'universal is the root and has no parent');
      continue;
    }
    assert.ok(entry.parent in contexts,
      `context "${name}" names parent "${entry.parent}", which the vocabulary does not define`);
  }
});

test('every context reaches universal through its parents', () => {
  const contexts = readVocabulary();
  for (const name of Object.keys(contexts)) {
    assert.strictEqual(chain(contexts, name).at(-1), 'universal',
      `context "${name}" does not reach the root of the vocabulary`);
  }
});

const KINDS = ['category', 'instance'];

test('every context declares whether it is a category or an instance', () => {
  const contexts = readVocabulary();
  for (const [name, entry] of Object.entries(contexts)) {
    assert.ok(KINDS.includes(entry.kind),
      `context "${name}" declares kind ${JSON.stringify(entry.kind)}, which is not one of ${KINDS.join(', ')}`);
  }
});

test('every context says what it means', () => {
  const contexts = readVocabulary();
  for (const [name, entry] of Object.entries(contexts)) {
    assert.ok(typeof entry.means === 'string' && entry.means.trim() !== '',
      `context "${name}" says nothing about what it means`);
  }
});

test('every skill declares a context its rules are bound to', () => {
  for (const name of skillCatalogue()) {
    assert.ok(boundTo(name).length > 0,
      `skill "${name}" declares no bound-to, so nothing says which readers its rules are for`);
  }
});

test('every context a skill declares is one the vocabulary defines', () => {
  const contexts = readVocabulary();
  for (const name of skillCatalogue()) {
    for (const context of boundTo(name)) {
      assert.ok(context in contexts,
        `skill "${name}" declares context "${context}", which the vocabulary does not define`);
    }
  }
});

test('a skill declaring universal declares nothing beside it', () => {
  for (const name of skillCatalogue()) {
    const declared = boundTo(name);
    assert.ok(!declared.includes('universal') || declared.length === 1,
      `skill "${name}" declares universal alongside ${declared.filter(c => c !== 'universal').join(', ')}`);
  }
});

// The other half of a routing: a role names a context by the noun its entry declares.
const ROLE_PHRASE = /skills? of the ([^,.;:)]*)/g;

function roleNouns(contexts) {
  const declared = Object.entries(contexts)
    .filter(([, entry]) => typeof entry.role === 'string' && entry.role.trim() !== '')
    .map(([name, entry]) => ({ name, noun: entry.role }));
  // With none declared every phrase fails, which is the defect, not the finding.
  if (declared.length === 0) throw new Error(`no context in ${vocabularyFile} declares a role`);
  return declared;
}

test('every role phrase names a context the vocabulary carries', () => {
  const nouns = roleNouns(readVocabulary());
  const unresolved = [];
  for (const name of skillCatalogue()) {
    // Only the definite form names a context; "of that language" carries it from before.
    const text = readSkill(name).replace(/\s+/g, ' ');
    for (const [, tail] of text.matchAll(ROLE_PHRASE)) {
      if (!nouns.some(({ noun }) => tail === noun || tail.startsWith(`${noun} `))) {
        unresolved.push(`${name}: "the ... skill of the ${tail.slice(0, 40)}"`);
      }
    }
  }
  assert.deepStrictEqual(unresolved, [],
    'a role names a context the vocabulary declares a noun for, so the reader can tell ' +
    'which of their own contexts picks the skill');
});

// A backticked skill name here is a routing, never an illustration: the ban is flat.
test('no skill names a skill bound to an instance its own context does not reach', () => {
  const contexts = readVocabulary();
  const catalogue = skillCatalogue();
  const forbidden = [];
  for (const name of catalogue) {
    const own = boundTo(name);
    for (const named of skillsNamed(readSkill(name), catalogue)) {
      if (named === name) continue;
      const out = boundTo(named).filter(context => !reaches(contexts, own, context));
      if (out.length > 0) forbidden.push(`${name} [${own}] names ${named} [${out}]`);
    }
  }
  assert.deepStrictEqual(forbidden, [],
    'a skill naming one bound to an instance its own reader may not be in routes by ' +
    'role — "the API-design skill of the language being written" — and names no skill');
});
