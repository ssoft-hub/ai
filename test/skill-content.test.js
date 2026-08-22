'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const skillsDir = path.join(__dirname, '..', 'skills');
const fixturesDir = path.join(__dirname, 'fixtures');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

// Which kind of directory link a platform creates without privileges differs, so the kind
// is probed once and a platform allowing none names its reason instead of failing.
const dirLink = (() => {
  const dir = mkTmp();
  try {
    const target = path.join(dir, 'target');
    fs.mkdirSync(target);
    let failure;
    for (const kind of ['dir', 'junction']) {
      try {
        fs.symlinkSync(target, path.join(dir, kind), kind);
        return { kind };
      } catch (error) { failure = error; }
    }
    return { skip: `no directory link can be created here: ${failure.code}` };
  } finally { rmTmp(dir); }
})();

function baseIn(dir) {
  const base = path.join(dir, 'base');
  fs.mkdirSync(base);
  return base;
}

// A sibling whose name extends the base name is where a string prefix stops answering the
// containment question: it holds for every name under that directory and none is inside.
function baseWithSibling(dir) {
  const base = baseIn(dir);
  const sibling = `${base}-evil`;
  fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(sibling, 'secret.txt'), 'secret');
  return { base, sibling, secret: path.join(sibling, 'secret.txt') };
}

// Reached through a link rather than named outright, so every component the walk resolves
// is one a string prefix of the base name accepts.
function baseWithLinkToSibling(dir) {
  const { base, sibling } = baseWithSibling(dir);
  fs.symlinkSync(sibling, path.join(base, 'link'), dirLink.kind);
  return base;
}

