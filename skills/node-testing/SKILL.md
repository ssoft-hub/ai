---
name: node-testing
version: "1.0.0"
description: Apply when writing or reviewing tests under test/*.test.js for Claude Code hooks, tools, or install/uninstall logic
license: Unlicense
metadata:
  author: ssoft
  tags:
    - testing
    - node
---

# Skill: Node Test Conventions

Apply when writing or reviewing tests under `test/*.test.js` for Claude Code hooks,
tools, or install/uninstall logic (e.g. `~/.claude/hooks/`, `~/.claude/tools/` —
see `hook-scripts` skill).

- Writing the hook/tool itself → `hook-scripts` skill.
- C++ unit tests → `cpp-testing` skill (different language, different runner — do not
  mix the two conventions).

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

Name the test after the behavior, not the input — `'blocks rm -rf /'`, not
`'test case 1'` or `'check function'`. A failing test name should tell you what broke
without opening the file.

Only reach for `describe` if a file's tests genuinely split into unrelated concerns
that would otherwise be hard to scan — most tool/hook test files won't need it.

## One Behavior Per Test

Each `test()` checks one input → one expected outcome. Don't fold multiple unrelated
assertions into a single test — when it fails, you want the test name to already tell
you which case broke, not "one of these five assertions."

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

Any test that touches the filesystem (install/uninstall, manifest writes) must run
against a temp directory, never the real `~/.claude/`. Use the `CLAUDE_CONFIG_DIR`
env override (the same one the hooks themselves resolve against — see `hook-scripts`
skill) to redirect the script under test into an isolated temp dir:

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
    const r = spawnSync('node', [installJs, '--no-git-hook'], {
      cwd: repoDir,
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
      encoding: 'utf8',
    });
    assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);
    assert.ok(fs.existsSync(path.join(dir, '.claude-config-manifest.json')));
  } finally { rmTmp(dir); }
});
```

Always clean up in a `finally` block — a failed assertion must not leave a stray temp
directory behind, and must not skip cleanup either.

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
node --test "test/**/*.test.js"
```
