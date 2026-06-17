'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const counterFile = path.join(configDir, '.bg-agent-count');

function getCount() {
  try {
    const n = parseInt(fs.readFileSync(counterFile, 'utf8').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch { return 0; }
}

const pending = getCount();
if (pending > 0) {
  fs.writeFileSync(counterFile, String(pending - 1));
  process.exit(0);
}

spawnSync('node', [path.join(configDir, 'tools', 'stop-notify.js')],
  { stdio: 'inherit', timeout: 10000 });
