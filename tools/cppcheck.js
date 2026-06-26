'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');

function hasTool(name) {
  const r = spawnSync(name, ['--version'], { stdio: 'pipe', timeout: 5000 });
  return !r.error && r.status === 0;
}

const file = process.argv[2];
const suppressions = process.argv[3];
if (!file || !fs.existsSync(file)) process.exit(0);

if (!hasTool('cppcheck')) {
  process.stderr.write('Warning: cppcheck not found in PATH, skipping\n');
  process.exit(0);
}

const args = [
  '--enable=warning,style,performance,portability',
  '--std=c++20',
  '--language=c++',
  '--inline-suppr',
  '--error-exitcode=1',
  '-UDOXYGEN',
];
if (suppressions) args.push(`--suppressions-list=${suppressions}`);
args.push(file);

const r = spawnSync('cppcheck', args, { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
