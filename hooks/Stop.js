'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const counterFile = path.join(configDir, '.background-call-count');

// One marker byte per pending call, the representation `tools/background-call-counter.js` writes.
const MARK = 0x2e;

function callPending() {
  try { return fs.readFileSync(counterFile).includes(MARK); } catch { return false; }
}

// Cuts the file back rather than removing one byte of it, so a call counted between the two
// steps goes with it. The hook that counts one has returned before this event fires.
function takeOneOff() {
  try {
    const size = fs.statSync(counterFile).size;
    if (size > 0) fs.truncateSync(counterFile, size - 1);
  } catch {}
}

// Before anything that can hang: this hook runs under a timeout, and a count it is killed
// holding swallows every later notification of the session.
if (callPending()) {
  takeOneOff();
  process.exit(0);
}

spawnSync('node', [path.join(configDir, 'tools', 'stop-notify.js')],
  { stdio: 'inherit', timeout: 10000 });
