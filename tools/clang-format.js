'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');

function findTool(name) {
  const r = spawnSync(name, ['--version'], { stdio: 'pipe', timeout: 5000 });
  return r.error?.code === 'ENOENT' ? null : name;
}

const file = process.argv[2];
if (!file || !fs.existsSync(file)) process.exit(0);

const tool = findTool('clang-format');
if (!tool) {
  process.stderr.write('Warning: clang-format not found in PATH, skipping\n');
  process.exit(0);
}

const r = spawnSync(tool, ['-i', file], { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
