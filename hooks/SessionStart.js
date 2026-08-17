'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

// Clear a stale background-call count from any prior crashed session: the file holds one
// marker byte per pending call, so an empty one is a count of zero.
try { require('fs').writeFileSync(path.join(configDir, '.background-call-count'), ''); } catch {}

const CHECKS = ['submodule-status-check.js'];

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
