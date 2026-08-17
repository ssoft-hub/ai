'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { skillsIn, notice, loadedSkills, writeTargets, stateOf, denyOnce } = require('../tools/skill-gate');

const gateJs = path.join(__dirname, '..', 'tools', 'skill-gate.js');
const sessionEnv = path.join(
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'session-env');

function insideSessionEnv(target) {
  const rel = path.relative(sessionEnv, path.resolve(target));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

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
// A subagent's Skill call, copied from a 2.1.229 record: the name arrives under `command`.
function agentTranscriptLine(skill) {
  return JSON.stringify({
    parentUuid: '79f23d27-52fa-446d-a3c6-e46c1ef3963c',
    isSidechain: true,
    agentId: 'af038186435975e46',
    message: {
      role: 'assistant',
      content: [{
        type: 'tool_use',
        id: 'toolu_01CWvSycYBgFkwV7hhjzARA2',
        name: 'Skill',
        input: { command: skill },
        caller: { type: 'direct' },
      }],
    },
    type: 'assistant',
    attributionAgent: 'implementer',
    version: '2.1.229',
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
// Claude Code writes a subagent's turns to `<session transcript's dir>/<session id>/subagents/`.
function writeAgentTranscript(transcript, sessionId, agentId, text) {
  const dir = path.join(path.dirname(transcript), sessionId, 'subagents');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `agent-${agentId}.jsonl`), text);
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

test('skillsIn finds a skill a subagent recorded under command', () => {
  assert.deepStrictEqual(skillsIn(agentTranscriptLine('test-driven-development')), ['test-driven-development']);
});

test('skillsIn ignores other tool calls', () => {
  const text = JSON.stringify({ message: { content: [{ name: 'Read', input: { file_path: 'a.cpp' } }] } });
  assert.deepStrictEqual(skillsIn(text), []);
});

test('skillsIn ignores a shell command, which carries the same input key', () => {
  const text = JSON.stringify({
    message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }] },
  });
  assert.deepStrictEqual(skillsIn(text), []);
});

test('notice names the file and every missing skill', () => {
  const text = notice('D:/repo/src/a.cpp', ['cpp-coding', 'comments']);
  assert.ok(text.includes('a.cpp'));
  assert.ok(text.includes('cpp-coding'));
  assert.ok(text.includes('comments'));
  assert.ok(text.includes('Skill tool'));
});

