'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CPP_EXTS = new Set(['.h', '.hpp', '.cpp', '.cc', '.cxx']);
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');
const LINT_TOOLS = ['clang-format.js', 'clang-tidy.js', 'cppcheck.js'];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  if (data.tool_name !== 'Edit' && data.tool_name !== 'Write') process.exit(0);

  const filePath = data.tool_input?.file_path ?? data.tool_input?.path;
  if (!filePath || !CPP_EXTS.has(path.extname(filePath).toLowerCase())) process.exit(0);

  if (fs.existsSync(path.join(process.cwd(), '.claude', 'hooks', 'PostToolUse.js'))) process.exit(0);

  const output = [];
  for (const tool of LINT_TOOLS) {
    const r = spawnSync('node', [path.join(toolsDir, tool), filePath], { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
    if (r.stdout?.trim()) output.push(r.stdout.trim());
    if (r.stderr?.trim()) output.push(r.stderr.trim());
  }

  if (output.length) process.stdout.write(output.join('\n') + '\n');
  process.exit(0);
});
