'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadCatalog, matchSkills } = require(path.join(__dirname, 'skill-catalog.js'));

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SKILL_CALL = /"name"\s*:\s*"Skill"\s*,\s*"input"\s*:\s*\{\s*"skill"\s*:\s*"([^"]+)"/g;

function skillsIn(text) {
  return [...text.matchAll(SKILL_CALL)].map(m => m[1]);
}

// The transcript only grows, so a run scans the bytes appended since the previous one.
function loadedSkills(transcriptPath, statePath) {
  let state = { size: 0, skills: [] };
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}

  let size;
  try { size = fs.statSync(transcriptPath).size; } catch { return []; }
  if (size < state.size) state = { size: 0, skills: [] };

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
  let state = {};
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
  const denied = state.denied ?? {};
  if (denied[key]) return false;
  denied[key] = true;
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify({ ...state, denied }));
  } catch { return false; }
  return true;
}

// The shell-side writes a blocked Edit could be rerouted through, read as argv rather
// than as text: a quoted argument is one opaque token, so prose mentioning `tee` or `>`
// gates nothing, and a write command counts only in command position. Interpreters
// (node -e, python -c) stay out of reach — this narrows the bypass, it cannot seal it.
const WORD_BREAK = new Set([' ', '\t', '\n', '\r', '"', "'", '|', ';', '&', '<', '>', '(', ')', '`']);
const SEPARATORS = new Set(['|', ';', '&', '(', ')', '`', '\n']);
const SINKS = new Set(['/dev/null', 'nul']);
const PS_CMDLETS = new Set(['set-content', 'add-content', 'out-file']);
const PS_PATH_FLAGS = new Set(['-path', '-filepath', '-literalpath']);

// Tokens: {word, quoted} for arguments, {op} for the shell punctuation the scan keys on.
// 'sep' restarts command position; 'redir' is a stdout redirection whose next token is
// the written file; 'skip' is punctuation that only ends the position — with
// `consumesWord` when the following token belongs to it (a here-doc marker, a
// descriptor redirection's target) rather than to the surrounding command.
// Adjacent pieces with no space between them are one shell word (`V="x y"`), so they
// merge into one token, quoted only when every piece was.
function lex(command) {
  const tokens = [];
  let i = 0;
  let wordEnd = -1;
  const pushWord = (start, word, quoted) => {
    const last = tokens[tokens.length - 1];
    if (start === wordEnd && last?.word !== undefined) {
      last.word += word;
      last.quoted = last.quoted && quoted;
    } else {
      tokens.push({ word, quoted });
    }
  };
  while (i < command.length) {
    const c = command[i];
    if (c === ' ' || c === '\t' || c === '\r') { i += 1; continue; }
    if (SEPARATORS.has(c)) {
      tokens.push({ op: 'sep' });
      while (SEPARATORS.has(command[i])) i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < command.length && command[j] !== c) {
        j += c === '"' && command[j] === '\\' ? 2 : 1;
      }
      pushWord(i, command.slice(i + 1, j), true);
      i = j + 1;
      wordEnd = i;
      continue;
    }
    if (c === '<') {
      while (command[i] === '<') i += 1;
      tokens.push({ op: 'skip', consumesWord: true });
      continue;
    }
    if (c === '>') {
      let j = i;
      while (command[j] === '>') j += 1;
      // `>&2` duplicates a descriptor; nothing is written to a file
      if (command[j] === '&') {
        while (command[j] === '&' || /\d/.test(command[j] ?? '')) j += 1;
        tokens.push({ op: 'skip', consumesWord: false });
      } else {
        // `>|` overrides noclobber and writes like a plain `>`
        if (command[j] === '|') j += 1;
        tokens.push({ op: 'redir' });
      }
      i = j;
      continue;
    }
    let j = i;
    while (j < command.length && !WORD_BREAK.has(command[j])) j += 1;
    const word = command.slice(i, j);
    // a bare descriptor number glued to `>` (`2> file`) redirects that descriptor —
    // treated as a non-write so stderr logs don't reach the gate, matching `2>&1`
    if (command[j] === '>' && /^\d+$/.test(word)) {
      while (command[j] === '>') j += 1;
      if (command[j] === '&') {
        while (command[j] === '&' || /\d/.test(command[j] ?? '')) j += 1;
        tokens.push({ op: 'skip', consumesWord: false });
      } else {
        tokens.push({ op: 'skip', consumesWord: true });
      }
      i = j;
      continue;
    }
    pushWord(i, word, false);
    i = j;
    wordEnd = i;
  }
  return tokens;
}

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

// Prefixes that run their operands as a command, so the write command behind them
// still sits in command position.
const TRANSPARENT = new Set(['sudo', 'doas', 'xargs', 'nohup', 'command', 'time']);

function writeTargets(command) {
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
  return `${path.basename(filePath)} is claimed by skills this session has not loaded: `
    + `${missing.join(', ')}. Load each of them with the Skill tool before editing — `
    + 'the path match is the trigger, not a suggestion; do not skip one as irrelevant. '
    + 'Load order: process, then domain, then narrow.';
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }

    let targets;
    if (EDIT_TOOLS.has(data.tool_name)) {
      const filePath = data.tool_input?.file_path ?? data.tool_input?.path ?? '';
      targets = filePath ? [filePath] : [];
    } else if (data.tool_name === 'Bash') {
      targets = writeTargets(data.tool_input?.command ?? '');
    } else {
      process.exit(0);
    }
    if (!targets.length) process.exit(0);

    const catalog = loadCatalog(path.join(configDir, 'skills'));
    const statePath = path.join(configDir, 'session-env', `${data.session_id ?? 'unknown'}.skill-gate.json`);
    const loaded = new Set(data.transcript_path ? loadedSkills(data.transcript_path, statePath) : []);
    const hits = targets
      .map(file => ({ file, missing: matchSkills(catalog, file).filter(name => !loaded.has(name)) }))
      .filter(hit => hit.missing.length);
    if (!hits.length) process.exit(0);

    const text = hits.map(hit => notice(hit.file, hit.missing)).join('\n');
    const key = hits.map(hit => `${hit.file}|${hit.missing.join(',')}`).join(';');
    if (denyOnce(statePath, key)) {
      const blocked = `${text} This call was blocked; load them, then retry it.`;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: blocked,
        additionalContext: blocked,
      } }));
    } else {
      process.stdout.write(text);
    }
    process.exit(0);
  });
}

module.exports = { skillsIn, loadedSkills, notice, denyOnce, writeTargets };
