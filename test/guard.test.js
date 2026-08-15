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

// A guard stating one fixed verdict, whatever the payload: the shapes no installed guard
// produces are reached here rather than by making one of them answer wrongly.
function mkGuardStating(said) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
  fs.writeFileSync(path.join(dir, 'stating.js'),
    `'use strict';const { runAsScript } = require(${JSON.stringify(path.join(toolsDir, 'guard.js'))});`
    + `runAsScript(() => (${JSON.stringify(said)}));`);
  return dir;
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
