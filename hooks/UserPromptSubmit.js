'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  const r = spawnSync('node', [path.join(toolsDir, 'skills-reminder.js')], {
    input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 5000,
  });
  if (r.error) { process.stderr.write(`skills-reminder error: ${r.error.message}\n`); return; }
  if (r.stdout?.trim()) process.stdout.write(r.stdout);
});