// Only a resolve that follows the link reports where base/link/secret.txt lands, so a
// base holding a link out of itself is what separates a lexical resolve from a real one.
function baseWithLinkOut(dir) {
  const base = baseIn(dir);
  const outside = path.join(dir, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');
  fs.symlinkSync(outside, path.join(base, 'link'), dirLink.kind);
  return base;
}

// The candidate resolves out from under a link whether the base did or not, so a base named
// through one is where an unresolved base stops being a prefix of what it is compared with.
function baseNamedThroughLink(dir) {
  const base = baseIn(dir);
  const link = path.join(dir, 'link-to-base');
  fs.symlinkSync(base, link, dirLink.kind);
  return { base, link };
}

function skillText(skill) {
  const file = path.join(skillsDir, skill, 'SKILL.md');
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  // A vacuous pass would hide the file having been emptied.
  if (text.trim() === '') throw new Error(`${file} is empty`);
  return text;
}

// A fence can hold a line starting with "## ", so a section ends at the next such line
// outside one: the search runs over a copy with every fence blanked at its own offsets.
function withoutFences(text) {
  return text.replace(/^```[a-z]*\n[\s\S]*?^```/gm, fence => fence.replace(/[^\n]/g, ' '));
}

function sectionNamed(skill, heading) {
  const text = skillText(skill);
  const blanked = withoutFences(text);
  const start = blanked.indexOf(`\n## ${heading}\n`);
  if (start < 0) throw new Error(`no "## ${heading}" section in ${skill}/SKILL.md`);
  const end = blanked.indexOf('\n## ', start + 1);
  return text.slice(start + 1, end < 0 ? undefined : end);
}

// Every phrase the rules are held to is read inside the section that owns it: over the
// whole file, an element deleted from one section is answered by another one naming it.
// Both sides are matched with runs of whitespace collapsed, since the prose wraps and a
// phrase spanning a line break is the same statement as one that fits on a line.
function states(skill, heading, phrase) {
  const flat = text => text.replace(/\s+/g, ' ');
  return flat(sectionNamed(skill, heading)).includes(flat(phrase));
}

// An ordering assertion over indexOf passes on -1: rewriting one of the two lines out of
// the reference would satisfy the very order it was there to keep.
function indexIn(source, line) {
  const at = source.indexOf(line);
  if (at < 0) throw new Error(`the reference no longer contains ${line}`);
  return at;
}

// A replacement matching nothing would leave the reference under test as it stands, so the
// text it edits is asserted before it edits it.
function replaced(text, from, to) {
  if (!text.includes(from)) throw new Error(`the reference no longer contains ${from}`);
  return text.split(from).join(to);
}

// -O2 rather than the default: a guard against undefined behaviour is pinned only where
// the optimiser acts on the case it prevents.
function compile(cc, source, exe) {
  const args = cc === 'cl'
    ? ['-nologo', '-std:c++17', '-EHsc', '-O2', source, `-Fe:${exe}`, `-Fo:${exe}.obj`]
    : ['-std=c++17', '-O2', '-o', exe, source];
  return spawnSync(cc, args, { encoding: 'utf8', cwd: path.dirname(exe) });
}

const linkProbe = `#include <filesystem>
#include <iostream>
#include <system_error>

int main(int argc, char** argv)
{
    std::error_code error;
    const auto target = std::filesystem::read_symlink(argv[1], error);
    std::cout << (error ? "no link: " + error.message() : "link -> " + target.string());
    return 0;
}
`;

// A C++ reference is compiled and run for the same reason a JavaScript one is: an assertion
// over its text is satisfied by a comment naming the right tokens. The probe uses the
// header the references use, since a toolchain whose <filesystem> is absent or unlinkable
// builds a bare main and then reddens the suite on the first one.
//
// Resolution reaches only the link kinds the chosen library follows, so a compiler whose
// library follows the platform's is taken over one that merely builds: libstdc++ under MinGW
// answers ENOSYS for every reparse point, and under it reducing the resolve to a lexical
// normalisation goes unnoticed, since the reference then compares the name it was handed.
const cpp = (() => {
  const dir = mkTmp();
  try {
    const source = path.join(dir, 'probe.cpp');
    fs.writeFileSync(source, '#include <filesystem>\n'
      + 'int main() { return std::filesystem::weakly_canonical(".").empty(); }\n');
    const builds = ['g++', 'clang++', 'cl'].filter((cc, at) =>
      compile(cc, source, path.join(dir, `probe${at}.exe`)).status === 0);
    if (builds.length === 0)
      return { skip: 'no C++ compiler on PATH builds a C++17 <filesystem> program' };
    if (dirLink.skip) return { cc: builds[0], linkSkip: dirLink.skip };
    const link = path.join(baseWithLinkOut(dir), 'link');
    const probe = path.join(dir, 'link-probe.cpp');
    fs.writeFileSync(probe, linkProbe);
    const refusals = [];
    for (const cc of builds) {
      const exe = path.join(dir, `link-probe${refusals.length}.exe`);
      if (compile(cc, probe, exe).status !== 0) {
        refusals.push(`${cc} does not build the link probe`);
        continue;
      }
      const answer = spawnSync(exe, [link], { encoding: 'utf8' }).stdout;
      if (answer.startsWith('link -> ')) return { cc };
      refusals.push(`the library ${cc} builds against reports a ${dirLink.kind} link as ${answer}`);
    }
    return { cc: builds[0], linkSkip: refusals[0] };
  } finally { rmTmp(dir); }
})();

const cppLinkSkip = cpp.skip || cpp.linkSkip || false;

const compiled = new Map();
let cppDir;
after(() => { if (cppDir) rmTmp(cppDir); });

function compiledSource(source) {
  if (!compiled.has(source)) {
    cppDir = cppDir || mkTmp();
    const stem = path.join(cppDir, `reference${compiled.size}`);
    fs.writeFileSync(`${stem}.cpp`, source);
    const built = compile(cpp.cc, `${stem}.cpp`, `${stem}.exe`);
    if (built.status !== 0)
      throw new Error(`the reference does not compile as it stands:\n${built.stderr}`);
    compiled.set(source, `${stem}.exe`);
  }
  return compiled.get(source);
}

function runCppSource(source, argv = [], options = {}) {
  return spawnSync(compiledSource(source), argv, { encoding: 'utf8', ...options });
}

// A reference implementation is read off the file rather than embedded here, so what runs is
// the text a reader is pointed at. An absent or emptied file is an error and not a pass.
function fixtureSource(skill, name) {
  const file = path.join(fixturesDir, skill, name);
  if (!fs.existsSync(file)) throw new Error(`no reference implementation at ${file}`);
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (source.trim() === '') throw new Error(`${file} is empty`);
  return source;
}

function runCppFixture(skill, name, driver, argv = [], options = {}) {
  return runCppSource(`${fixtureSource(skill, name)}\n${driver}`, argv, options);
}

// The module shape the file carries when node loads it directly, evaluated from the same
// text, so a retyped copy of a reference runs by the path the original does.
function loadSource(source) {
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)(require, loaded, loaded.exports);
  return loaded.exports;
}

