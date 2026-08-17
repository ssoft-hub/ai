'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
// Past the built-ins above, only this is read for every payload; the rest load where needed.
const { commandIn, writePathIn } = require(path.join(__dirname, 'payload.js'));

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

// A main thread records the skill under `skill`, a subagent under `command`.
const SKILL_CALL = /"name"\s*:\s*"Skill"\s*,\s*"input"\s*:\s*\{\s*"(?:skill|command)"\s*:\s*"([^"]+)"/g;

function skillsIn(text) {
  return [...text.matchAll(SKILL_CALL)].map(m => m[1]);
}

function gateTargets(input, toolName) {
  const declared = writePathIn(input, toolName);
  const command = commandIn(input);
  let written = [];
  if (command) {
    // The lexer loads inside `writeTargets`, so the command half failing must not take the
    // declared target with it. With nothing else to gate, the failure is the guard's own.
    try { written = writeTargets(command); } catch (err) { if (!declared) throw err; }
  }
  return [...written, ...(declared ? [declared] : [])];
}

// Version 1 is the first whose `denied` belongs to one agent; an unversioned file pooled
// the whole session into it, so those denials are dropped on the read that stamps it.
const STATE_VERSION = 1;

function readState(statePath) {
  const base = { size: 0, skills: [], denied: {}, version: STATE_VERSION };
  let stored;
  try { stored = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { return base; }
  if (stored?.version === STATE_VERSION) return { ...base, ...stored };
  const { denied, ...kept } = stored ?? {};
  return { ...base, ...kept, version: STATE_VERSION };
}

// The transcript only grows, so a run scans the bytes appended since the previous one.
function loadedSkills(transcriptPath, statePath) {
  let state = readState(statePath);

  let size;
  try { size = fs.statSync(transcriptPath).size; } catch { return []; }
  if (size < state.size) state = { ...state, size: 0, skills: [] };

  let chunk = '';
  let consumed = state.size;
  if (size > state.size) {
    const fd = fs.openSync(transcriptPath, 'r');
    try {
      const buffer = Buffer.alloc(size - state.size);
      fs.readSync(fd, buffer, 0, buffer.length, state.size);
      // The last line may still be half-written; leave it for the next run, which is
      // also what keeps a multi-byte character from being split across two reads
      const complete = buffer.lastIndexOf(0x0a) + 1;
      chunk = buffer.subarray(0, complete).toString('utf8');
      consumed = state.size + complete;
    } finally { fs.closeSync(fd); }
  }

  const skills = [...new Set([...state.skills, ...skillsIn(chunk)])];
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify({ ...state, size: consumed, skills }));
  } catch {}
  return skills;
}

// One deny per file and missing-skill set: enough to stop an agent that can load the
// skills, harmless to one that cannot. A deny that fails to persist warns instead —
// deny-every-time would deadlock an agent with no Skill tool.
function denyOnce(statePath, key) {
  const state = readState(statePath);
  const denied = state.denied;
  if (denied[key]) return false;
  denied[key] = true;
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify({ ...state, denied }));
  } catch { return false; }
  return true;
}

// The shell-side writes a blocked Edit could be rerouted through, read as argv by
// `shell-lex`: a write command counts only in command position, so prose mentioning
// `tee` or `>` gates nothing.
const SINKS = new Set(['/dev/null', 'nul']);
const PS_CMDLETS = new Set(['set-content', 'add-content', 'out-file']);
const PS_PATH_FLAGS = new Set(['-path', '-filepath', '-literalpath']);

function keepTarget(targets, token) {
  const target = token?.word;
  if (target && !SINKS.has(target.toLowerCase()) && !(token.quoted === false && target.startsWith('-'))) {
    targets.push(target);
  }
}

// Operand tokens of one command, from the token after the command word to the next
// separator; redirections and their targets belong to the redirect handling, not here.
function operandsAfter(tokens, start) {
  const operands = [];
  for (let k = start; k < tokens.length && tokens[k].op !== 'sep'; k += 1) {
    if (tokens[k].op === 'redir' || tokens[k].consumesWord) { k += 1; continue; }
    if (tokens[k].op === 'skip') continue;
    operands.push(tokens[k]);
  }
  return operands;
}

function powershellTarget(operands) {
  const flagIndex = operands.findIndex(
    t => !t.quoted && PS_PATH_FLAGS.has(t.word?.toLowerCase()));
  if (flagIndex !== -1) return operands[flagIndex + 1];
  let lastFlagValue;
  for (let k = 0; k < operands.length; k += 1) {
    const t = operands[k];
    if (!t.quoted && t.word.startsWith('-')) {
      const next = operands[k + 1];
      // a flag's value never starts with a dash; remember it in case the flag
      // actually took none and the value is the positional target after all
      if (next && !(next.quoted === false && next.word.startsWith('-'))) { lastFlagValue = next; k += 1; }
      continue;
    }
    return t;
  }
  return lastFlagValue;
}

