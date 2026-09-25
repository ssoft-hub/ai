---
name: node-testing
version: "1.0.0"
description: Apply when writing, reviewing or adding a test in JavaScript on Node.js
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - node
  tags:
    - testing
    - node
---

# Skill: Node Testing

Apply when writing, reviewing or adding a test in JavaScript on Node.js.

- The principles a test holds to whatever the language — its level and what a unit test
  may reach, its shape, its boundary cases, its data and environment, its determinism,
  the mutation check and when a suite may be trusted → `testing` skill.
- Tests in another language → the testing skill of that language.

## Runner and Assertions

A test should use the modules `node:test` and `node:assert`.

```javascript
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
```

## Test Names

The rule is `testing` → The Shape of a Test. A test should state the behaviour in the
description string the call `test()` takes as its first argument: `'rejects an empty
name'`, not `'test case 1'` or `'parseName'`.

```javascript
test('rejects an empty name', () => {
  assert.throws(() => parseName(''), /empty/);
});
```

## Calling the Logic Directly

A test should call the logic a module exports, and should spawn the module as a
subprocess only to check its exit code or its stdin and stdout contract:

```javascript
const { parseName } = require('../src/name');
assert.strictEqual(parseName(' ada '), 'ada');
```

```javascript
const { spawnSync } = require('node:child_process');
const r = spawnSync(process.execPath, [cliPath], { input: ' ada\n', encoding: 'utf8' });
assert.strictEqual(r.status, 0);
```

## Temporary Directories

The rule for a test touching the file system is `testing` → Crossing a Boundary. A test
should create its directory with `fs.mkdtempSync` under `os.tmpdir()` and remove it in a
`finally` block. A directory made for the whole file should be removed in `after()`.

```javascript
test('writes the state file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-test-'));
  try {
    save(dir, { count: 1 });
    assert.ok(fs.existsSync(path.join(dir, 'state.json')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
```

## Running

The `test` script should pass no path and no glob, `node --test` finding the tests itself,
since the shell and not node expands a glob and `cmd.exe` expands none.

```json
"scripts": { "test": "node --test" }
```

Anywhere under a directory named `test`, `node --test` loads every `.js`, `.cjs` and
`.mjs` file whatever its name, and `.ts`, `.cts`, `.mts` where type stripping is on, and
elsewhere the files named `*.test`, `*-test`, `*_test`, `test-*` or `test` with one of
those extensions; a helper or a data fixture should stand outside such a directory or
carry an extension it does not load.
