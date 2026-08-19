'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const toolsDir = path.join(__dirname, '..', 'tools');

// The two paths a guard is reached by, compared as one value: what the script wrote and
// exited with, against what the runner makes of the verdict the dispatcher reads.
function asProcess(said) {
  if (said?.block) return { status: 2, stdout: '', stderr: said.block };
  return { status: 0, stdout: said?.output ?? '', stderr: '' };
}

function runFile(file, payload, configDir) {
  const r = spawnSync(process.execPath, [file], {
    input: JSON.stringify(payload), encoding: 'utf8', stdio: 'pipe',
    env: configDir ? { ...process.env, CLAUDE_CONFIG_DIR: configDir } : process.env,
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function runScript(tool, payload, configDir) {
  return runFile(path.join(toolsDir, tool), payload, configDir);
}

// A runner around one verdict expression, for the shapes JSON cannot carry.
function mkRunner(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  fs.writeFileSync(path.join(dir, 'stating.js'),
    `'use strict';const { runAsScript } = require(${JSON.stringify(path.join(toolsDir, 'guard.js'))});`
    + `runAsScript(${source});`);
  return dir;
}

// A guard stating one fixed verdict, whatever the payload: the shapes no installed guard
// produces are reached here rather than by making one of them answer wrongly.
function mkGuardStating(said) {
  return mkRunner(`() => (${JSON.stringify(said)})`);
}

// A guard reads CLAUDE_CONFIG_DIR when it loads, so a run against another config dir
// loads it again.
function inProcess(tool, payload, configDir) {
  const previous = process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    process.env.CLAUDE_CONFIG_DIR = configDir;
    for (const key of Object.keys(require.cache)) {
      if (key.startsWith(toolsDir)) delete require.cache[key];
    }
  }
  try {
    return asProcess(require(path.join(toolsDir, tool)).verdict(payload));
  } finally {
    if (configDir) {
      if (previous === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = previous;
    }
  }
}

const BASH_SAFETY = [
  { tool_input: { command: 'rm -rf /' } },
  { tool_input: { command: 'git push' } },
  { tool_input: { command: 'rm -r build' } },
  { tool_input: { command: 'gh pr view 49' } },
  { tool_input: {} },
];

const COMMIT_TRAILER = [
  { tool_input: { command: 'git commit -m "fix: x\n\nCo-Authored-By: someone"' } },
  { tool_input: { command: 'git commit -m "fix: x"' } },
  { tool_input: { command: 'git log' } },
  { tool_input: {} },
];

const REVIEW_PUBLISH = [
  { tool_input: { command: 'gh pr comment 49 -b x' } },
  { tool_input: { command: 'gh pr review 49 --approve' } },
  { tool_input: { command: 'gh pr view 49' } },
  { tool_input: {} },
];

const SECRET = [
  { tool_input: { command: `curl -H "Authorization: token ghp_${'a'.repeat(36)}" https://api.github.com` } },
  { tool_input: { file_path: 'a.txt', content: 'password: "hunter2xyz"' } },
  { tool_input: { file_path: 'logo.png', content: 'AKIAIOSFODNN7EXAMPLE' } },
  { tool_input: { file_path: 'a.txt', content: 'nothing to see' } },
  { tool_input: {} },
];

// A real tools/ short one file, to see which guards the dispatcher still reaches without it.
function mkToolsWithout(omit) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  const tools = path.join(dir, 'tools');
  fs.mkdirSync(tools, { recursive: true });
  for (const entry of fs.readdirSync(toolsDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name !== omit) {
      fs.copyFileSync(path.join(toolsDir, entry.name), path.join(tools, entry.name));
    }
  }
  return dir;
}

// Only skill-gate is replaced; the rest of tools/ is real, so it is the only line on stderr.
function mkGateWhose(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  const tools = path.join(dir, 'tools');
  fs.mkdirSync(tools, { recursive: true });
  for (const entry of fs.readdirSync(toolsDir, { withFileTypes: true })) {
    if (entry.isFile()) fs.copyFileSync(path.join(toolsDir, entry.name), path.join(tools, entry.name));
  }
  fs.writeFileSync(path.join(tools, 'skill-gate.js'),
    `'use strict';const path=require('path');`
    + `function verdict() { ${body} }`
    + `if (require.main === module) require(path.join(__dirname, 'guard.js')).runAsScript(verdict);`
    + `module.exports = { verdict };`);
  return dir;
}

function mkGuardThrowing(message) {
  return mkGateWhose(`throw new Error(${JSON.stringify(message)});`);
}

// A transcript naming a skill that claims none of these files: the byte cursor
// `loadedSkills` keeps is read and written on both paths, and what it finds leaves the
// skill the gate is waiting for still missing.
function mkTranscript() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  const file = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(file, `${JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'writing-style' } }] },
  })}\n`);
  return { dir, file };
}

// The first names a transcript, so the state a run leaves behind is compared for the
// cursor as well as for the deny it already covers.
function gatePayloads(transcript) {
  return [
    { tool_name: 'Edit', tool_input: { file_path: 'x.cpp', content: 'x' }, session_id: 'p1', transcript_path: transcript },
    { tool_name: 'Bash', tool_input: { command: 'echo x > y.cpp' }, session_id: 'p2' },
    { tool_name: 'Bash', tool_input: { command: 'git status' }, session_id: 'p3' },
    { tool_name: 'Read', tool_input: { file_path: 'x.cpp' }, session_id: 'p4' },
  ];
}

function mkGateConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  const skillDir = path.join(dir, 'skills', 'comments');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'),
    '---\nname: comments\ndescription: d\nmetadata:\n  paths: ["**/*.cpp"]\n---\nbody\n');
  return dir;
}