test('notice addresses the agent making the call, not the session', () => {
  const text = notice('D:/repo/src/a.cpp', ['cpp-coding']);
  assert.match(text, /you have not loaded/);
  assert.ok(!/session/i.test(text));
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

test('loadedSkills rebuilds the cursor and the skills of a state file taken away', () => {
  const dir = mkTmp();
  try {
    const transcript = path.join(dir, 't.jsonl');
    const state = path.join(dir, 'state.json');
    fs.writeFileSync(transcript, transcriptLine('debugging') + '\n');
    loadedSkills(transcript, state);
    const before = JSON.parse(fs.readFileSync(state, 'utf8'));

    fs.rmSync(state);
    const skills = loadedSkills(transcript, state);

    assert.deepStrictEqual(skills, ['debugging']);
    const after = JSON.parse(fs.readFileSync(state, 'utf8'));
    assert.strictEqual(after.size, before.size);
    assert.deepStrictEqual(after.skills, before.skills);
  } finally { rmTmp(dir); }
});

test('denyOnce spends a deny again once its state file is taken away', () => {
  const dir = mkTmp();
  try {
    const state = path.join(dir, 's.json');
    assert.strictEqual(denyOnce(state, 'a.cpp|comments'), true);
    assert.strictEqual(denyOnce(state, 'a.cpp|comments'), false);

    fs.rmSync(state);

    assert.strictEqual(denyOnce(state, 'a.cpp|comments'), true);
  } finally { rmTmp(dir); }
});

test('loadedSkills returns nothing for a missing transcript', () => {
  const dir = mkTmp();
  try {
    assert.deepStrictEqual(loadedSkills(path.join(dir, 'absent.jsonl'), path.join(dir, 's.json')), []);
  } finally { rmTmp(dir); }
});

test('denyOnce denies again on a key pooled by a state file predating the agent key', () => {
  const dir = mkTmp();
  try {
    const state = path.join(dir, 's.json');
    fs.writeFileSync(state, JSON.stringify({ size: 10, skills: ['editing'], denied: { 'a.cpp|comments': true } }));
    assert.strictEqual(denyOnce(state, 'a.cpp|comments'), true);
  } finally { rmTmp(dir); }
});

test('the drop keeps the cursor and loaded skills of the file it clears', () => {
  const dir = mkTmp();
  try {
    const state = path.join(dir, 's.json');
    fs.writeFileSync(state, JSON.stringify({ size: 10, skills: ['editing'], denied: { 'a.cpp|comments': true } }));
    denyOnce(state, 'a.cpp|comments');
    const after = JSON.parse(fs.readFileSync(state, 'utf8'));
    assert.strictEqual(after.size, 10);
    assert.deepStrictEqual(after.skills, ['editing']);
  } finally { rmTmp(dir); }
});

test('denyOnce warns on a repeat once the file it cleared carries the marker', () => {
  const dir = mkTmp();
  try {
    const state = path.join(dir, 's.json');
    fs.writeFileSync(state, JSON.stringify({ size: 10, skills: [], denied: { 'a.cpp|comments': true } }));
    denyOnce(state, 'a.cpp|comments');
    assert.strictEqual(denyOnce(state, 'a.cpp|comments'), false);
  } finally { rmTmp(dir); }
});

test('denyOnce keeps a denial recorded by a file already carrying the marker', () => {
  const dir = mkTmp();
  try {
    const state = path.join(dir, 's.json');
    fs.writeFileSync(state, JSON.stringify({ version: 1, denied: { 'a.cpp|comments': true } }));
    assert.strictEqual(denyOnce(state, 'a.cpp|comments'), false);
  } finally { rmTmp(dir); }
});

test('the drop leaves a subagent state file, which starts with no denials, alone', () => {
  const dir = mkTmp();
  try {
    const state = path.join(dir, 's1.a1.json');
    assert.strictEqual(denyOnce(state, 'a.cpp|comments'), true);
    assert.strictEqual(denyOnce(state, 'a.cpp|comments'), false);
  } finally { rmTmp(dir); }
});

test('gate denies the first edit whose claiming skills are not loaded', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' }, session_id: 's1' });
    assert.strictEqual(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /cpp-coding/);
    assert.match(out.hookSpecificOutput.additionalContext, /cpp-coding/);
  } finally { rmTmp(dir); }
});

test('gate downgrades the second identical attempt to a warning', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const input = { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' }, session_id: 's1' };
    runGate(dir, input);
    const r = runGate(dir, input);
    assert.strictEqual(r.status, 0);
    assert.throws(() => JSON.parse(r.stdout));
    assert.ok(r.stdout.includes('cpp-coding'));
  } finally { rmTmp(dir); }
});

