'use strict';
const fs = require('fs');
const path = require('path');
const { backgroundIn } = require(path.join(__dirname, 'payload.js'));

// One marker byte per pending call: the count is how many of them the file holds. Taking a
// call back off is the truncation in `hooks/Stop.js`, which owns that half of this file.
const MARK = 0x2e;

function counterPath(dir) {
  return path.join(dir, '.background-call-count');
}

function get(dir) {
  try {
    let n = 0;
    for (const byte of fs.readFileSync(counterPath(dir))) if (byte === MARK) n++;
    return n;
  } catch { return 0; }
}

// Appended rather than rewritten: calls launched in one message count concurrently, and a
// read-modify-write between them loses one.
function increment(dir) {
  fs.appendFileSync(counterPath(dir), Buffer.from([MARK]));
}

if (require.main === module) {
  const os = require('os');
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }
    try {
      if (backgroundIn(data.tool_input)) increment(configDir);
    } catch (err) {
      process.stderr.write(`background-call-counter: the call was not counted — ${String(err?.message).split('\n')[0]}\n`);
    }
    process.exit(0);
  });
}

module.exports = { counterPath, get, increment };
