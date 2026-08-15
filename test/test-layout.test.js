'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const testDir = __dirname;

// `node --test` loads every .js, .cjs and .mjs file under a directory named `test`,
// recursively and whatever its name.
function scriptsUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return scriptsUnder(full);
    return /\.(js|cjs|mjs)$/.test(entry.name) ? [path.relative(testDir, full)] : [];
  });
}

function loadedScripts() {
  const scripts = scriptsUnder(testDir);
  // A vacuous pass would hide the walk reaching nothing at all.
  if (scripts.length === 0) throw new Error(`no script files under ${testDir}`);
  return scripts;
}

test('every script under test/ is itself a test file', () => {
  for (const script of loadedScripts()) {
    assert.ok(script.endsWith('.test.js'),
      `${script} is loaded and run as a test by \`node --test\`, so it has to be one`);
  }
});
