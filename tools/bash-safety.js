'use strict';
const path = require('path');
const { gitCalls } = require(path.join(__dirname, 'git-command.js'));
const { commands, commandName } = require(path.join(__dirname, 'shell-lex.js'));

// A trailing glob names the same target: `rm -rf /*` empties the filesystem `rm -rf /`
// would, and is the form that gets past a shell refusing to remove the root itself.
const ROOT = /^(?:\/|~|\$HOME|%USERPROFILE%)(?:[/\\]\*?|\*)?$/i;
const DRIVE_ROOT = /^[a-zA-Z]:\\?$/;

const operands = args => args.filter(a => !a.startsWith('-'));
const switches = args => args.map(a => a.toLowerCase());
const clustered = args => args.filter(a => /^-[a-zA-Z]+$/.test(a)).join('').toLowerCase();

const recursive = args => clustered(args).includes('r') || switches(args).includes('--recursive');
const forced = args => clustered(args).includes('f') || switches(args).includes('--force');

const BLOCK = [
  { cmd: 'rm', when: a => recursive(a) && forced(a) && operands(a).some(t => ROOT.test(t)), msg: 'rm -rf on root/home — destroys filesystem' },
  { cmd: 'rmdir', when: a => switches(a).includes('/s') && switches(a).includes('/q') && a.some(t => DRIVE_ROOT.test(t)), msg: 'rmdir /s /q on drive root' },
  { cmd: 'format', when: a => a.some(t => /^[a-zA-Z]:$/.test(t)), msg: 'disk format command' },
];

const SHELL_WARN = [
  { cmd: 'rm', when: recursive, msg: 'rm -r — recursive delete, verify target' },
  { cmd: 'del', when: a => switches(a).includes('/s') && switches(a).includes('/q'), msg: 'del /s /q — mass file deletion' },
  { cmd: 'remove-item', when: a => switches(a).includes('-recurse') && switches(a).includes('-force'), msg: 'Remove-Item -Recurse -Force — mass deletion' },
];

const GIT_ASK = [
  { sub: 'push', msg: 'git push affects the shared remote — confirm before pushing' },
];

const GIT_WARN = [
  { sub: 'reset', when: args => args.includes('--hard'), msg: 'git reset --hard — discards uncommitted work' },
  { sub: 'checkout', when: args => args.includes('--') && args.includes('.'), msg: 'git checkout -- . — discards all working tree changes' },
  { sub: 'clean', when: args => args.some(a => /^-[a-zA-Z]*f/.test(a)), msg: 'git clean -f — deletes untracked files' },
];

// SQL travels inside a quoted argument (`psql -c "DROP TABLE users"`), so these rules
// read the command as text where the shell rules above read it as argv.
const WARN = [
  { re: /\bDROP\s+TABLE\b/i, msg: 'DROP TABLE — irreversible database operation' },
  { re: /\bDROP\s+DATABASE\b/i, msg: 'DROP DATABASE — irreversible database operation' },
  { re: /\bTRUNCATE\s+TABLE\b/i, msg: 'TRUNCATE TABLE — deletes all rows' },
];

function shellCalls(cmd) {
  return commands(cmd).map(argv => ({
    cmd: commandName(argv[0]),
    args: argv.slice(1).map(t => t.word),
  }));
}

function check(cmd) {
  const calls = shellCalls(cmd);
  const matches = rules => rules.filter(r => calls.some(c => c.cmd === r.cmd && r.when(c.args)));

  const blocked = matches(BLOCK)[0];
  if (blocked) return { action: 'block', msg: blocked.msg };

  const git = gitCalls(cmd);
  const asked = GIT_ASK.find(r => git.some(c => c.sub === r.sub));
  if (asked) return { action: 'ask', msg: asked.msg };

  const warnings = [
    ...GIT_WARN.filter(r => git.some(c => c.sub === r.sub && r.when(c.args))),
    ...matches(SHELL_WARN),
    ...WARN.filter(({ re }) => re.test(cmd)),
  ];
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

module.exports = { BLOCK, GIT_ASK, GIT_WARN, SHELL_WARN, WARN, check };
