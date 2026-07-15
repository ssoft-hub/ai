'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CPP_EXTS = new Set(['.h', '.hpp', '.cpp', '.cc', '.cxx']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

// Each lint tool runs only when its config file is present in this repository.
// Without the config the tool is unconfigured here and is skipped silently, so
// it never produces noise (and never picks up a config from a parent repo).
const LINT = [
  { tool: 'clang-format.js', config: '.clang-format' },
  { tool: 'clang-tidy.js',   config: '.clang-tidy' },
  { tool: 'cppcheck.js',     config: '.cppcheck' },
];

// Boundary of "this repository": the nearest ancestor holding .git (a directory
// for a normal checkout, a file for a worktree/submodule). If there is no .git,
// fall back to cwd when it is an ancestor of startDir, otherwise startDir itself
// — conservatively never ascending into a parent.
function repoBoundary(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const cwd = process.cwd();
  const rel = path.relative(cwd, startDir);
  return (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) ? cwd : startDir;
}

// Search for configName from fromDir upward, never ascending past boundary.
// Returns the absolute path of the config, or null when not found in the repo.
function findConfig(fromDir, configName, boundary) {
  let dir = fromDir;
  while (true) {
    const candidate = path.join(dir, configName);
    if (fs.existsSync(candidate)) return candidate;
    if (dir === boundary) return null;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  if (!EDIT_TOOLS.has(data.tool_name)) process.exit(0);

  const filePath = data.tool_input?.file_path ?? data.tool_input?.notebook_path ?? data.tool_input?.path;
  if (!filePath || !CPP_EXTS.has(path.extname(filePath).toLowerCase())) process.exit(0);

  // Reminder for the `comments` skill, not an external linter — runs unconditionally,
  // unlike the LINT tools below which require a project config file.
  const cc = spawnSync('node', [path.join(toolsDir, 'comment-check.js')], { input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 10000 });
  if (cc.stdout?.trim()) process.stdout.write(cc.stdout.trim() + '\n');

  const fileDir = path.dirname(path.resolve(filePath));
  const boundary = repoBoundary(fileDir);

  for (const { tool, config } of LINT) {
    const cfg = findConfig(fileDir, config, boundary);
    if (!cfg) continue;
    const r = spawnSync('node', [path.join(toolsDir, tool), filePath, cfg], { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
    if (r.stdout?.trim()) process.stdout.write(r.stdout.trim() + '\n');
    if (r.stderr?.trim()) process.stderr.write(r.stderr.trim() + '\n');
  }

  process.exit(0);
});