test('gate denies a fresh file even after another file was denied', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    runGate(dir, { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' }, session_id: 's1' });
    const r = runGate(dir, { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/b.cpp' }, session_id: 's1' });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
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

test('stateOf leaves the main agent on the name the session already uses', () => {
  assert.strictEqual(path.basename(stateOf('s1', undefined)), 's1.skill-gate.json');
});

test('stateOf gives a subagent a name of its own beside the session', () => {
  assert.strictEqual(path.basename(stateOf('s1', 'a1')), 's1.a1.skill-gate.json');
});

test('gate denies a subagent edit whose claiming skill only the main agent loaded', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const transcript = path.join(dir, 't.jsonl');
    fs.writeFileSync(transcript, transcriptLine('cpp-coding') + '\n');
    const r = runGate(dir, {
      tool_name: 'Edit',
      tool_input: { file_path: 'D:/repo/a.cpp' },
      transcript_path: transcript,
      session_id: 's1',
      agent_id: 'a1',
    });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /cpp-coding/);
  } finally { rmTmp(dir); }
});

test('gate stays silent once the subagent itself loaded the claiming skill', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const transcript = path.join(dir, 't.jsonl');
    fs.writeFileSync(transcript, '');
    writeAgentTranscript(transcript, 's1', 'a1', transcriptLine('cpp-coding') + '\n');
    const r = runGate(dir, {
      tool_name: 'Edit',
      tool_input: { file_path: 'D:/repo/a.cpp' },
      transcript_path: transcript,
      session_id: 's1',
      agent_id: 'a1',
    });
    assert.strictEqual(r.stdout.trim(), '');
  } finally { rmTmp(dir); }
});

test('gate stays silent once a subagent loaded the skill in the shape its build records', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const transcript = path.join(dir, 't.jsonl');
    fs.writeFileSync(transcript, '');
    writeAgentTranscript(transcript, 's1', 'a1', agentTranscriptLine('cpp-coding') + '\n');
    const r = runGate(dir, {
      tool_name: 'Edit',
      tool_input: { file_path: 'D:/repo/a.cpp' },
      transcript_path: transcript,
      session_id: 's1',
      agent_id: 'a1',
    });
    assert.strictEqual(r.stdout.trim(), '');
  } finally { rmTmp(dir); }
});

test('gate denies each subagent on its own account for one file', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const input = { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' }, session_id: 's1' };
    runGate(dir, { ...input, agent_id: 'a1' });
    const r = runGate(dir, { ...input, agent_id: 'a2' });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
  } finally { rmTmp(dir); }
});

test('gate still denies the main agent a file a subagent was already denied', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const input = { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' }, session_id: 's1' };
    runGate(dir, { ...input, agent_id: 'a1' });
    const r = runGate(dir, input);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
  } finally { rmTmp(dir); }
});

test('gate downgrades a subagent repeating its own denied edit to a warning', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const input = {
      tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' },
      session_id: 's1', agent_id: 'a1',
    };
    runGate(dir, input);
    const r = runGate(dir, input);
    assert.strictEqual(r.status, 0);
    assert.throws(() => JSON.parse(r.stdout));
    assert.ok(r.stdout.includes('cpp-coding'));
  } finally { rmTmp(dir); }
});

test('gate keeps an agent id it had to rewrite off the main agent state', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const input = { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' }, session_id: 's1' };
    runGate(dir, input);
    const r = runGate(dir, { ...input, agent_id: '../../../evil' });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
  } finally { rmTmp(dir); }
});

test('stateOf keeps a session id carrying a traversal inside session-env', () => {
  assert.ok(insideSessionEnv(stateOf('../../../evil', undefined)));
});

test('stateOf keeps an agent id carrying a traversal inside session-env', () => {
  assert.ok(insideSessionEnv(stateOf('s1', '../../../evil')));
});

test('gate keeps its state inside session-env for an agent id carrying a traversal', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    runGate(dir, {
      tool_name: 'Edit',
      tool_input: { file_path: 'D:/repo/a.cpp' },
      session_id: 's1',
      agent_id: '../../../evil',
    });
    const stray = fs.readdirSync(dir).filter(entry => entry.endsWith('.skill-gate.json'));
    assert.deepStrictEqual(stray, []);
  } finally { rmTmp(dir); }
});

test('gate leaves the state of every other session alone, however old it is', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const other = path.join(dir, 'session-env', 's0.skill-gate.json');
    fs.writeFileSync(other, '{}');
    const lastYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    fs.utimesSync(other, lastYear, lastYear);

    runGate(dir, { tool_name: 'Edit', tool_input: { file_path: 'D:/repo/a.cpp' }, session_id: 's1' });

    assert.ok(fs.existsSync(other));
  } finally { rmTmp(dir); }
});