function loadFixture(skill, name) {
  return loadSource(fixtureSource(skill, name));
}

// A candidate no path relative to the base can reach needs a second root to sit under.
const secondRoot = (() => {
  if (process.platform !== 'win32') return { skip: 'a second root name exists on win32 only' };
  const here = path.parse(os.tmpdir()).root.toUpperCase();
  for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const root = `${letter}:\\`;
    if (root !== here && fs.existsSync(root)) return { root };
  }
  return { skip: 'this machine has one root name only' };
})();

const containmentDriver = `#include <iostream>

int main(int argc, char** argv)
{
    try {
        std::cout << resolve_under(argv[1], argv[2]).string();
    } catch (const std::exception& error) {
        std::cerr << error.what();
        return 1;
    }
    return 0;
}
`;

const sumDriver = (a, b) => `#include <iostream>

int main()
{
    try {
        std::cout << checked_sum(${a}, ${b});
    } catch (const std::exception& error) {
        std::cerr << error.what();
        return 1;
    }
    return 0;
}
`;

// --- security-and-hardening --------------------------------------------------

// The C++ containment reference

test('the C++ containment reference rejects a name that climbs out of the base',
  { skip: cpp.skip || false }, () => {
    const dir = mkTmp();
    try {
      const run = runCppFixture('security-and-hardening', 'resolve-under.cpp',
        containmentDriver, [baseIn(dir), '../outside/secret.txt']);
      assert.strictEqual(run.status, 1, `the reference accepted the name: ${run.stdout}`);
      assert.match(run.stderr, /contains a "\.\." component/);
    } finally { rmTmp(dir); }
  });

test('the C++ containment reference rejects a ".." that is not the first component',
  { skip: cpp.skip || false }, () => {
    const dir = mkTmp();
    try {
      const run = runCppFixture('security-and-hardening', 'resolve-under.cpp',
        containmentDriver, [baseIn(dir), 'sub/../../outside/secret.txt']);
      assert.strictEqual(run.status, 1, `the reference accepted the name: ${run.stdout}`);
      assert.match(run.stderr, /contains a "\.\." component/);
    } finally { rmTmp(dir); }
  });

// A ".." collapses lexically before the link ahead of it is followed, so the name
// base/link/../secret.txt opens outside a base every resolve places it inside.
test('the C++ containment reference refuses a ".." cancelling a link component',
  { skip: cpp.skip || dirLink.skip || false }, () => {
    const dir = mkTmp();
    try {
      const run = runCppFixture('security-and-hardening', 'resolve-under.cpp',
        containmentDriver, [baseWithLinkOut(dir), 'link/../secret.txt']);
      assert.strictEqual(run.status, 1, `the reference accepted the name: ${run.stdout}`);
      assert.match(run.stderr, /contains a "\.\." component/);
    } finally { rmTmp(dir); }
  });

test('the C++ containment reference rejects a name reaching out through a link',
  { skip: cppLinkSkip }, () => {
    const dir = mkTmp();
    try {
      const run = runCppFixture('security-and-hardening', 'resolve-under.cpp',
        containmentDriver, [baseWithLinkOut(dir), 'link/secret.txt']);
      assert.strictEqual(run.status, 1, `the reference accepted the name: ${run.stdout}`);
      assert.match(run.stderr, /escapes base directory/);
    } finally { rmTmp(dir); }
  });

test('the C++ containment reference rejects a candidate under a sibling of the base',
  { skip: cpp.skip || false }, () => {
    const dir = mkTmp();
    try {
      const { base, secret } = baseWithSibling(dir);
      const run = runCppFixture('security-and-hardening', 'resolve-under.cpp',
        containmentDriver, [base, secret]);
      assert.strictEqual(run.status, 1, `the reference accepted the name: ${run.stdout}`);
      assert.match(run.stderr, /escapes base directory/);
    } finally { rmTmp(dir); }
  });

