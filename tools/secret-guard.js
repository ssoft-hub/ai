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

function extractContent(toolInput) {
  if (!toolInput) return '';
  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map(e => e?.new_string ?? '').join('\n');
  }
  return toolInput.new_string ?? toolInput.new_source ?? toolInput.content ?? '';
}

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

    const filePath = data.tool_input?.file_path ?? data.tool_input?.notebook_path ?? data.tool_input?.path ?? '';
    const command = typeof data.tool_input?.command === 'string' ? data.tool_input.command : '';

    // The written path decides how the written content is read and says nothing about a
    // command the same call carries, so the two are checked apart.
    const checked = [
      { source: 'file content', r: check(extractContent(data.tool_input), filePath) },
      { source: 'command', r: command ? check(command, '') : { action: 'pass', warnings: [] } },
    ];

    const blocked = checked.find(({ r }) => r.action === 'block');
    if (blocked) {
      process.stderr.write(
        `Blocked: possible secret in ${blocked.source} — ${blocked.r.name}\n` +
        `${filePath ? `File: ${filePath}\n` : ''}` +
        `Use env vars or a secrets manager instead of hardcoded values.\n`
      );
      process.exit(2);
    }

    const warned = checked.filter(({ r }) => r.action === 'warn');
    if (warned.length) {
      process.stdout.write(
        `secret-guard warning — possible credentials in ${warned.map(w => w.source).join(' and ')}:\n` +
        warned.flatMap(({ r }) => r.warnings.map(w => `  • ${w.name}`)).join('\n') +
        `\n${filePath ? `File: ${filePath}\n` : ''}` +
        `Verify these are not real secrets before committing.\n`
      );
    }
    process.exit(0);
  });
}

module.exports = { BINARY_EXTS, BLOCK, WARN, check, extractContent };
