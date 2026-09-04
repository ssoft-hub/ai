'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { globToRegExp, parseFrontmatter } = require('../tools/skill-catalog');

const repoDir = path.join(__dirname, '..');
const skillsDir = path.join(repoDir, 'skills');

// A name a tool or an outside convention fixes for every project stands in neither table
// below, so nothing has to exempt it: `CHANGELOG.md` the changelog format's, `package.json`
// the package manifest, `jsconfig.json` the language server's configuration, `.github/` the
// hosting platform's workflow directory, `.gitignore` the ignore file.

// Stated, not derived: the project a skill is applied in is absent when this test runs, so
// no tree can supply these. Each row names what reads the file, and so why a rule naming it
// states nothing where the project keeps none. A name a tool fixes for itself is no row.
const CONVENTION_FILES = {
  'AGENTS.md': "a coding agent, which reads a project's instructions under this name",
  'CLAUDE.md': "Claude Code, which reads a project's instructions under this name",
  'GEMINI.md': "the Gemini CLI, which reads a project's instructions under this name",
  '.cursorrules': 'the Cursor editor, which reads its project rules under this name',
  'CONTRIBUTING.md': 'the forge, which offers it to anyone opening an issue or a pull request',
  'README.md': "the forge, which renders it as the project's front page",
  'CODEOWNERS': 'the forge, which reads it to request a review from the owner of a path',
  'CODE_OF_CONDUCT.md': "the forge, which lists it in the project's community profile",
  'SECURITY.md': "the forge, which publishes it as the project's security policy",
};

// This repository's own paths, each beside what it holds. None of them is delivered with a
// skill, so a rule naming one is false wherever that skill is applied. A trailing slash
// marks a directory.
const REPOSITORY_PATHS = {
  'agents/': 'the persona subagents this repository installs as its own configuration',
  'commands/': 'the slash commands it installs',
  'config/': 'what its install deploys as configuration',
  'hooks/': 'its dispatchers, one per event of the agent tool',
  'lib/': 'the helpers its install and uninstall share',
  'skills/': 'the skill files this catalog ships',
  'templates/': 'the starting points a new skill, agent or command is copied from',
  'test/': 'its own test files',
  'tools/': 'the tool scripts its dispatchers route to',
  'install.js': 'its bootstrap script',
  'uninstall.js': 'the script restoring the state before install',
};

// Both halves of the rule, each a stated list: what a project keeps its conventions in, and
// what belongs to this repository alone.
function forbidden(...tables) {
  const files = new Set();
  const dirs = new Set();
  for (const name of tables.flatMap(table => Object.keys(table))) {
    if (name.endsWith('/')) dirs.add(name.slice(0, -1));
    else files.add(name);
  }
  return { files, dirs };
}

const FORBIDDEN = forbidden(CONVENTION_FILES, REPOSITORY_PATHS);

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const longestFirst = names => [...names].sort((a, b) => b.length - a.length).map(escapeRegExp);

// A name under some directory is another project's copy of it, and a file name followed by
// `.` and a word is another file's.
function mentionPattern({ files, dirs }) {
  const alternatives = [];
  if (dirs.size) alternatives.push(`(?:${longestFirst(dirs).join('|')})/`);
  if (files.size) alternatives.push(`(?:${longestFirst(files).join('|')})(?![\\w-]|\\.\\w)`);
  return new RegExp(`(?<![\\w./-])(?:${alternatives.join('|')})`, 'g');
}

function mentions(text, entries) {
  const pattern = mentionPattern(entries);
  const found = [];
  String(text).replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    for (const match of line.matchAll(pattern)) found.push({ line: index + 1, token: match[0] });
  });
  return found;
}

// Indented, because every other key the routing reads sits under `metadata:`.
const RELATION = /^[ \t]+project-relation:[ \t]*(\S+)[ \t]*$/m;

function frontmatter(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  if (!body.startsWith('---\n')) return '';
  const closing = body.indexOf('\n---', 4);
  return closing === -1 ? '' : body.slice(4, closing);
}

function skillRecord(name, text) {
  return {
    name,
    text,
    relation: frontmatter(text).match(RELATION)?.[1] ?? 'overrides',
    paths: parseFrontmatter(text).paths ?? [],
  };
}

const A_SKILL_FILE = 'skills/some-skill/SKILL.md';

// The skill whose paths claim a skill file is the one stating how a skill is written.
function statesHowASkillIsWritten(record) {
  return record.paths.some(glob => globToRegExp(glob).test(A_SKILL_FILE));
}

// A binding skill states this repository's own conventions, so its paths are its subject.
function exempt(record) {
  return record.relation === 'binding' || statesHowASkillIsWritten(record);
}

