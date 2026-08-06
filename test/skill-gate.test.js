'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { skillsIn, notice, loadedSkills } = require('../tools/skill-gate');

const gateJs = path.join(__dirname, '..', 'tools', 'skill-gate.js');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-gate-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
function writeSkill(skillsDir, name, frontmatter) {
  const dir = path.join(skillsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n${frontmatter}---\nbody\n`);
}
function transcriptLine(skill) {
  return JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill } }] },
  });
}
// A config dir holding the skills the gate matches against, plus the session-env
// directory it keeps its transcript cursor in.
function mkConfigDir(skills) {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, 'session-env'), { recursive: true });
  for (const [name, frontmatter] of Object.entries(skills)) {
    writeSkill(path.join(dir, 'skills'), name, frontmatter);
  }
  return dir;
}
function runGate(configDir, input) {
  return spawnSync('node', [gateJs], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
}

test('skillsIn finds each Skill invocation in a transcript chunk', () => {
  const text = transcriptLine('debugging') + '\n' + transcriptLine('editing') + '\n';
  assert.deepStrictEqual(skillsIn(text), ['debugging', 'editing']);
});

test('skillsIn ignores other tool calls', () => {
  const text = JSON.stringify({ message: { content: [{ name: 'Read', input: { file_path: 'a.cpp' } }] } });
  assert.deepStrictEqual(skillsIn(text), []);
});

test('notice names the file and every missing skill', () => {
  const text = notice('D:/repo/src/a.cpp', ['cpp-coding', 'comments']);
  assert.ok(text.includes('a.cpp'));
  assert.ok(text.includes('cpp-coding'));
  assert.ok(text.includes('comments'));
  assert.ok(text.includes('Skill tool'));
});

test('notice orders every named skill loaded instead of offering candidates', () => {
  const text = notice('D:/repo/src/a.cpp', ['cpp-coding', 'comments']);
  assert.match(text, /each/);
  assert.match(text, /not a suggestion/);
  assert.match(text, /do not skip/);
});

test('loadedSkills reads a transcript and remembers it across calls', () => {
  const dir = mkTmp();
  try {
    const transcript = path.join(dir, 't.jsonl');
    const state = path.join(dir, 'state.json');
    fs.writeFileSync(transcript, transcriptLine('debugging') + '\n');
    assert.deepStrictEqual(loadedSkills(transcript, state), ['debugging']);
    fs.appendFileSync(transcript, transcriptLine('editing') + '\n');
    assert.deepStrictEqual(loadedSkills(transcript, state), ['debugging', 'editing']);
  } finally { rmTmp(dir); }
});

test('loadedSkills finds a skill whose line was still being written at the last read', () => {
  const dir = mkTmp();
  try {
    const transcript = path.join(dir, 't.jsonl');
    const state = path.join(dir, 'state.json');
    const line = transcriptLine('debugging');
    const cut = line.indexOf('"name":"Skill"') + 6;
    fs.writeFileSync(transcript, line.slice(0, cut));
    assert.deepStrictEqual(loadedSkills(transcript, state), []);
    fs.appendFileSync(transcript, line.slice(cut) + '\n');
    assert.deepStrictEqual(loadedSkills(transcript, state), ['debugging']);
  } finally { rmTmp(dir); }
});

test('loadedSkills holds back a line that never got its newline, and takes it once it does', () => {
  const dir = mkTmp();
  try {
    const transcript = path.join(dir, 't.jsonl');
    const state = path.join(dir, 'state.json');
    fs.writeFileSync(transcript, transcriptLine('debugging'));
    assert.deepStrictEqual(loadedSkills(transcript, state), []);
    assert.deepStrictEqual(loadedSkills(transcript, state), []);
    fs.appendFileSync(transcript, '\n');
    assert.deepStrictEqual(loadedSkills(transcript, state), ['debugging']);
  } finally { rmTmp(dir); }
});

test('loadedSkills rereads from the start when the transcript shrank', () => {
  const dir = mkTmp();
  try {
    const transcript = path.join(dir, 't.jsonl');
    const state = path.join(dir, 'state.json');
    fs.writeFileSync(transcript, transcriptLine('debugging') + '\n' + transcriptLine('editing') + '\n');
    loadedSkills(transcript, state);
    fs.writeFileSync(transcript, transcriptLine('release') + '\n');
    assert.deepStrictEqual(loadedSkills(transcript, state), ['release']);
  } finally { rmTmp(dir); }
});

test('loadedSkills returns nothing for a missing transcript', () => {
  const dir = mkTmp();
  try {
    assert.deepStrictEqual(loadedSkills(path.join(dir, 'absent.jsonl'), path.join(dir, 's.json')), []);
  } finally { rmTmp(dir); }
});

test('gate names the skills claiming the edited file', () => {
  const dir = mkConfigDir({
    'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n  with: [comments]\n',
    comments: 'description: d\nmetadata:\n  tier: narrow\n',
  });
  try {
    const r = runGate(dir, { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' }, session_id: 's1' });
    assert.strictEqual(r.status, 0);
    assert.ok(r.stdout.includes('cpp-coding'));
    assert.ok(r.stdout.includes('comments'));
  } finally { rmTmp(dir); }
});

test('gate stays silent for a path no skill claims', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/notes.txt' }, session_id: 's1' });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), '');
  } finally { rmTmp(dir); }
});

test('gate stays silent for a tool that edits nothing', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, { tool_name: 'Bash', tool_input: { command: 'ls a.cpp' }, session_id: 's1' });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), '');
  } finally { rmTmp(dir); }
});

test('gate omits a skill already loaded in the transcript', () => {
  const dir = mkConfigDir({
    'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n  with: [comments]\n',
    comments: 'description: d\nmetadata:\n  tier: narrow\n',
  });
  try {
    const transcript = path.join(dir, 't.jsonl');
    fs.writeFileSync(transcript, transcriptLine('cpp-coding') + '\n');
    const r = runGate(dir, {
      tool_name: 'Write',
      tool_input: { file_path: 'D:/repo/a.cpp' },
      transcript_path: transcript,
      session_id: 's1',
    });
    assert.ok(!r.stdout.includes('cpp-coding'));
    assert.ok(r.stdout.includes('comments'));
  } finally { rmTmp(dir); }
});

test('gate stays silent once every matching skill is loaded', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const transcript = path.join(dir, 't.jsonl');
    fs.writeFileSync(transcript, transcriptLine('cpp-coding') + '\n');
    const r = runGate(dir, {
      tool_name: 'Edit',
      tool_input: { file_path: 'D:/repo/a.cpp' },
      transcript_path: transcript,
      session_id: 's1',
    });
    assert.strictEqual(r.stdout.trim(), '');
  } finally { rmTmp(dir); }
});

test('gate exits 0 on malformed stdin', () => {
  const dir = mkConfigDir({});
  try {
    const r = spawnSync('node', [gateJs], {
      input: 'not json', encoding: 'utf8', stdio: 'pipe',
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), '');
  } finally { rmTmp(dir); }
});
