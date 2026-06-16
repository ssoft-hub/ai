'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

const CHECKS = ['submodule-status-check.js', 'claude-md-skills-sync-check.js'];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  for (const tool of CHECKS) {
    const r = spawnSync('node', [path.join(toolsDir, tool)], {
      input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 10000,
    });
    if (r.stdout?.trim()) process.stdout.write(r.stdout.trim() + '\n');
    if (r.stderr?.trim()) process.stderr.write(r.stderr.trim() + '\n');
  }
  process.exit(0);
});
