'use strict';
const fs = require('fs');
const path = require('path');

const MANIFEST = path.join('.claude-plugin', 'plugin.json');

// The file a build leaves behind, which a checkout of this repository carries no copy of.
const MARKER = '.eval-plugin-build.json';
const BUILT_BY = 'tools/eval-plugin.js';

// The form a skill directory name takes; anything else could carry a path segment.
const SKILL_NAME = /^[a-z0-9][a-z0-9-]*$/;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Which skills the root holds, and what the run over it would leave unmeasured: a
// companion a `with:` names but the list does not, and a skill with no cases.
function plan(repoDir, names) {
  if (!names.length) throw new Error('no skill named: pass the skills the root holds, e.g. comments writing-style');
  const { parseFrontmatter } = require(path.join(__dirname, 'skill-catalog.js'));
  const skillsDir = path.join(repoDir, 'skills');
  const evalsDir = path.join(repoDir, 'evals');
  const listed = new Set(names);
  const warnings = [];
  const skills = names.map(name => {
    if (!SKILL_NAME.test(name)) throw new Error(`${name} is not a skill name: a skill is named by lowercase letters, digits and hyphens`);
    const dir = path.join(skillsDir, name);
    const skillFile = path.join(dir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) throw new Error(`no skill named ${name}: ${skillFile} does not exist`);
    for (const companion of parseFrontmatter(fs.readFileSync(skillFile, 'utf8')).with ?? []) {
      if (!listed.has(companion))
        warnings.push(`${name} names ${companion} in with:, and the list does not hold ${companion}`);
    }
    const cases = path.join(evalsDir, name);
    const hasCases = fs.existsSync(cases);
    if (!hasCases) warnings.push(`${name} has no cases: ${cases} does not exist`);
    return { name, dir, cases: hasCases ? cases : null };
  });
  const manifest = path.join(repoDir, MANIFEST);
  if (!fs.existsSync(manifest)) throw new Error(`${manifest} does not exist: the repository is no plugin root`);
  const plugin = readJson(manifest).name;
  const version = readJson(path.join(repoDir, 'package.json')).version;
  return { name: names.join('+'), skills, warnings, plugin, version };
}

// The real path of `p`, resolved on the deepest prefix that exists: a junction or a
// symlink in the prefix would otherwise let one directory compare as two.
function realPath(p) {
  let existing = path.resolve(p);
  const rest = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    rest.unshift(path.basename(existing));
    existing = parent;
  }
  let real;
  try { real = fs.realpathSync.native(existing); }
  catch (err) { throw new Error(`${p} cannot be resolved: ${err.message}`); }
  return path.join(real, ...rest);
}

function insideOf(dir, root) {
  const rel = path.relative(realPath(root), realPath(dir));
  if (rel === '') return true;
  if (rel === '..' || rel.startsWith(`..${path.sep}`)) return false;
  return !path.isAbsolute(rel);
}

function build(repoDir, names, outDir) {
  const planned = plan(repoDir, names);
  const root = path.join(outDir, planned.name);
  for (const dir of [outDir, root]) {
    if (insideOf(dir, repoDir))
      throw new Error(`the output root ${dir} is inside the repository ${repoDir}: the eval reads every prompt.md below any directory named evals in the tree it is given, so a build inside it would run its cases twice`);
  }
  if (insideOf(repoDir, root))
    throw new Error(`the repository ${repoDir} is inside the output root ${root}, which the build removes first`);
  // The build removes the root before writing it, so it removes its own previous build and
  // nothing else: a directory that merely carries the name of the list stays.
  if (fs.existsSync(root)) {
    let held;
    try { held = readJson(path.join(root, MARKER))?.builtBy; } catch { held = undefined; }
    if (held !== BUILT_BY)
      throw new Error(`${root} exists and is no build of ${planned.plugin}: its ${MARKER} names ${held ?? 'nothing'} as the tool that wrote it, and the build would remove what sits there`);
  }
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({
    name: planned.plugin,
    description: `The skills ${names.join(', ')} of claude-config, built for claude plugin eval`,
    version: planned.version,
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(root, MARKER), JSON.stringify({
    builtBy: BUILT_BY,
    skills: names,
  }, null, 2) + '\n');
  for (const skill of planned.skills) {
    fs.cpSync(skill.dir, path.join(root, 'skills', skill.name), { recursive: true });
    if (skill.cases) fs.cpSync(skill.cases, path.join(root, 'evals', skill.name), { recursive: true });
  }
  return { root, warnings: planned.warnings };
}

// node tools/eval-plugin.js [--out <dir>] <skill>...
// The root goes outside the repository: `claude plugin eval .` reads every prompt.md below
// any directory named evals in the tree it is given, at any depth, and a build carries an
// evals/ of its own.
function main(argv) {
  const os = require('os');
  const names = [];
  let outDir = path.join(os.tmpdir(), 'claude-config-evals');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') {
      const value = argv[++i];
      if (value === undefined) { process.stderr.write('--out takes a directory\n'); return 1; }
      outDir = path.resolve(value);
    } else names.push(argv[i]);
  }
  let built;
  try { built = build(path.join(__dirname, '..'), names, outDir); }
  catch (err) { process.stderr.write(`${err.message}\n`); return 1; }
  for (const warning of built.warnings) process.stderr.write(`warn: ${warning}\n`);
  process.stdout.write(`${built.root}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { plan, build, main };