function writeTargets(command) {
  const { lex, TRANSPARENT } = require(path.join(__dirname, 'shell-lex.js'));
  const tokens = lex(String(command));
  const targets = [];
  let commandPosition = true;
  for (let k = 0; k < tokens.length; k += 1) {
    const token = tokens[k];
    if (token.op === 'sep') { commandPosition = true; continue; }
    if (token.op === 'redir') {
      if (tokens[k + 1]?.word !== undefined) { keepTarget(targets, tokens[k + 1]); k += 1; }
      commandPosition = false;
      continue;
    }
    if (token.op === 'skip') { commandPosition = false; continue; }
    if (commandPosition && !token.quoted) {
      // `VAR=x cmd` keeps cmd in command position
      if (/^\w+=/.test(token.word)) continue;
      const word = token.word.toLowerCase();
      if (TRANSPARENT.has(word)) continue;
      if (word === 'tee') {
        operandsAfter(tokens, k + 1).forEach(t => keepTarget(targets, t));
      } else if (word === 'cp' || word === 'mv') {
        const operands = operandsAfter(tokens, k + 1)
          .filter(t => t.quoted || !t.word.startsWith('-'));
        if (operands.length >= 2) keepTarget(targets, operands[operands.length - 1]);
      } else if (PS_CMDLETS.has(word)) {
        keepTarget(targets, powershellTarget(operandsAfter(tokens, k + 1)));
      }
    }
    commandPosition = false;
  }
  return [...new Set(targets)];
}

function notice(filePath, missing) {
  return `${path.basename(filePath)} is claimed by skills you have not loaded: `
    + `${missing.join(', ')}. Load each of them with the Skill tool before editing — `
    + 'the path match is the trigger, not a suggestion; do not skip one as irrelevant. '
    + 'Load order: process, then domain, then narrow.';
}

// Each id below names a directory or a file, so an unplain one is hashed rather than
// dropped: dropping it would pool that agent with the session, the case this guard is for.
const PLAIN_ID = /^[A-Za-z0-9_-]+$/;

function plain(id, fallback) {
  if (typeof id !== 'string' || !id) return fallback;
  if (PLAIN_ID.test(id)) return id;
  return require('crypto').createHash('sha256').update(id).digest('hex').slice(0, 16);
}

// A subagent's transcript sits under the project directory and session id Claude Code
// builds the session's own path from.
function transcriptOf(transcriptPath, sessionId, agentId) {
  const session = plain(sessionId);
  const agent = plain(agentId);
  if (!transcriptPath || !session || !agent) return transcriptPath;
  return path.join(path.dirname(transcriptPath), session, 'subagents', `agent-${agent}.jsonl`);
}

// Exported, so `session-env-prune.js` knows which files are this repo's without
// spelling the name a second time.
const STATE_SUFFIX = '.skill-gate.json';

// `agent_id` is absent on the main thread, which therefore keeps the session's own name.
function stateOf(sessionId, agentId) {
  const session = plain(sessionId, 'unknown');
  const agent = plain(agentId);
  const scope = agent ? `${session}.${agent}` : session;
  return path.join(configDir, 'session-env', `${scope}${STATE_SUFFIX}`);
}

function verdict(data) {
  const targets = gateTargets(data.tool_input, data.tool_name);
  if (!targets.length) return undefined;

  const { loadCatalog, matchSkills } = require(path.join(__dirname, 'skill-catalog.js'));
  const catalog = loadCatalog(path.join(configDir, 'skills'));
  const statePath = stateOf(data.session_id, data.agent_id);
  const transcript = transcriptOf(data.transcript_path, data.session_id, data.agent_id);
  const loaded = new Set(transcript ? loadedSkills(transcript, statePath) : []);
  const hits = targets
    .map(file => ({ file, missing: matchSkills(catalog, file).filter(name => !loaded.has(name)) }))
    .filter(hit => hit.missing.length);
  if (!hits.length) return undefined;

  const text = hits.map(hit => notice(hit.file, hit.missing)).join('\n');
  const key = hits.map(hit => `${hit.file}|${hit.missing.join(',')}`).join(';');
  if (!denyOnce(statePath, key)) return { output: text };

  const blocked = `${text} This call was blocked; load them, then retry it.`;
  return { output: JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: blocked,
    additionalContext: blocked,
  } }) };
}

if (require.main === module) require(path.join(__dirname, 'guard.js')).runAsScript(verdict);

module.exports = {
  skillsIn, loadedSkills, notice, denyOnce, writeTargets, gateTargets, stateOf, verdict,
  STATE_SUFFIX,
};
