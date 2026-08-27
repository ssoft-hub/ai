'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');

// Paths under `dir`, relative to it, in the `/` form config/retired.json is written in.
// `exclude` holds top-level names only, which is where install.js applies its own.
function filesUnder(dir, exclude = new Set()) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (exclude.has(entry.name)) return [];
    if (!entry.isDirectory()) return [entry.name];
    return filesUnder(path.join(dir, entry.name)).map(rel => `${entry.name}/${rel}`);
  });
}

// install.js copies one file out of each skill directory and nothing beside it.
function skillFiles() {
  const skillsDir = path.join(repoDir, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')))
    .map(name => `skills/${name}/SKILL.md`);
}

// The names install.js writes at the root of the config dir. Keyed on the destination
// rather than on what `config/` happens to hold: a source file renamed out from under
// this list would otherwise drop its destination out of `shipped()`, and a retired entry
// naming that destination would pass the very check meant to catch it.
function configFiles() {
  return ['settings.json', 'CLAUDE.md', 'claude-config-rules.md'];
}

// A retired entry names a path relative to the Claude config dir, so the set it is
// checked against is what install.js writes there rather than what the repo holds:
// `hooks/` without `README.md`, which documents the dispatchers rather than running
// beside them; `tools/`, `agents/` and `commands/` whole; one `SKILL.md` per skill; and
// the three names it writes at the root of the config dir.
function shipped() {
  const paths = new Set();
  const addAll = dests => { for (const dest of dests) paths.add(dest); };
  // A vacuous pass would hide the walk having missed a source install copies. Only the
  // four install warns about when they are absent are held to it; `agents/` and
  // `commands/` are optional there, since a fresh checkout may carry neither.
  const add = (from, dests) => {
    if (!dests.length) throw new Error(`no file found under ${from}, which install.js copies`);
    addAll(dests);
  };
  add('hooks/', filesUnder(path.join(repoDir, 'hooks'), new Set(['README.md'])).map(rel => `hooks/${rel}`));
  add('tools/', filesUnder(path.join(repoDir, 'tools')).map(rel => `tools/${rel}`));
  add('skills/', skillFiles());
  add('config/', configFiles());
  addAll(filesUnder(path.join(repoDir, 'agents')).map(rel => `agents/${rel}`));
  addAll(filesUnder(path.join(repoDir, 'commands')).map(rel => `commands/${rel}`));
  return paths;
}

function retiredPaths() {
  const src = path.join(repoDir, 'config', 'retired.json');
  const listed = JSON.parse(fs.readFileSync(src, 'utf8')).retired;
  if (!Array.isArray(listed)) throw new Error(`${src} carries no retired array`);
  return listed;
}

test('no entry in config/retired.json names a path this repo still ships', () => {
  const paths = shipped();
  for (const entry of retiredPaths()) {
    assert.ok(!paths.has(entry),
      `${entry} is retired in config/retired.json and still shipped by this repo: install `
      + 'creates the file, so the retired-path warning never fires and the path is both at '
      + 'once. Drop the entry, or drop the file the repo still ships under it.');
  }
});

