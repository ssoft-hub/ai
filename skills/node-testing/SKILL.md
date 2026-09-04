---
name: node-testing
version: "1.0.0"
description: Apply when writing or reviewing tests under test/*.test.js for Claude Code hooks, tools, or install/uninstall logic
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - node
    - claude-code
  reminder: false
  paths:
    - "**/test/*.test.js"
  project-relation: binding
  with:
    - "test-driven-development"
    - "testing"
  tags:
    - testing
    - node
---

# Skill: Node Test Conventions

Apply when writing or reviewing tests under `test/*.test.js` for Claude Code hooks,
tools, or install/uninstall logic (e.g. `~/.claude/hooks/`, `~/.claude/tools/` —
see `hook-scripts` skill).

- Writing the hook/tool itself → `hook-scripts` skill.
- The principles a test holds to whatever the language — the levels of verification, the
  isolation of a unit test, test data and the environment, determinism between runs, the
  layout of a test and the boundaries it covers → `testing` skill.
- Tests in another language → the testing skill of that language (different runner,
  different conventions — do not mix the two).

## Project Binding

**Must**

Must apply this skill in the `claude-config` repository alone: it states that
repository's own conventions, and no project with a different layout takes them as a
fallback.

---

## Runner and Assertions

Use Node's built-in `node:test` and `node:assert` only — no Jest, Mocha, or other
third-party test framework. A claude-config-style hooks/tools project typically has
no npm dependencies (see `hook-scripts` skill); pulling in a test framework would be
the one exception that breaks that invariant.

```javascript
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
```

## Flat Tests, Descriptive Names

Write flat `test('description', fn)` calls rather than nesting in `describe` blocks.
A test file like `bash-safety.test.js` reads as a flat list of behaviors
checked, which is itself a spec for the regex/logic under test — nesting buries that
spec under an extra layer of indirection for no benefit at this file size.

```javascript
test('blocks rm -rf /', () => {
  assert.strictEqual(check('rm -rf /').action, 'block');
});

test('warns on rm -r foo/', () => {
  assert.strictEqual(check('rm -r foo/').action, 'warn');
});
```

The name is a string here, and it states the behaviour: `'blocks rm -rf /'`, not
`'test case 1'` or `'check function'`.

Only reach for `describe` if a file's tests genuinely split into unrelated concerns
that would otherwise be hard to scan — most tool/hook test files won't need it.

## One Behavior Per Test

The rule is `testing` → One Behaviour per Test, Named by It. Here it reads:
each `test()` checks one input → one expected outcome, and the string naming it says
which case broke.

## Testing Pure Logic Directly

Prefer exporting the pure logic from the tool (`exports.check`, etc.) and calling it
directly in the test, rather than spawning the tool as a subprocess:

```javascript
const { check } = require('../tools/bash-safety');
assert.strictEqual(check('rm -rf /').action, 'block');
```

**Why:** a direct call is faster, gives you a real stack trace on failure, and tests
the logic in isolation from the stdin-JSON plumbing. Reserve `spawnSync` for the cases
that actually need it — verifying exit codes, or the stdin → stdout/stderr contract a
dispatcher relies on:

```javascript
const { spawnSync } = require('node:child_process');
const r = spawnSync('node', [path.join(toolsDir, 'my-tool.js')], {
  input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } }),
  encoding: 'utf8', stdio: 'pipe',
});
assert.strictEqual(r.status, 2);
```

## Filesystem Fixtures

The rule for a test touching the filesystem is `testing` → Test Data and the Environment;
what Node offers for it is the call `fs.mkdtempSync` over the directory `os.tmpdir()` gives, never the real
`~/.claude/`. Use the `CLAUDE_CONFIG_DIR` env override (the same one the hooks themselves
resolve against — see `hook-scripts` skill) to redirect the script under test into that
directory:

```javascript
function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

test('install creates files and manifest on empty dir', () => {
  const dir = mkTmp();
  try {
    const r = spawnSync('node', [installJs], {
      cwd: repoDir,
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
      encoding: 'utf8',
    });
    assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);
    assert.ok(fs.existsSync(path.join(dir, '.claude-config-manifest.json')));
  } finally { rmTmp(dir); }
});
```

The cleanup goes in a `finally` block, which runs on the failing path too.

## What to Cover

- The regex/logic boundary cases a hook or tool relies on (e.g. every `rm` variant
  `bash-safety` is supposed to catch, plus near-misses it should *not* flag).
- The stdin-JSON contract: malformed JSON should not crash the process (exit 0, not
  throw).
- For install/uninstall: round-trip — install then uninstall restores the directory
  to its pre-install state byte-for-byte, including the case where files already
  existed before install (backup/restore path).

## Running

```bash
npm test
# equivalent to:
node --test
```

Pass no path. `node --test` walks the tree itself: anywhere under a directory named
`test` it loads every `.js`, `.cjs` and `.mjs` file whatever its name, and elsewhere the
files matching `*.test.js`, `*-test.js`, `*_test.js`, `test-*.js` or `test.js`. Every
script under `test/` therefore has to stand alone as a test file — a shared helper put
there is loaded and run as one, giving a passing test nobody wrote, or a failing suite when
its top-level code throws. That is why the fixture helpers above are repeated in each
file, and `test/test-layout.test.js` holds the directory to it. A fixture that is data
rather than a test carries an extension the runner does not load, so it is read by the
test that needs it and never run as one.

A glob written into the script is expanded by the shell instead: `cmd.exe`, which npm
runs a script through on Windows, does not expand one, and node does so itself only from
version 22 — so on node 18 and 20 a script carrying a glob finds no test file at all.