test('writeTargets finds the file behind an output redirection', () => {
  assert.deepStrictEqual(writeTargets('cat <<EOF > src/a.cpp'), ['src/a.cpp']);
  assert.deepStrictEqual(writeTargets('echo x >> "logs of work.md"'), ['logs of work.md']);
});

test('writeTargets leaves descriptor and null redirections alone', () => {
  assert.deepStrictEqual(writeTargets('cmd > /dev/null 2>&1'), []);
  assert.deepStrictEqual(writeTargets('cmd 2> /dev/null'), []);
  assert.deepStrictEqual(writeTargets('cmd >&2'), []);
  assert.deepStrictEqual(writeTargets('cmd > NUL'), []);
});

test('writeTargets finds the file behind tee', () => {
  assert.deepStrictEqual(writeTargets('make 2>&1 | tee build.log'), ['build.log']);
  assert.deepStrictEqual(writeTargets('cmd | tee -a notes.py'), ['notes.py']);
});

test('writeTargets finds every file tee writes at once', () => {
  assert.deepStrictEqual(writeTargets('cmd | tee first.log second.cpp'), ['first.log', 'second.cpp']);
  assert.deepStrictEqual(writeTargets('cmd | tee a.txt b.txt | grep x'), ['a.txt', 'b.txt']);
});

test('writeTargets finds the file behind a PowerShell content cmdlet', () => {
  assert.deepStrictEqual(writeTargets('Set-Content -Path a.js -Value x'), ['a.js']);
  assert.deepStrictEqual(writeTargets('"x" | Out-File out.ps1'), ['out.ps1']);
  assert.deepStrictEqual(writeTargets("Add-Content 'b.py' 'line'"), ['b.py']);
});

test('writeTargets finds the file behind PowerShell flags preceding it', () => {
  assert.deepStrictEqual(writeTargets('"x" | Out-File -Encoding UTF8 out.txt'), ['out.txt']);
  assert.deepStrictEqual(writeTargets('"x" | Out-File -Append out.txt'), ['out.txt']);
  assert.deepStrictEqual(writeTargets('Set-Content -Value "text" -Path a.js'), ['a.js']);
});

test('writeTargets finds the destination of cp and mv', () => {
  assert.deepStrictEqual(writeTargets('cp fixture.cpp src/real.cpp'), ['src/real.cpp']);
  assert.deepStrictEqual(writeTargets('mv -f old.js new.js'), ['new.js']);
});

test('writeTargets reads a plain command as no write', () => {
  assert.deepStrictEqual(writeTargets('git status && npm test'), []);
  assert.deepStrictEqual(writeTargets('grep -rn "x" tools/'), []);
});

test('writeTargets ignores a write form inside a quoted argument', () => {
  assert.deepStrictEqual(writeTargets('gh issue comment 1 --body "the gate denied tee a.cpp b.cpp earlier"'), []);
  assert.deepStrictEqual(writeTargets('git commit -m "fix > b.cpp regression"'), []);
  assert.deepStrictEqual(writeTargets("echo 'run cp old.js new.js first'"), []);
});

test('writeTargets finds a redirection beside quoted prose that mentions a write', () => {
  assert.deepStrictEqual(writeTargets('echo "use cp a.cpp b.cpp" > notes.txt'), ['notes.txt']);
});

test('writeTargets recognises a write command after an env-var prefix', () => {
  assert.deepStrictEqual(writeTargets('LC_ALL=C tee out.cpp'), ['out.cpp']);
});

test('writeTargets recognises a write command inside a substitution', () => {
  assert.deepStrictEqual(writeTargets('echo $(tee inner.cpp)'), ['inner.cpp']);
});

test('writeTargets reads tee outside command position as an argument', () => {
  assert.deepStrictEqual(writeTargets('man tee a.cpp'), []);
});