test('the C++ containment reference rejects a candidate under another root',
  { skip: cpp.skip || secondRoot.skip || false }, () => {
    const dir = mkTmp();
    try {
      const run = runCppFixture('security-and-hardening', 'resolve-under.cpp',
        containmentDriver, [baseIn(dir), `${secondRoot.root}secret`]);
      assert.strictEqual(run.status, 1, `the reference accepted the name: ${run.stdout}`);
      assert.match(run.stderr, /escapes base directory/);
    } finally { rmTmp(dir); }
  });

test('the C++ containment reference resolves a base given relative to the working directory',
  { skip: cpp.skip || false }, () => {
    const dir = mkTmp();
    try {
      baseIn(dir);
      const run = runCppFixture('security-and-hardening', 'resolve-under.cpp',
        containmentDriver, ['base', 'ok.txt'], { cwd: dir });
      assert.strictEqual(run.status, 0, `the reference rejected a name under its base: ${run.stderr}`);
      assert.ok(path.isAbsolute(run.stdout), `an unresolved base leaves the candidate at ${run.stdout}`);
      assert.strictEqual(path.basename(run.stdout), 'ok.txt');
    } finally { rmTmp(dir); }
  });

test('the C++ containment reference accepts a name that only begins with dots',
  { skip: cpp.skip || false }, () => {
    const dir = mkTmp();
    try {
      const run = runCppFixture('security-and-hardening', 'resolve-under.cpp',
        containmentDriver, [baseIn(dir), '..foo']);
      assert.strictEqual(run.status, 0, `the reference rejected a legitimate name: ${run.stderr}`);
      assert.ok(run.stdout.endsWith(path.join('base', '..foo')),
        `a first component of ".." is what escapes, and the candidate is what comes back: ${run.stdout}`);
    } finally { rmTmp(dir); }
  });

// The JavaScript containment reference

function resolveUnder() {
  return loadFixture('security-and-hardening', 'resolve-under.js.fixture').resolveUnder;
}

test('the JavaScript containment reference rejects a name that climbs out of the base', () => {
  assert.throws(() => resolveUnder()('/srv/data', '../elsewhere/secret'),
    /contains a "\.\." component/);
});

test('the JavaScript containment reference rejects a link leading to a sibling of the base',
  { skip: dirLink.skip || false }, () => {
    const dir = mkTmp();
    try {
      assert.throws(() => resolveUnder()(baseWithLinkToSibling(dir), 'link/secret.txt'),
        /escapes base directory/,
      'a string prefix of the base name holds for every component the walk resolves under a sibling');
    } finally { rmTmp(dir); }
  });

test('the JavaScript containment reference rejects a name reaching out through a link',
  { skip: dirLink.skip || false }, () => {
    const dir = mkTmp();
    try {
      assert.throws(() => resolveUnder()(baseWithLinkOut(dir), 'link/secret.txt'),
        /escapes base directory/);
    } finally { rmTmp(dir); }
  });

test('the JavaScript containment reference refuses a ".." cancelling a link component',
  { skip: dirLink.skip || false }, () => {
    const dir = mkTmp();
    try {
      assert.throws(() => resolveUnder()(baseWithLinkOut(dir), 'link/../secret.txt'),
        /contains a "\.\." component/);
    } finally { rmTmp(dir); }
  });

// Win32 drops a trailing dot from a component, so the name is checked as one that does not
// exist and opened as the one leading out through the link.
test('the JavaScript containment reference refuses a component ending in a dot',
  { skip: process.platform === 'win32' ? (dirLink.skip || false) : 'no component is rewritten here' }, () => {
    const dir = mkTmp();
    try {
      assert.throws(() => resolveUnder()(baseWithLinkOut(dir), 'link./secret.txt'),
        /component the platform rewrites/);
    } finally { rmTmp(dir); }
  });

test('the JavaScript containment reference refuses a component ending in a space',
  { skip: process.platform === 'win32' ? (dirLink.skip || false) : 'no component is rewritten here' }, () => {
    const dir = mkTmp();
    try {
      assert.throws(() => resolveUnder()(baseWithLinkOut(dir), 'link /secret.txt'),
        /component the platform rewrites/);
    } finally { rmTmp(dir); }
  });

test('the JavaScript containment reference resolves the base it compares against',
  { skip: dirLink.skip || false }, () => {
    const dir = mkTmp();
    try {
      const { base, link } = baseNamedThroughLink(dir);
      assert.strictEqual(resolveUnder()(link, 'ok.txt'), path.join(base, 'ok.txt'),
        'an unresolved base is compared with a resolved candidate, and rejects a name under it');
    } finally { rmTmp(dir); }
  });

