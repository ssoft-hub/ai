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
    fs.writeFileSync(statePath, JSON.stringify({ size: consumed, skills }));
  } catch {}
  return skills;
}

function notice(filePath, missing) {
  return `${path.basename(filePath)}: load with the Skill tool before editing — `
    + `${missing.join(', ')} (process, then domain, then narrow scope).`;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }
    if (!EDIT_TOOLS.has(data.tool_name)) process.exit(0);

    const filePath = data.tool_input?.file_path ?? data.tool_input?.path ?? '';
    if (!filePath) process.exit(0);

    const matched = matchSkills(loadCatalog(path.join(configDir, 'skills')), filePath);
    if (!matched.length) process.exit(0);

    const statePath = path.join(configDir, 'session-env', `${data.session_id ?? 'unknown'}.skill-gate.json`);
    const loaded = new Set(data.transcript_path ? loadedSkills(data.transcript_path, statePath) : []);
    const missing = matched.filter(name => !loaded.has(name));
    if (missing.length) process.stdout.write(notice(filePath, missing));
    process.exit(0);
  });
}

module.exports = { skillsIn, loadedSkills, notice };
