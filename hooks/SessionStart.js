'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

// Clear a stale background-call count from any prior crashed session: the file holds one
// marker byte per pending call, so an empty one is a count of zero.
try { require('fs').writeFileSync(path.join(configDir, '.background-call-count'), ''); } catch {}

// `settings.json` gives this event 30s and each tool below takes at most 10 of them: a
// third one needs that budget raised, or a stalled tool leaves the next no run at all.
const TOOLS = ['session-env-prune.js', 'submodule-status-check.js'];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  for (const tool of TOOLS) {
    const r = spawnSync('node', [path.join(toolsDir, tool)], {
      input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 10000,
    });
    if (r.stdout?.trim()) process.stdout.write(r.stdout.trim() + '\n');
    if (r.stderr?.trim()) process.stderr.write(r.stderr.trim() + '\n');
  }
  process.exit(0);
});
