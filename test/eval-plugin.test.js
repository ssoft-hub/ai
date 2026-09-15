'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { plan, build } = require('../tools/eval-plugin');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
}

function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function writeFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// A repository of two skills, `a` naming `b` in `with:`, with cases for `a` alone.
function fixtureRepo() {
  const repo = mkTmp();
  writeFile(path.join(repo, 'package.json'), '{ "name": "fixture", "version": "9.9.9" }\n');
  writeFile(path.join(repo, '.claude-plugin', 'plugin.json'), '{ "name": "claude-config", "version": "9.9.9" }\n');
  writeFile(path.join(repo, 'skills', 'a', 'SKILL.md'),
    '---\nname: a\ndescription: skill a\nmetadata:\n  with:\n    - b\n---\n\n# a\n');
  writeFile(path.join(repo, 'skills', 'a', 'table.md'), 'data beside the skill\n');
  writeFile(path.join(repo, 'skills', 'b', 'SKILL.md'), '---\nname: b\ndescription: skill b\n---\n\n# b\n');
  writeFile(path.join(repo, 'evals', 'a', 'case-1', 'prompt.md'), 'prompt\n');
  writeFile(path.join(repo, 'evals', 'a', 'case-1', 'graders', 'rule.md'), 'grader\n');
  return repo;
}

test('a skill that does not exist is a named error', () => {
  const repo = fixtureRepo();
  try {
    assert.throws(() => plan(repo, ['a', 'nope']), /nope/);
  } finally { rmTmp(repo); }
});

test('a skill name carrying a path separator is a named error and builds nothing', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const name = `../${path.basename(repo)}/skills/a`;
    assert.throws(() => build(repo, [name], out), /is not a skill name/);
    assert.deepStrictEqual(fs.readdirSync(out), []);
    assert.ok(fs.existsSync(path.join(repo, 'skills', 'a', 'SKILL.md')), 'the skill directory is untouched');
  } finally { rmTmp(repo); rmTmp(out); }
});

test('an empty list is an error', () => {
  const repo = fixtureRepo();
  try {
    assert.throws(() => plan(repo, []), /skill/);
  } finally { rmTmp(repo); }
});

test('a listed skill whose with: names a skill absent from the list is a warning naming both', () => {
  const repo = fixtureRepo();
  try {
    const { warnings } = plan(repo, ['a']);
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0], /\ba\b/);
    assert.match(warnings[0], /\bb\b/);
    assert.match(warnings[0], /with:/);
  } finally { rmTmp(repo); }
});

test('a with: companion present in the list raises no warning', () => {
  const repo = fixtureRepo();
  try {
    const { warnings } = plan(repo, ['a', 'b']);
    assert.deepStrictEqual(warnings.filter(w => w.includes('with:')), []);
  } finally { rmTmp(repo); }
});

test('a listed skill with no cases is a warning naming it', () => {
  const repo = fixtureRepo();
  try {
    const { warnings } = plan(repo, ['a', 'b']);
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0], /\bb\b/);
    assert.match(warnings[0], /evals/);
  } finally { rmTmp(repo); }
});

test('a list of one builds a root holding that skill, its cases and a manifest', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const { root } = build(repo, ['a'], out);
    assert.strictEqual(root, path.join(out, 'a'));
    assert.ok(fs.existsSync(path.join(root, 'skills', 'a', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(root, 'skills', 'a', 'table.md')), 'the whole skill directory ships');
    assert.ok(fs.existsSync(path.join(root, 'evals', 'a', 'case-1', 'graders', 'rule.md')));
    assert.ok(!fs.existsSync(path.join(root, 'skills', 'b')), 'a skill outside the list stays out');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.strictEqual(manifest.name, 'claude-config');
    assert.strictEqual(manifest.version, '9.9.9', 'the version is package.json\'s');
    assert.match(manifest.description, /\ba\b/);
  } finally { rmTmp(repo); rmTmp(out); }
});

test('the manifest carries the keys the plugin schema knows and no other', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const { root } = build(repo, ['a'], out);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.deepStrictEqual(Object.keys(manifest).sort(), ['description', 'name', 'version']);
  } finally { rmTmp(repo); rmTmp(out); }
});

test('a build leaves a marker of its own naming the tool that wrote it and the list', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const { root } = build(repo, ['a', 'b'], out);
    const marker = JSON.parse(fs.readFileSync(path.join(root, '.eval-plugin-build.json'), 'utf8'));
    assert.strictEqual(marker.builtBy, 'tools/eval-plugin.js');
    assert.deepStrictEqual(marker.skills, ['a', 'b']);
  } finally { rmTmp(repo); rmTmp(out); }
});

test('a list of two builds a root named by the list joined with +', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const { root } = build(repo, ['a', 'b'], out);
    assert.strictEqual(root, path.join(out, 'a+b'));
    assert.ok(fs.existsSync(path.join(root, 'skills', 'a', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(root, 'skills', 'b', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(root, 'evals', 'a', 'case-1', 'prompt.md')));
    assert.ok(!fs.existsSync(path.join(root, 'evals', 'b')), 'no cases, no directory');
  } finally { rmTmp(repo); rmTmp(out); }
});

