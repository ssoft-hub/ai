'use strict';

const BLOCK = [
  { re: /(?:sudo\s+)?rm\s+-(?=[a-zA-Z]*r)(?=[a-zA-Z]*f)[a-zA-Z]+\s+["']?(\/|~\/?|\$HOME\/?|%USERPROFILE%\\?)["']?(\s|$)/i, msg: 'rm -rf on root/home — destroys filesystem' },
  { re: /rmdir\s+\/s\s+\/q\s+[a-zA-Z]:\\/i, msg: 'rmdir /s /q on drive root' },
  { re: /format\s+[a-zA-Z]:/i, msg: 'disk format command' },
];

const ASK = [
  { re: /(?:^|[\n;&|])\s*git\s+push\b/i, msg: 'git push affects the shared remote — confirm before pushing' },
];

const WARN = [
  { re: /git\s+reset\s+--hard\b/i, msg: 'git reset --hard — discards uncommitted work' },
  { re: /git\s+checkout\s+--\s*\./i, msg: 'git checkout -- . — discards all working tree changes' },
  { re: /git\s+clean\s+-[a-zA-Z]*f/i, msg: 'git clean -f — deletes untracked files' },
  { re: /\bDROP\s+TABLE\b/i, msg: 'DROP TABLE — irreversible database operation' },
  { re: /\bDROP\s+DATABASE\b/i, msg: 'DROP DATABASE — irreversible database operation' },
  { re: /\bTRUNCATE\s+TABLE\b/i, msg: 'TRUNCATE TABLE — deletes all rows' },
  { re: /(?:sudo\s+)?rm\s+-(?=[a-zA-Z]*r)[a-zA-Z]+\b/i, msg: 'rm -r — recursive delete, verify target' },
  { re: /\bdel\s+(?:\/[sq]\s+){2}/i, msg: 'del /s /q — mass file deletion' },
  { re: /Remove-Item\s+-Recurse\s+-Force\b/i, msg: 'Remove-Item -Recurse -Force — mass deletion' },
];

function check(cmd) {
  for (const { re, msg } of BLOCK) if (re.test(cmd)) return { action: 'block', msg };
  for (const { re, msg } of ASK) if (re.test(cmd)) return { action: 'ask', msg };
  const warnings = WARN.filter(({ re }) => re.test(cmd));
  return { action: warnings.length ? 'warn' : 'pass', warnings };
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }

    const cmd = data.tool_input?.command ?? '';
    if (!cmd) process.exit(0);

    const r = check(cmd);
    if (r.action === 'block') {
      process.stderr.write(`Blocked: ${r.msg}\nCommand: ${cmd.slice(0, 200)}\n`);
      process.exit(2);
    }
    if (r.action === 'ask') {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: r.msg,
        },
      }));
      process.exit(0);
    }
    if (r.action === 'warn') {
      process.stdout.write(
        'bash-safety warning — destructive command detected:\n' +
        r.warnings.map(w => `  • ${w.msg}`).join('\n') +
        `\nCommand: ${cmd.slice(0, 200)}\n`
      );
    }
    process.exit(0);
  });
}

module.exports = { BLOCK, ASK, WARN, check };
