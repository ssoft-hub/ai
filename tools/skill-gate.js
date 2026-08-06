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

// The shell-side writes a blocked Edit could be rerouted through. Interpreters
// (node -e, python -c) stay out of reach — this narrows the bypass, it cannot seal it.
const WRITE_FORMS = [
  // `> file` and `>> file`, but not `2>`, `&>`, `>&2` or a here-doc's `<<`
  /(?<![<>&\d])>{1,2}\s*(?:"([^"]+)"|'([^']+)'|([^\s;|&<>)]+))/g,
  // an explicit -Path/-FilePath/-LiteralPath wins over position
  /\b(?:Set-Content|Add-Content|Out-File)\b[^;|&]*?-(?:Path|FilePath|LiteralPath)\s+(?:"([^"]+)"|'([^']+)'|([^\s;|&<>]+))/gi,
  // positional target; a flag's optional value never starts with a dash, and
  // backtracking hands the last word back when the flag turns out to take none.
  // Stops at a path-naming flag — the explicit form above owns that case
  /\b(?:Set-Content|Add-Content|Out-File)\s+(?:-(?!(?:Path|FilePath|LiteralPath)\b)\w+(?:\s+(?:"[^"]*"|'[^']*'|[^-\s;|&<>][^\s;|&<>]*))?\s+)*(?:"([^"]+)"|'([^']+)'|([^\s;|&<>]+))/gi,
  /\b(?:cp|mv)\s+(?:-\S+\s+)*\S+\s+(?:"([^"]+)"|'([^']+)'|([^\s;|&<>]+))\s*(?:$|[;|&])/g,
];
// tee writes every operand, so its whole argument run is captured and tokenized.
const TEE_RUN = /\btee\s+(?:-\w+\s+)*((?:"[^"]+"|'[^']+'|[^\s;|&<>]+)(?:[ \t]+(?:"[^"]+"|'[^']+'|[^\s;|&<>]+))*)/g;
const TOKEN = /"([^"]+)"|'([^']+)'|(\S+)/g;
const SINKS = new Set(['/dev/null', 'nul']);

function keepTarget(targets, target) {
  if (target && !SINKS.has(target.toLowerCase()) && !target.startsWith('-')) {
    targets.push(target);
  }
}

function writeTargets(command) {
  const targets = [];
  for (const form of WRITE_FORMS) {
    for (const m of command.matchAll(form)) {
      keepTarget(targets, m[1] ?? m[2] ?? m[3]);
    }
  }
  for (const run of command.matchAll(TEE_RUN)) {
    for (const t of run[1].matchAll(TOKEN)) {
      keepTarget(targets, t[1] ?? t[2] ?? t[3]);
    }
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
