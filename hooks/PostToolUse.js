'use strict';
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const CPP_EXTS = new Set(['.h', '.hpp', '.cpp', '.cc', '.cxx']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');
const LINT_TOOLS = ['clang-format.js', 'clang-tidy.js', 'cppcheck.js'];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  if (!EDIT_TOOLS.has(data.tool_name)) process.exit(0);

  const filePath = data.tool_input?.file_path ?? data.tool_input?.notebook_path ?? data.tool_input?.path;
  if (!filePath || !CPP_EXTS.has(path.extname(filePath).toLowerCase())) process.exit(0);

  for (const tool of LINT_TOOLS) {
    const r = spawnSync('node', [path.join(toolsDir, tool), filePath], { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
    if (r.stdout?.trim()) process.stdout.write(r.stdout.trim() + '\n');
    if (r.stderr?.trim()) process.stderr.write(r.stderr.trim() + '\n');
  }

  process.exit(0);
});
