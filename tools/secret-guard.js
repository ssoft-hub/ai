'use strict';
const path = require('path');

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.webp',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
  '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf',
]);

const BLOCK = [
  { name: 'Private Key',  re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ED25519 |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: 'AWS Access Key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub PAT',   re: /\bgh[psuor]_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{82}\b/ },
];

const WARN = [
  { name: 'Generic API key assignment', re: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"`]([A-Za-z0-9+/\-_]{20,})['"`]/ },
  { name: 'Password assignment',        re: /(?<![a-zA-Z])(?:password|passwd)\s*[:=]\s*['"`][^'"`\s]{6,}['"`]/ },
  { name: 'Bearer token',              re: /Bearer\s+[A-Za-z0-9\-._~+/]{30,}/ },
  { name: 'JWT token',                 re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
];

function check(content, filePath) {
  if (filePath && BINARY_EXTS.has(path.extname(filePath).toLowerCase())) return { action: 'pass' };
  if (!content) return { action: 'pass' };
  for (const { name, re } of BLOCK) if (re.test(content)) return { action: 'block', name };
  const warnings = WARN.filter(({ re }) => re.test(content));
  return { action: warnings.length ? 'warn' : 'pass', warnings };
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }

    const filePath = data.tool_input?.file_path ?? data.tool_input?.path ?? '';
    const content = data.tool_input?.new_string ?? data.tool_input?.content ?? '';

    const r = check(content, filePath);
    if (r.action === 'block') {
      process.stderr.write(
        `Blocked: possible secret in file content — ${r.name}\n` +
        `File: ${filePath || '(unknown)'}\n` +
        `Use env vars or a secrets manager instead of hardcoded values.\n`
      );
      process.exit(2);
    }
    if (r.action === 'warn') {
      process.stdout.write(
        'secret-guard warning — possible credentials in file content:\n' +
        r.warnings.map(w => `  • ${w.name}`).join('\n') +
        `\nFile: ${filePath || '(unknown)'}\n` +
        `Verify these are not real secrets before committing.\n`
      );
    }
    process.exit(0);
  });
}

module.exports = { BINARY_EXTS, BLOCK, WARN, check };