// A "." is the one component ending in a dot that win32 does not rewrite: it is collapsed
// by path normalisation, and collapsing it leaves the link ahead of it still to be followed.
test('the JavaScript containment reference accepts a "." component', () => {
  const dir = mkTmp();
  try {
    const base = baseIn(dir);
    assert.strictEqual(resolveUnder()(base, './ok.txt'), path.join(base, 'ok.txt'),
      'a rule reading every trailing dot as a rewrite refuses a name any caller may write');
  } finally { rmTmp(dir); }
});

// A caller separating "rejected" from "internal failure" misclassifies the runtime's own
// RangeError, which a resolve recursing once per component reaches past about twenty
// thousand of them, so the count is bounded before the first component is resolved.
test('the JavaScript containment reference refuses more components than the ceiling allows', () => {
  const dir = mkTmp();
  try {
    const name = Array.from({ length: 1000 }, (unused, at) => `d${at}`).join('/');
    assert.throws(() => resolveUnder()(baseIn(dir), name), /more components than/);
  } finally { rmTmp(dir); }
});

// What a resolve reports for a name under a regular file differs by platform: ENOTDIR on
// POSIX, ENOENT on win32, so a walk reading ENOENT as "not there yet" accepts on one of them.
test('the JavaScript containment reference rejects a name whose parent is a regular file', () => {
  const dir = mkTmp();
  try {
    const base = baseIn(dir);
    fs.writeFileSync(path.join(base, 'afile'), 'not a directory');
    assert.throws(() => resolveUnder()(base, 'afile/sub.txt'), /does not resolve/,
      'a walk that excuses every resolution failure derives the name lexically and accepts it');
  } finally { rmTmp(dir); }
});

test('the JavaScript containment reference accepts a name that only begins with dots', () => {
  const dir = mkTmp();
  try {
    const base = baseIn(dir);
    assert.strictEqual(resolveUnder()(base, '..foo'), path.join(base, '..foo'),
      'a first component of ".." is what escapes; a component merely starting with ".." does not');
  } finally { rmTmp(dir); }
});

// Only win32 has a second root to escape to: on a single-rooted filesystem the relative
// name answers with "..", which the component test above already covers.
test('the JavaScript containment reference rejects a candidate under another root',
  { skip: secondRoot.skip || false }, () => {
    const dir = mkTmp();
    try {
      assert.throws(() => resolveUnder()(baseIn(dir), `${secondRoot.root}secret`),
        /escapes base directory/);
    } finally { rmTmp(dir); }
  });

// The C++ overflow reference

test('the C++ overflow reference rejects a sum the type cannot hold',
  { skip: cpp.skip || false }, () => {
    const run = runCppFixture('security-and-hardening', 'checked-sum.cpp',
      sumDriver(2147483647, 1));
    assert.strictEqual(run.status, 1, `the reference accepted the operands: ${run.stdout}`);
    assert.match(run.stderr, /size overflow/);
  });

test('the C++ overflow reference accepts the largest sum the type holds',
  { skip: cpp.skip || false }, () => {
    const run = runCppFixture('security-and-hardening', 'checked-sum.cpp',
      sumDriver(2147483646, 1));
    assert.strictEqual(run.status, 0, `the reference rejected a legitimate size: ${run.stderr}`);
    assert.strictEqual(run.stdout, '2147483647',
      'the bound is the last value that fits, so rejecting it would reject a legitimate size');
  });

test('the C++ overflow reference rejects a negative first operand',
  { skip: cpp.skip || false }, () => {
    const run = runCppFixture('security-and-hardening', 'checked-sum.cpp', sumDriver(-1, 1));
    assert.strictEqual(run.status, 1, `the reference accepted a negative size: ${run.stdout}`);
    assert.match(run.stderr, /size overflow/);
  });

test('the C++ overflow reference rejects a negative second operand',
  { skip: cpp.skip || false }, () => {
    const run = runCppFixture('security-and-hardening', 'checked-sum.cpp', sumDriver(1, -1));
    assert.strictEqual(run.status, 1, `the reference accepted a negative size: ${run.stdout}`);
    assert.match(run.stderr, /size overflow/);
  });

