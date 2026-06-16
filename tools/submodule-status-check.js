'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PREFIX_NAMES = { '+': 'ahead of root ref', '-': 'not initialized', 'U': 'merge conflict' };

function parseStatus(output) {
  const issues = [];
  for (const line of output.split('\n')) {
    if (!line) continue;
    const prefix = line[0];
    if (prefix in PREFIX_NAMES) {
      issues.push({ prefix, name: PREFIX_NAMES[prefix], line: line.trim() });
    }
  }
  return issues;
}

function check(cwd) {
  if (!fs.existsSync(path.join(cwd, '.gitmodules'))) return { issues: [] };
  const r = spawnSync('git', ['submodule', 'status'], { cwd, encoding: 'utf8', timeout: 10000 });
  if (r.error || r.status !== 0) return { issues: [] };
  return { issues: parseStatus(r.stdout || '') };
}

if (require.main === module) {
  const { issues } = check(process.cwd());
  if (issues.length) {
    process.stdout.write(
      'submodule-status-check warning — submodules need attention:\n' +
      issues.map(i => `  • ${i.line} (${i.name})`).join('\n') +
      '\nSee submodule-sync skill.\n'
    );
  }
  process.exit(0);
}

module.exports = { PREFIX_NAMES, parseStatus, check };