// One entry per mention, so the failure names the line and the token to reword.
function faults(record, entries) {
  if (exempt(record)) return [];
  return mentions(record.text, entries)
    .map(({ line, token }) => `line ${line}: ${token}`);
}

function skillRecords() {
  const names = fs.readdirSync(skillsDir)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
  // A vacuous pass would hide the skills going missing entirely.
  if (names.length === 0) throw new Error(`no skill files in ${skillsDir}`);
  return names.map(name =>
    skillRecord(name, fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8')));
}

// The frontmatter and body of a skill file, assembled so each fixture states only what
// its test is about.
const HEADER = '---\nname: fixture\ndescription: Apply when testing\nmetadata:\n  tier: narrow\n';
const HEADER_CLOSE = '---\n\n# Skill: Fixture\n\n';

function skillFile(metadataLines, body) {
  return HEADER + metadataLines + HEADER_CLOSE + body;
}

// A fixture states where a token sits in its own body; the header above it is counted here,
// so a line added to the header moves no expectation.
function fixture(metadataLines, body) {
  const firstBodyLine = (HEADER + metadataLines + HEADER_CLOSE).split('\n').length;
  return {
    record: skillRecord('fixture', skillFile(metadataLines, body)),
    at: (offset, token) => `line ${firstBodyLine + offset}: ${token}`,
  };
}

test('names a convention file of the project at the line naming it', () => {
  const { record, at } = fixture('', 'A rule.\n\nCheck the project `AGENTS.md` first.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), [at(2, 'AGENTS.md')]);
});

test('names a convention file that is no path of this repository', () => {
  const { record, at } = fixture('', 'Record the convention in `GEMINI.md`.\n');
  assert.ok(!Object.keys(REPOSITORY_PATHS).includes('GEMINI.md'),
    'the stated convention table is the only source of the name');
  assert.deepStrictEqual(faults(record, FORBIDDEN), [at(0, 'GEMINI.md')]);
});

test('leaves a name neither stated table holds', () => {
  const { record } = fixture('', 'Record the decision in `DECISIONS.md`.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), []);
});

test('names a path of this repository by its trailing slash', () => {
  const { record, at } = fixture('', 'The dispatchers live under `hooks/`.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), [at(0, 'hooks/')]);
});

test('names a file mentioned outside backticks as well', () => {
  const { record, at } = fixture('', 'See README.md for the list.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), [at(0, 'README.md')]);
});

test('leaves a name standing under another directory', () => {
  const { record } = fixture('', 'Installed to `~/.claude/hooks/` and `docs/README.md`.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), []);
});

test('leaves a longer file name a stated name is a prefix of', () => {
  const { record } = fixture('', 'Keep `README.md.bak` and `install.js.map` out.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), []);
});

test('names a file at the end of a sentence', () => {
  const { record, at } = fixture('', 'Look in README.md.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), [at(0, 'README.md')]);
});

test('names each path of this repository a line carries', () => {
  const { record, at } = fixture('', 'Under `test/` and `hooks/`.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), [at(0, 'test/'), at(0, 'hooks/')]);
});

test('every convention file of a project states what reads it', () => {
  for (const [name, basis] of Object.entries(CONVENTION_FILES)) {
    assert.ok(typeof basis === 'string' && basis.trim() !== '', `${name} names no reader`);
  }
});

test('every path of this repository states what it holds', () => {
  for (const [name, holds] of Object.entries(REPOSITORY_PATHS)) {
    assert.ok(typeof holds === 'string' && holds.trim() !== '', `${name} says what it holds`);
  }
});

test('exempts a skill declaring project-relation binding', () => {
  const { record } = fixture('  project-relation: binding\n',
    'The dispatchers live under `hooks/`, per `AGENTS.md`.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), []);
});

test('exempts the skill whose paths claim a skill file', () => {
  const { record } = fixture('  paths:\n    - "**/skills/*/SKILL.md"\n',
    'Index it as `AGENTS.md` states.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), []);
});

test('exempts no skill whose paths claim something other than a skill file', () => {
  const { record, at } = fixture('  paths:\n    - "**/*.hpp"\n',
    'Index it as `AGENTS.md` states.\n');
  assert.deepStrictEqual(faults(record, FORBIDDEN), [at(0, 'AGENTS.md')]);
});

test('no skill names a file of the project it is applied in, or a path of this repository', () => {
  // Every skill in one map, so a run names each file left to reword.
  const found = {};
  for (const record of skillRecords()) {
    const own = faults(record, FORBIDDEN);
    if (own.length) found[`skills/${record.name}/SKILL.md`] = own;
  }
  assert.deepStrictEqual(found, {});
});