// A wire length field is narrower than int, so the addition promotes and never wraps: a
// bound naming the type the arithmetic runs in accepts 60000 + 10000 and stores 4464,
// which is a buffer sized for 4464 bytes of the 70000 the length announced.
test('the C++ overflow reference still holds once retyped for a narrower type',
  { skip: cpp.skip || false }, () => {
    const narrowed = replaced(fixtureSource('security-and-hardening', 'checked-sum.cpp'),
      'int ', 'std::uint16_t ');
    const run = runCppSource(`#include <cstdint>\n${narrowed}\n${sumDriver(60000, 10000)}`);
    assert.strictEqual(run.status, 1, `the retyped reference accepted the operands: ${run.stdout}`);
    assert.match(run.stderr, /size overflow/);
  });

// The same retyping for an unsigned type: a limit written out for one width accepts
// 4294967295 + 1 as a total of 0.
test('the C++ overflow reference still holds once retyped for an unsigned type',
  { skip: cpp.skip || false }, () => {
    const source = fixtureSource('security-and-hardening', 'checked-sum.cpp');
    const unsigned = replaced(replaced(source, 'int ', 'unsigned '), 'a < 0 || b < 0 || ', '');
    const run = runCppSource(`${unsigned}\n${sumDriver('4294967295u', '1u')}`);
    assert.strictEqual(run.status, 1, `the retyped reference accepted the operands: ${run.stdout}`);
    assert.match(run.stderr, /size overflow/);
  });

test('the C++ overflow reference tests an operand before the addition runs', () => {
  const source = fixtureSource('security-and-hardening', 'checked-sum.cpp');
  assert.ok(indexIn(source, '::max() - a') < indexIn(source, 'a + b'),
    'a guard placed after the addition reads a sum that has already been computed');
});

// Dropping `b < 0` leaves a defined comparison that accepts, so the negative-second-operand
// run above pins it. Dropping `a < 0` leaves `max() - a` overflowing, caught only where the
// compiler exploits that: clang from -O2 up, while g++ and MSVC wrap and reject anyway.
test('the C++ overflow reference tests both operands against zero', () => {
  const source = fixtureSource('security-and-hardening', 'checked-sum.cpp');
  assert.ok(source.includes('a < 0') && source.includes('b < 0'),
    'the sign test is what keeps the limit test itself inside the range of its type');
});

test('the C++ overflow reference does not read the result of the addition it guards', () => {
  assert.ok(!fixtureSource('security-and-hardening', 'checked-sum.cpp').includes('a + b <'),
    'signed overflow is undefined, so a check reading the sum is deleted along with the addition');
});

// The JavaScript overflow reference

function storeSum() {
  return loadFixture('security-and-hardening', 'store-sum.js.fixture').storeSum;
}

test('the JavaScript overflow reference rejects a sum the slot cannot hold', () => {
  assert.throws(() => storeSum()(2147483647, 1), /size overflow/);
});

test('the JavaScript overflow reference refuses an operand of the wrong shape', () => {
  assert.throws(() => storeSum()('2', '1'), /not an integer/,
    'the comparisons coerce a numeric string while + concatenates it, so "2" and "1" store 21');
});

test('the JavaScript overflow reference refuses a negative first operand', () => {
  assert.throws(() => storeSum()(-1, 1), /size overflow/);
});

test('the JavaScript overflow reference refuses a negative second operand', () => {
  assert.throws(() => storeSum()(1, -1), /size overflow/);
});

test('the JavaScript overflow reference stores the largest sum the slot holds', () => {
  assert.strictEqual(storeSum()(2147483646, 1), 2147483647,
    'the bound is the last value that fits, so rejecting it would reject a legitimate size');
});

// A limit written out belongs to the width it was written for, and over a byte-wide slot
// the same guard admits 200 + 100 and stores 44.
test('the JavaScript overflow reference still holds once retyped for a narrower slot', () => {
  const narrowed = replaced(fixtureSource('security-and-hardening', 'store-sum.js.fixture'),
    'Int32Array', 'Uint8Array');
  assert.throws(() => loadSource(narrowed).storeSum(200, 100), /size overflow/);
});

