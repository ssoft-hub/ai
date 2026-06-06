'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function hasTool(name) {
  const r = spawnSync(name, ['--version'], { stdio: 'pipe', timeout: 5000 });
  return !r.error && r.status === 0;
}

function findCompileCommands(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'compile_commands.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const file = process.argv[2];
if (!file || !fs.existsSync(file)) process.exit(0);

if (!hasTool('clang-tidy')) {
  process.stderr.write('Warning: clang-tidy not found in PATH, skipping\n');
  process.exit(0);
}

const compileDir = findCompileCommands(path.dirname(path.resolve(file)));
const args = compileDir
  ? ['-p', compileDir, file]
  : [file, '--', '-std=c++20'];

const r = spawnSync('clang-tidy', args, { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