test('an output root inside the repository is refused before anything is removed or written', () => {
  const repo = fixtureRepo();
  try {
    const inside = path.join(repo, 'skills');
    assert.throws(() => build(repo, ['a'], inside), /inside the repository/);
    assert.ok(fs.existsSync(path.join(repo, 'skills', 'a', 'SKILL.md')), 'the skill directory the list names is untouched');
    assert.ok(!fs.existsSync(path.join(inside, 'a', '.claude-plugin')), 'nothing built');
  } finally { rmTmp(repo); }
});

test('an output root holding the repository is refused before anything is removed', () => {
  const source = fixtureRepo();
  const out = mkTmp();
  const repo = path.join(out, 'a', 'repo');
  try {
    fs.cpSync(source, repo, { recursive: true });
    assert.throws(() => build(repo, ['a'], out), /is inside the output root/);
    assert.ok(fs.existsSync(path.join(repo, 'skills', 'a', 'SKILL.md')), 'the checkout survives');
    assert.ok(!fs.existsSync(path.join(out, 'a', '.claude-plugin')), 'nothing built');
  } finally { rmTmp(source); rmTmp(out); }
});

test('an output root that does not exist yet is created', () => {
  const repo = fixtureRepo();
  const tmp = mkTmp();
  try {
    const out = path.join(tmp, 'not', 'yet');
    const { root } = build(repo, ['a'], out);
    assert.strictEqual(root, path.join(out, 'a'));
    assert.ok(fs.existsSync(path.join(root, '.claude-plugin', 'plugin.json')));
  } finally { rmTmp(repo); rmTmp(tmp); }
});

test('a rebuild carries nothing over from the previous build of the same list', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const { root } = build(repo, ['a'], out);
    const stale = path.join(root, 'evals', 'a', 'gone', 'prompt.md');
    writeFile(stale, 'a case since deleted\n');
    build(repo, ['a'], out);
    assert.ok(!fs.existsSync(stale));
  } finally { rmTmp(repo); rmTmp(out); }
});

test('build returns the warnings of its plan', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const { warnings } = build(repo, ['a'], out);
    assert.strictEqual(warnings.length, 1);
  } finally { rmTmp(repo); rmTmp(out); }
});

const { spawnSync } = require('node:child_process');
const toolJs = path.join(__dirname, '..', 'tools', 'eval-plugin.js');

test('run as a script, an unknown skill exits 1 with the error on stderr and builds nothing', () => {
  const out = mkTmp();
  try {
    const r = spawnSync('node', [toolJs, '--out', out, 'no-such-skill'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /no-such-skill/);
    assert.deepStrictEqual(fs.readdirSync(out), []);
  } finally { rmTmp(out); }
});

test('run as a script, --out with no directory after it exits 1 and builds nothing', () => {
  const out = mkTmp();
  try {
    const r = spawnSync('node', [toolJs, 'comments', '--out'], { cwd: out, encoding: 'utf8' });
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /--out/);
    assert.deepStrictEqual(fs.readdirSync(out), []);
  } finally { rmTmp(out); }
});

test('run as a script, a list prints the built root on stdout and the warnings on stderr', () => {
  const out = mkTmp();
  try {
    const r = spawnSync('node', [toolJs, '--out', out, 'comments'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(r.stdout.trim(), path.join(out, 'comments'));
    assert.ok(fs.existsSync(path.join(out, 'comments', 'skills', 'comments', 'SKILL.md')));
  } finally { rmTmp(out); }
});

test('a root that exists and is no build of this plugin is refused, and what sits there stays', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const occupied = path.join(out, 'a');
    writeFile(path.join(occupied, 'work.txt'), 'a directory that happens to be named after the list\n');
    assert.throws(() => build(repo, ['a'], out), /no build of/);
    assert.strictEqual(fs.readFileSync(path.join(occupied, 'work.txt'), 'utf8'),
      'a directory that happens to be named after the list\n');
  } finally { rmTmp(repo); rmTmp(out); }
});

test('a checkout of the repository under the output root is refused, and its files stay', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    const occupied = path.join(out, 'a');
    fs.cpSync(repo, occupied, { recursive: true });
    assert.throws(() => build(repo, ['a'], out), /no build of/);
    assert.ok(fs.existsSync(path.join(occupied, 'skills', 'a', 'SKILL.md')), 'the checkout survives');
    assert.ok(fs.existsSync(path.join(occupied, 'package.json')));
  } finally { rmTmp(repo); rmTmp(out); }
});

test('a repository carrying no plugin manifest is a named error', () => {
  const repo = fixtureRepo();
  const out = mkTmp();
  try {
    fs.rmSync(path.join(repo, '.claude-plugin'), { recursive: true, force: true });
    assert.throws(() => build(repo, ['a'], out), /\.claude-plugin/);
  } finally { rmTmp(repo); rmTmp(out); }
});
