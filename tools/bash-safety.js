'use strict';

const BLOCK = [
  { re: /rm\s+-[a-zA-Z]*rf?\s+(\/|~\/|\$HOME\/|%USERPROFILE%\\)/i, msg: 'rm -rf on root/home — destroys filesystem' },
  { re: /rmdir\s+\/s\s+\/q\s+[a-zA-Z]:\\/i, msg: 'rmdir /s /q on drive root' },
  { re: /format\s+[a-zA-Z]:/i, msg: 'disk format command' },
];

const WARN = [
  { re: /git\s+push\b.*--force\b/i, msg: 'git push --force — overwrites remote history' },
  { re: /git\s+push\b.*\s-f\b/i, msg: 'git push -f — overwrites remote history' },
  { re: /git\s+reset\s+--hard\b/i, msg: 'git reset --hard — discards uncommitted work' },
  { re: /git\s+checkout\s+--\s*\./i, msg: 'git checkout -- . — discards all working tree changes' },
  { re: /git\s+clean\s+-[a-zA-Z]*f/i, msg: 'git clean -f — deletes untracked files' },
  { re: /\bDROP\s+TABLE\b/i, msg: 'DROP TABLE — irreversible database operation' },
  { re: /\bDROP\s+DATABASE\b/i, msg: 'DROP DATABASE — irreversible database operation' },
  { re: /\bTRUNCATE\s+TABLE\b/i, msg: 'TRUNCATE TABLE — deletes all rows' },
  { re: /rm\s+-[a-zA-Z]*rf?\b/i, msg: 'rm -rf — verify target before running' },
  { re: /del\s+\/[sS]\s+\/[qQ]\b/, msg: 'del /s /q — mass file deletion' },
  { re: /Remove-Item\s+-Recurse\s+-Force\b/i, msg: 'Remove-Item -Recurse -Force — mass deletion' },
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const cmd = data.tool_input?.command ?? '';
  if (!cmd) process.exit(0);

  for (const { re, msg } of BLOCK) {
    if (re.test(cmd)) {
      process.stderr.write(`Blocked: ${msg}\nCommand: ${cmd.slice(0, 200)}\n`);
      process.exit(2);
    }
  }

  const warnings = WARN.filter(({ re }) => re.test(cmd));
  if (warnings.length) {
    process.stdout.write(
      'bash-safety warning — destructive command detected:\n' +
      warnings.map(w => `  • ${w.msg}`).join('\n') +
      `\nCommand: ${cmd.slice(0, 200)}\n`
    );
  }
  process.exit(0);
});