function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function bothWays(tool, payloads) {
  for (const payload of payloads) {
    assert.deepStrictEqual(runScript(tool, payload), inProcess(tool, payload),
      `disagreed on ${JSON.stringify(payload)}`);
  }
}

test('bash-safety decides the same in process as it does as a script', () => {
  bothWays('bash-safety.js', BASH_SAFETY);
});

test('commit-trailer-guard decides the same in process as it does as a script', () => {
  bothWays('commit-trailer-guard.js', COMMIT_TRAILER);
});

test('review-publish-guard decides the same in process as it does as a script', () => {
  bothWays('review-publish-guard.js', REVIEW_PUBLISH);
});

test('secret-guard decides the same in process as it does as a script', () => {
  bothWays('secret-guard.js', SECRET);
});

// Each path gets a config dir of its own, so the session state one of them writes cannot
// answer for the other: it is the same run made twice from the same starting point.
test('skill-gate decides the same in process as it does as a script', () => {
  const transcript = mkTranscript();
  try {
    for (const payload of gatePayloads(transcript.file)) {
      const scripted = mkGateConfig();
      const loaded = mkGateConfig();
      try {
        assert.deepStrictEqual(
          runScript('skill-gate.js', payload, scripted),
          inProcess('skill-gate.js', payload, loaded),
          `disagreed on ${JSON.stringify(payload)}`);
      } finally { rmTmp(scripted); rmTmp(loaded); }
    }
  } finally { rmTmp(transcript.dir); }
});

test('skill-gate downgrades a repeated call the same way on both paths', () => {
  const transcript = mkTranscript();
  const payload = gatePayloads(transcript.file)[0];
  const scripted = mkGateConfig();
  const loaded = mkGateConfig();
  try {
    runScript('skill-gate.js', payload, scripted);
    inProcess('skill-gate.js', payload, loaded);
    assert.deepStrictEqual(
      runScript('skill-gate.js', payload, scripted),
      inProcess('skill-gate.js', payload, loaded));
  } finally { rmTmp(scripted); rmTmp(loaded); rmTmp(transcript.dir); }
});

test('writes output that is not a string as the text the dispatcher reads', () => {
  const dir = mkGuardStating({ output: 42 });
  try {
    assert.deepStrictEqual(runFile(path.join(dir, 'stating.js'), { tool_input: {} }),
      { status: 0, stdout: '42', stderr: '' });
  } finally { rmTmp(dir); }
});

test('writes a block that is not a string as the text the dispatcher reads', () => {
  const dir = mkGuardStating({ block: 42 });
  try {
    assert.deepStrictEqual(runFile(path.join(dir, 'stating.js'), { tool_input: {} }),
      { status: 2, stdout: '', stderr: '42' });
  } finally { rmTmp(dir); }
});

test('a verdict that throws costs the same on both paths', () => {
  const dir = mkGuardThrowing('the lexer is missing');
  const payload = { tool_name: 'Write', tool_input: { file_path: 'x.cpp', content: 'int i;' } };
  try {
    const scripted = runFile(path.join(dir, 'tools', 'skill-gate.js'), payload, dir);
    const dispatched = runFile(path.join(__dirname, '..', 'hooks', 'PreToolUse.js'), payload, dir);
    assert.strictEqual(scripted.status, dispatched.status);
    assert.strictEqual(scripted.stdout, dispatched.stdout);
    assert.match(scripted.stderr, /the lexer is missing/);
    assert.match(dispatched.stderr, /the lexer is missing/);
  } finally { rmTmp(dir); }
});

test('every guard on a command route decides without the script runner', () => {
  const dir = mkToolsWithout('guard.js');
  try {
    const r = runFile(path.join(__dirname, '..', 'hooks', 'PreToolUse.js'),
      { tool_name: 'Bash', tool_input: { command: 'git status' } }, dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stderr, '');
  } finally { rmTmp(dir); }
});

