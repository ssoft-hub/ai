'use strict';
const fs = require('fs');
const path = require('path');

function counterPath(dir) {
  return path.join(dir, '.bg-agent-count');
}

function get(dir) {
  try {
    const n = parseInt(fs.readFileSync(counterPath(dir), 'utf8').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch { return 0; }
}

function increment(dir) {
  fs.writeFileSync(counterPath(dir), String(get(dir) + 1));
}

function decrement(dir) {
  fs.writeFileSync(counterPath(dir), String(Math.max(0, get(dir) - 1)));
}

function reset(dir) {
  fs.writeFileSync(counterPath(dir), '0');
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
    if (data.tool_input?.run_in_background === true) increment(configDir);
    process.exit(0);
  });
}

module.exports = { counterPath, get, increment, decrement, reset };