test('the JavaScript overflow reference guards before the store, not after', () => {
  const source = fixtureSource('security-and-hardening', 'store-sum.js.fixture');
  assert.ok(indexIn(source, 'slotLimit - a') < indexIn(source, 'buffer[0] = a + b;'),
    'the wrap is defined here, so a guard after the store reads a value it can no longer refuse');
});

// What the containment rule states

test('the containment rule states the order the control runs in', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'refuse, then resolve, then compare'),
  'a resolve placed before the refusal follows the very links a ".." was refused to keep it off');
});

test('the containment rule requires refusing a ".." component before resolution', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'before any resolution: a `..` component, whatever its position'),
  'a ".." collapses lexically ahead of every link on the way to it, so no resolve catches it');
});

test('the containment rule requires refusing a component the platform rewrites', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'a component the platform rewrites before it opens the name'),
  'the name checked is otherwise not the name opened, and the check answers for neither');
});

test('the containment rule requires a ceiling on the component count', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'a component count above a ceiling the arriving format states'),
  'an unbounded resolve reports its own refusal as a runtime failure, which a caller reads as internal');
});

test('the containment rule requires resolving downward through the links', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'from the base downward, one component at a time, following the links'),
  'a lexical collapse decides where the name lands without consulting a single link');
});

test('the containment rule requires a resolution failure to be a refusal', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'A resolution failure is a refusal unless it says the name does not exist yet'),
  'a component that could not be resolved at all otherwise becomes a name derived lexically and accepted');
});

test('the containment rule requires comparing components rather than strings', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'against the base by components, never by strings'),
  'a string prefix admits a sibling directory whose name extends the base name');
});

test('the containment rule requires resolving the base it compares against', () => {
  assert.ok(states('security-and-hardening', 'Input Validation', 'Resolve the base as well'),
    'an unresolved base is not a prefix of a resolved candidate, and rejects a name under it');
});

test('the containment rule takes identity from the handle rather than the name', () => {
  assert.ok(states('security-and-hardening', 'Input Validation', 'Take identity from the handle'),
    'many names denote one file, so a returned string read as an identity names something else');
});

// A returned string read as an identity is the defect the contract closes.
test('the containment rule states what the control does not establish', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'establishes containment and nothing about identity'),
  'a name the control returned answers where the file is, and no later decision may rest on it');
});

// A call taking both the base and the name from the request satisfies every other rule in
// the section: the name is marked untrusted and the base is marked nothing at all.
test('the containment rule states where the base comes from', () => {
  assert.ok(states('security-and-hardening', 'Input Validation', 'never from a request parameter'),
    'where the base is a tenant boundary, containment inside it is the authorisation control');
});

// A percent-encoded ".." passes every refusal as a literal component, so the rule holds
// only where the name reaching it was decoded first.
test('the traversal rule states the decoding it depends on', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'holds on the fully decoded name only'),
  'a caller decoding after the check hands ".." to the open the check was there to refuse');
});

test('the traversal rule bounds the decoding to one pass', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'Decode exactly once, before the check'),
  'a second decode after the check turns an accepted name back into one holding a ".."');
});

test('the containment rule states which links a resolution reaches', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'Resolution reaches only the link kinds the standard library follows'),
  'a library following none of the kinds its platform has reports every one as a plain directory');
});

test('the containment rule treats an unexamined resolution as unproven', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'treat the resolution as unproven until you have'),
  'a control whose resolve follows no link compares the name it was handed');
});

test('the containment criterion is the control run rather than read', () => {
  assert.ok(states('security-and-hardening', 'Input Validation',
    'A guard read rather than run is not evidence'),
  'every clause of the control is one some library makes unnecessary and some other one defeats');
});

const containmentClasses = [
  'a name climbing out of the base',
  'a name leaving the base through a link',
  'a name whose `..` cancels a link component',
  'a name under another root',
  'a name holding a component the platform rewrites before the open',
  'a name whose resolution fails for a reason other than the name not existing yet',
  'a name that is legitimate and has to come back',
];

test('the containment criterion names every input class the control must answer', () => {
  for (const inputClass of containmentClasses)
    assert.ok(states('security-and-hardening', 'Input Validation', inputClass),
      `a control shown nothing of "${inputClass}" is unproven against the case it exists for`);
});

const containmentRefutations = [
  'a string comparison in place of the component one',
  'a lexical collapse in place of the resolve',
  'an unresolved base on either side of the comparison',
  'a resolution failure read as a name that does not exist yet',
  'a check on a name decoded after it',
  'a guard refusing the last class along with the rest',
];