test('a destructive command is still blocked without the script runner', () => {
  const dir = mkToolsWithout('guard.js');
  try {
    const r = runFile(path.join(__dirname, '..', 'hooks', 'PreToolUse.js'),
      { tool_name: 'Bash', tool_input: { command: 'rm -rf /' } }, dir);
    assert.strictEqual(r.status, 2);
  } finally { rmTmp(dir); }
});

// Each shape a verdict can fail in, through both paths in one assertion: nothing but a
// comparison catches the two answering one payload differently.
const HOSTILE = [
  ['a thrown string', 'throw "gone missing";', 0, /did not run — gone missing/],
  ['a thrown null', 'throw null;', 0, /did not run — null/],
  ['an error whose message throws', 'throw Object.defineProperty(new Error("x"), "message",'
    + ' { get() { throw new Error("nope"); } });', 0, /did not run — it stated no reason/],
  ['a block getter that throws', 'return Object.defineProperty({}, "block",'
    + ' { get() { throw new Error("nope"); } });', 0, /did not run — nope/],
  ['a block that cannot be rendered', 'return { block: Object.create(null) };', 2,
    /blocked the call without stating why/],
  ['a block that renders empty', 'return { block: [] };', 2, /blocked the call without stating why/],
  ['an output that cannot be rendered', 'return { output: Object.create(null) };', 0,
    /stated output it could not write/],
  ['a stated block beside a throwing output getter',
    'return Object.defineProperty({ block: "secret found - blocked" }, "output",'
    + ' { get() { throw new Error("nope"); } });', 2, /secret found - blocked/],
];

for (const [name, body, status, reason] of HOSTILE) {
  test(`${name} costs the same on both paths`, () => {
    const dir = mkGateWhose(body);
    const payload = { tool_name: 'Write', tool_input: { file_path: 'x.cpp', content: 'int i;' } };
    try {
      const scripted = runFile(path.join(dir, 'tools', 'skill-gate.js'), payload, dir);
      const dispatched = runFile(path.join(__dirname, '..', 'hooks', 'PreToolUse.js'), payload, dir);
      assert.strictEqual(dispatched.status, scripted.status, 'exit code');
      assert.strictEqual(dispatched.status, status);
      assert.match(scripted.stderr, reason, 'runner');
      assert.match(dispatched.stderr, reason, 'dispatcher');
    } finally { rmTmp(dir); }
  });
}

// Widened over the write, the catch would turn a block whose text cannot be built into an allow.
test('a block whose text cannot be built still blocks, with a reason', () => {
  const dir = mkRunner('() => ({ block: Object.create(null) })');
  try {
    const r = runFile(path.join(dir, 'stating.js'), { tool_input: {} });
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /stating\.js/);
  } finally { rmTmp(dir); }
});

test('output whose text cannot be built leaves the call allowed and says so', () => {
  const dir = mkRunner('() => ({ output: Object.create(null) })');
  try {
    const r = runFile(path.join(dir, 'stating.js'), { tool_input: {} });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
    assert.match(r.stderr, /stating\.js/);
  } finally { rmTmp(dir); }
});

test('a verdict whose block cannot be read leaves the call allowed and says so', () => {
  const dir = mkRunner('() => Object.defineProperty({}, "block", { get() { throw new Error("nope"); } })');
  try {
    const r = runFile(path.join(dir, 'stating.js'), { tool_input: {} });
    assert.strictEqual(r.status, 0);
    assert.match(r.stderr, /stating\.js/);
  } finally { rmTmp(dir); }
});

test('a verdict throwing an error with no readable message still allows and says so', () => {
  const dir = mkRunner('() => { throw Object.defineProperty(new Error("x"), "message",'
    + ' { get() { throw new Error("nope"); } }); }');
  try {
    const r = runFile(path.join(dir, 'stating.js'), { tool_input: {} });
    assert.strictEqual(r.status, 0);
    assert.match(r.stderr, /stating\.js did not run/);
  } finally { rmTmp(dir); }
});

test('a verdict that throws a string keeps that string as the reason', () => {
  const dir = mkRunner('() => { throw "the lexer is missing"; }');
  try {
    const r = runFile(path.join(dir, 'stating.js'), { tool_input: {} });
    assert.strictEqual(r.status, 0);
    assert.match(r.stderr, /did not run — the lexer is missing/);
  } finally { rmTmp(dir); }
});

test('a verdict that throws leaves the call allowed rather than blocked', () => {
  const dir = mkGuardThrowing('the lexer is missing');
  const payload = { tool_name: 'Write', tool_input: { file_path: 'x.cpp', content: 'int i;' } };
  try {
    assert.strictEqual(runFile(path.join(dir, 'tools', 'skill-gate.js'), payload, dir).status, 0);
  } finally { rmTmp(dir); }
});
