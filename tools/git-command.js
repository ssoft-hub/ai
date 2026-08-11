'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { commands, commandName } = require(path.join(__dirname, 'shell-lex.js'));

// git accepts its global options before the subcommand, and the ones taking a separated
// value hide the subcommand behind two tokens.
const VALUED_OPTS = new Set(['-C', '-c', '--exec-path', '--git-dir', '--work-tree',
  '--namespace', '--config-env', '--attr-source', '--super-prefix']);

const ALIAS_LINE = /^\s*([\w.-]+)\s*=\s*(.+?)\s*$/;
const SECTION_LINE = /^\s*\[([^\]]*)\]/;

// An alias renames a subcommand, so a rule naming `push` sees nothing when the user runs
// `git p`. The alias files are read once per process and their absence costs nothing.
function aliasesFrom(file) {
  const found = new Map();
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return found; }
  // git continues a value onto the next line when the current one ends in a backslash.
  const lines = text.replace(/\\\r?\n\s*/g, ' ').split(/\r?\n/);
  let inAlias = false;
  for (const line of lines) {
    const section = SECTION_LINE.exec(line);
    if (section) { inAlias = section[1].trim().toLowerCase() === 'alias'; continue; }
    if (!inAlias) continue;
    const entry = ALIAS_LINE.exec(line.replace(/^\s*[#;].*$/, ''));
    if (entry) found.set(entry[1].toLowerCase(), entry[2].replace(/^"(.*)"$/, '$1'));
  }
  return found;
}

let configured;
function configuredAliases() {
  if (configured) return configured;
  const home = os.homedir();
  const files = [
    process.env.GIT_CONFIG_GLOBAL || path.join(home, '.gitconfig'),
    path.join(home, '.config', 'git', 'config'),
    path.join(process.cwd(), '.git', 'config'),
  ];
  configured = new Map();
  for (const file of files) for (const [name, value] of aliasesFrom(file)) configured.set(name, value);
  return configured;
}

function gitCall(argv) {
  if (commandName(argv[0]) !== 'git') return null;
  const aliases = new Map();
  for (let k = 1; k < argv.length; k += 1) {
    const word = argv[k].word;
    if (argv[k].quoted || !word.startsWith('-')) {
      return { sub: word.toLowerCase(), args: argv.slice(k + 1).map(t => t.word), aliases };
    }
    if (word === '-c' || word === '--config-env') {
      const setting = argv[k + 1];
      const entry = setting && /^alias\.([^=]+)=([\s\S]*)$/i.exec(setting.word);
      if (entry) aliases.set(entry[1].toLowerCase(), entry[2]);
    }
    if (VALUED_OPTS.has(word)) k += 1;
  }
  return null;
}

// An alias resolves to the call it stands for: a subcommand with the alias arguments
// appended, or, behind a `!`, whatever shell command it runs.
function expand(call, depth) {
  const value = call.aliases.get(call.sub) ?? configuredAliases().get(call.sub);
  if (value === undefined || depth >= 3) return [{ sub: call.sub, args: call.args }];
  if (value.startsWith('!')) return gitCalls(value.slice(1), depth + 1);
  const words = (commands(value)[0] ?? []).map(t => t.word);
  if (!words.length) return [{ sub: call.sub, args: call.args }];
  return expand({ sub: words[0].toLowerCase(), args: [...words.slice(1), ...call.args], aliases: call.aliases },
    depth + 1);
}

// Every git invocation the command runs, as {sub, args} with the global options stripped
// and any alias resolved to the subcommand it stands for.
function gitCalls(command, depth = 0) {
  return commands(command)
    .map(gitCall)
    .filter(Boolean)
    .flatMap(call => expand(call, depth));
}

module.exports = { VALUED_OPTS, gitCalls };