test('the containment criterion names what refutes the control', () => {
  for (const refutation of containmentRefutations)
    assert.ok(states('security-and-hardening', 'Input Validation', refutation),
      `a criterion naming no refutation is met by any guard at all: "${refutation}"`);
});

// What the overflow rule states

test('the overflow rule states which arithmetic it governs', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety', 'fixed-width'),
    'the deletion the rule turns on is a property of fixed-width arithmetic, not of arithmetic as such');
});

test('the overflow rule requires the shape checked before the range', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety',
    'Check shape before range'),
  'an operand of the wrong shape passes every comparison in the bound and then behaves as something else');
});

test('the overflow rule bounds an operand rather than the result', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety',
    'Bound an operand, not the result'),
  'a bound on the result is reached only once the result the type cannot hold has been computed');
});

test('the overflow rule takes the limit from the type the result is stored in', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety',
    'against the limit of the type the result is stored in, before the operation runs'),
  'the limit of the type the arithmetic runs in belongs to what the operands promote to');
});

test('the overflow rule forbids writing the limit out as a constant', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety',
    'Read that limit off the storage rather than writing it out'),
  'a limit written out belongs to the width it was written for and admits a sum a narrower one drops');
});

test('the overflow rule keeps the type limit apart from the domain ceiling', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety',
    'Keep the type limit apart from the domain ceiling'),
  'a checked sum handed straight to a container passes the type limit and allocates whatever two length fields add up to');
});

// An upper bound one section demands and the other supplies as the representable maximum
// of the type is satisfied by a checked sum passed to a resize, so both sections name both.
test('the two size bounds are named apart in both sections that require one', () => {
  for (const heading of ['Input Validation', 'Integer and Bounds Safety'])
    assert.ok(states('security-and-hardening', heading, 'domain ceiling'),
      `"## ${heading}" leaves its bound satisfiable by the one the other section supplies`);
});

test('the overflow rule states what stands in for a checked operation the language lacks', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety',
    'where there is none, the operand test is the whole guard'),
  'a rule resting on an operation no standard offers leaves the case with no guard at all');
});

test('the overflow criterion is the guard retyped for a narrower type', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety',
    'the same guard retyped for a narrower type, still rejecting a pair of operands the wider type held'),
  'a guard passing only at the width it was written for carries nothing to the next field');
});

const overflowCases = [
  'the compiler may delete the check along with the addition',
  'the addition never wraps and the check is never true',
  'the stored value is already the wrong number',
];

test('the overflow criterion names why a check reading the sum is not evidence', () => {
  for (const overflowCase of overflowCases)
    assert.ok(states('security-and-hardening', 'Integer and Bounds Safety', overflowCase),
      `a criterion silent on "${overflowCase}" is met by the check the rule replaces`);
});

test('the overflow criterion names what else refutes the guard', () => {
  assert.ok(states('security-and-hardening', 'Integer and Bounds Safety',
    'A limit written out as a constant, a bound placed after the operation, a shape checked '
    + 'after the range, and a guard rejecting every pair of operands'),
  'a criterion naming no refutation is met by a guard that refuses every size');
});

// What the rules must not carry

test('neither rule states a code example', () => {
  for (const heading of ['Input Validation', 'Integer and Bounds Safety'])
    assert.ok(!/^```/m.test(sectionNamed('security-and-hardening', heading)),
      `"## ${heading}" states an example, which fixes a language, a library, a platform and a toolchain`);
});

// Scoped to the whole file on purpose: the subject is the absence of the particular
// anywhere in the skill, so deleting the passage that named it is the fix and not a cheat.
const particulars = [
  'weakly_canonical', 'lexically_relative', 'path.resolve', 'realpathSync',
  '_GLIBCXX_HAVE_READLINK', 'ENOSYS', '%2e%2e', 'Int32Array', 'decltype',
  'numeric_limits', '__builtin_', 'ckd_add',
];

test('the rules name no toolchain particular', () => {
  const text = skillText('security-and-hardening');
  for (const particular of particulars)
    assert.ok(!text.includes(particular),
      `${particular} belongs to one library, platform or compiler, and the rule holds for readers on none of them`);
});
