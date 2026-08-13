'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CPP_EXTS = new Set(['.h', '.hpp', '.cpp', '.cc', '.cxx']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const toolsDir = path.join(configDir, 'tools');

// A path alone means nothing: `Read` carries one, and formatting a file that was only read
// would rewrite it. `tools/payload.js` states the same rule, kept in step by a test.
function writeTargetOf(input, toolName) {
  const target = input?.file_path ?? input?.path ?? input?.notebook_path ?? '';
  if (!target) return '';
  const content = input?.content ?? input?.new_string ?? input?.new_source ?? input?.edits;
  return EDIT_TOOLS.has(toolName) || content !== undefined ? target : '';
}

// A background call returns at launch, so this hook fires while the work is still running.
// `tools/payload.js` states the same rule, kept in step by a test.
function startedInBackground(input) {
  return input?.run_in_background === true;
}

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

if (require.main === module) {
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  // Before the write target is read, since a background call names no file. Nothing the
  // counter writes is collected: `additionalContext` after every launch would be noise.
  if (startedInBackground(data.tool_input)) {
    const bg = spawnSync('node', [path.join(toolsDir, 'bg-agent-counter.js')], {
      input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 10000,
    });
    if (bg.stderr?.trim()) process.stderr.write(bg.stderr.trim() + '\n');
  }

  const filePath = writeTargetOf(data.tool_input, data.tool_name);
  if (!filePath) process.exit(0);

  // Everything a tool writes is collected instead of printed: after the fact, the model
  // reads `additionalContext` and nothing else this hook puts on stdout.
  const context = [];

  // Reminder for the `comments` skill, not an external linter — runs on every language
  // it knows a comment syntax for, unlike the C++-only LINT tools below.
  const cc = spawnSync('node', [path.join(toolsDir, 'comment-check.js')], { input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 10000 });
  if (cc.stdout?.trim()) context.push(cc.stdout.trim());
  if (cc.stderr?.trim()) process.stderr.write(cc.stderr.trim() + '\n');

  if (CPP_EXTS.has(path.extname(filePath).toLowerCase())) {
    const fileDir = path.dirname(path.resolve(filePath));
    const boundary = repoBoundary(fileDir);

    for (const { tool, config } of LINT) {
      const cfg = findConfig(fileDir, config, boundary);
      if (!cfg) continue;
      const r = spawnSync('node', [path.join(toolsDir, tool), filePath, cfg], { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
      if (r.stdout?.trim()) context.push(r.stdout.trim());
      if (r.stderr?.trim()) process.stderr.write(r.stderr.trim() + '\n');
    }
  }

  if (context.length) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: context.join('\n'),
      },
    }));
  }

  process.exit(0);
});
}

module.exports = { writeTargetOf, startedInBackground };