test('writeTargets keeps a tee operand that follows a descriptor duplication', () => {
  assert.deepStrictEqual(writeTargets('cmd | tee a.log >&2 b.log'), ['a.log', 'b.log']);
});

test('writeTargets finds the target of a noclobber redirection', () => {
  assert.deepStrictEqual(writeTargets('cmd >| f.cpp'), ['f.cpp']);
});

test('writeTargets sees through an env prefix carrying a quoted value', () => {
  assert.deepStrictEqual(writeTargets('V="x y" tee out.cpp'), ['out.cpp']);
});

test('writeTargets sees through a transparent prefix command', () => {
  assert.deepStrictEqual(writeTargets('sudo tee out.cpp'), ['out.cpp']);
  assert.deepStrictEqual(writeTargets('cat list | xargs tee out.cpp'), ['out.cpp']);
  assert.deepStrictEqual(writeTargets('nohup tee out.cpp'), ['out.cpp']);
});

test('gate denies a bash write to a file a skill claims', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, {
      tool_name: 'Bash',
      tool_input: { command: 'cat <<EOF > src/a.cpp' },
      session_id: 's1',
    });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /cpp-coding/);
  } finally { rmTmp(dir); }
});

test('gate takes the targets of a command and of a declared write together', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, {
      tool_name: 'RunAndPatch',
      tool_input: { command: 'echo x > src/a.cpp', file_path: 'src/b.cpp', content: 'x' },
      session_id: 's1',
    });
    const reason = JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason;
    assert.match(reason, /a\.cpp/);
    assert.match(reason, /b\.cpp/);
  } finally { rmTmp(dir); }
});

test('gate denies a write by a shell tool it has never heard of', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, {
      tool_name: 'Zsh',
      tool_input: { command: 'echo x > src/a.cpp' },
      session_id: 's1',
    });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /cpp-coding/);
  } finally { rmTmp(dir); }
});

test('gate denies a write by an edit tool it has never heard of', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, {
      tool_name: 'PatchFile',
      tool_input: { file_path: 'src/a.cpp', content: 'x' },
      session_id: 's1',
    });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /cpp-coding/);
  } finally { rmTmp(dir); }
});

test('gate denies a notebook write naming its path and source', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.ipynb"]\n' });
  try {
    const r = runGate(dir, {
      tool_name: 'NotebookEdit',
      tool_input: { notebook_path: 'src/a.ipynb', new_source: 'x' },
      session_id: 's1',
    });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /cpp-coding/);
  } finally { rmTmp(dir); }
});

test('gate stays silent for a tool that only names a file to read', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, {
      tool_name: 'Read',
      tool_input: { file_path: 'src/a.cpp' },
      session_id: 's1',
    });
    assert.strictEqual(r.stdout.trim(), '');
  } finally { rmTmp(dir); }
});

test('gate denies a PowerShell write to a file a skill claims', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, {
      tool_name: 'PowerShell',
      tool_input: { command: 'Set-Content -Path src/a.cpp -Value x' },
      session_id: 's1',
    });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /cpp-coding/);
  } finally { rmTmp(dir); }
});

test('gate shares its deny between an edit and a bash write of one file', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    runGate(dir, { tool_name: 'Edit', tool_input: { file_path: 'src/a.cpp' }, session_id: 's1' });
    const r = runGate(dir, {
      tool_name: 'Bash',
      tool_input: { command: 'echo x > src/a.cpp' },
      session_id: 's1',
    });
    assert.throws(() => JSON.parse(r.stdout));
    assert.ok(r.stdout.includes('cpp-coding'));
  } finally { rmTmp(dir); }
});

test('gate stays silent for a bash command writing no claimed file', () => {
  const dir = mkConfigDir({ 'cpp-coding': 'description: d\nmetadata:\n  paths: ["**/*.cpp"]\n' });
  try {
    const r = runGate(dir, {
      tool_name: 'Bash',
      tool_input: { command: 'npm test > result.log' },
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
