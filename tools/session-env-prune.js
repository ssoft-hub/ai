'use strict';
const fs = require('fs');
const path = require('path');
const { stateOf, STATE_SUFFIX } = require(path.join(__dirname, 'skill-gate.js'));

// How long the state of a session other than the one starting survives: one resumed
// inside the window still finds the denials it spent.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Read off `stateOf`, which names a file for every payload: an id the gate had to rewrite
// is matched as the gate wrote it, and a payload carrying none keeps the name it wrote to.
function sessionPrefix(sessionId) {
  return path.basename(stateOf(sessionId)).slice(0, -STATE_SUFFIX.length) + '.';
}

function prune(dir, sessionId) {
  const live = sessionPrefix(sessionId);
  const now = Date.now();
  let names;
  try { names = fs.readdirSync(dir); } catch { return 0; }
  let removed = 0;
  for (const name of names) {
    // Claude Code keeps per-session directories of its own beside these.
    if (!name.endsWith(STATE_SUFFIX)) continue;
    if (name.startsWith(live)) continue;
    const file = path.join(dir, name);
    // One entry another session is writing or has just removed leaves the rest to sweep.
    try {
      if (now - fs.statSync(file).mtimeMs < RETENTION_MS) continue;
      fs.unlinkSync(file);
      removed += 1;
    } catch {}
  }
  return removed;
}

// Silent when it worked: `SessionStart` stdout is added to the model's context as written.
if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }
    try {
      prune(path.dirname(stateOf(data.session_id)), data.session_id);
    } catch (err) {
      process.stderr.write(`session-env-prune: state was left in place — ${String(err?.message).split('\n')[0]}\n`);
    }
    process.exit(0);
  });
}

module.exports = { prune, RETENTION_MS };
