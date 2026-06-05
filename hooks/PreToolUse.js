'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

const DISPATCH = {
  Bash:  ['bash-safety.js'],
  Edit:  ['secret-guard.js'],
  Write: ['secret-guard.js'],
};

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const tools = DISPATCH[data.tool_name] ?? [];
  if (!tools.length) process.exit(0);

  for (const tool of tools) {
    const r = spawnSync('node', [path.join(toolsDir, tool)], {
      input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 30000,
    });
    if (r.stdout?.trim()) process.stdout.write(r.stdout);
    if (r.stderr?.trim()) process.stderr.write(r.stderr);
    if (r.status === 2) process.exit(2);
  }
  process.exit(0);
});
