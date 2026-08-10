'use strict';

// A shell command read as argv rather than as text: a quoted argument is one opaque
// token, so prose naming a command gates nothing, and a command counts only where the
// shell would run it. Interpreters (node -e, python -c) stay out of reach — this narrows
// what a guard misses, it cannot seal it.
const WORD_BREAK = new Set([' ', '\t', '\n', '\r', '"', "'", '|', ';', '&', '<', '>', '(', ')', '`']);
const SEPARATORS = new Set(['|', ';', '&', '(', ')', '`', '\n']);

// Prefixes that run their operands as a command, so the command behind them still sits
// in command position.
const TRANSPARENT = new Set(['sudo', 'doas', 'env', 'xargs', 'nohup', 'command', 'time']);

// Tokens: {word, quoted} for arguments, {op} for the shell punctuation the scan keys on.
// 'sep' restarts command position; 'redir' is a stdout redirection whose next token is
// the written file; 'skip' is punctuation that only ends the position — with
// `consumesWord` when the following token belongs to it (a here-doc marker, a
// descriptor redirection's target) rather than to the surrounding command.
// Adjacent pieces with no space between them are one shell word (`V="x y"`), so they
// merge into one token, quoted only when every piece was.
function lex(command) {
  const tokens = [];
  let i = 0;
  let wordEnd = -1;
  const pushWord = (start, word, quoted) => {
    const last = tokens[tokens.length - 1];
    if (start === wordEnd && last?.word !== undefined) {
      last.word += word;
      last.quoted = last.quoted && quoted;
    } else {
      tokens.push({ word, quoted });
    }
  };
  while (i < command.length) {
    const c = command[i];
    if (c === ' ' || c === '\t' || c === '\r') { i += 1; continue; }
    if (SEPARATORS.has(c)) {
      tokens.push({ op: 'sep' });
      while (SEPARATORS.has(command[i])) i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < command.length && command[j] !== c) {
        j += c === '"' && command[j] === '\\' ? 2 : 1;
      }
      pushWord(i, command.slice(i + 1, j), true);
      i = j + 1;
      wordEnd = i;
      continue;
    }
    if (c === '<') {
      while (command[i] === '<') i += 1;
      tokens.push({ op: 'skip', consumesWord: true });
      continue;
    }
    if (c === '>') {
      let j = i;
      while (command[j] === '>') j += 1;
      // `>&2` duplicates a descriptor; nothing is written to a file
      if (command[j] === '&') {
        while (command[j] === '&' || /\d/.test(command[j] ?? '')) j += 1;
        tokens.push({ op: 'skip', consumesWord: false });
      } else {
        // `>|` overrides noclobber and writes like a plain `>`
        if (command[j] === '|') j += 1;
        tokens.push({ op: 'redir' });
      }
      i = j;
      continue;
    }
    let j = i;
    while (j < command.length && !WORD_BREAK.has(command[j])) j += 1;
    const word = command.slice(i, j);
    // a bare descriptor number glued to `>` (`2> file`) redirects that descriptor —
    // treated as a non-write so stderr logs don't reach the gate, matching `2>&1`
    if (command[j] === '>' && /^\d+$/.test(word)) {
      while (command[j] === '>') j += 1;
      if (command[j] === '&') {
        while (command[j] === '&' || /\d/.test(command[j] ?? '')) j += 1;
        tokens.push({ op: 'skip', consumesWord: false });
      } else {
        tokens.push({ op: 'skip', consumesWord: true });
      }
      i = j;
      continue;
    }
    pushWord(i, word, false);
    i = j;
    wordEnd = i;
  }
  return tokens;
}

// An interpreter runs a command written inside one of its own arguments, so an argv read
// at the outer level stops at the interpreter's name. Every quoted argument of one is
// read as a command string in its own right, and so is every quoted run inside that — the
// command a script hands to its own exec function sits one quoting level deeper again.
const INTERPRETERS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'ash', 'busybox',
  'pwsh', 'powershell', 'cmd', 'node', 'nodejs', 'deno', 'bun',
  'python', 'python3', 'py', 'perl', 'ruby', 'php']);
const POWERSHELL = new Set(['pwsh', 'powershell']);
// PowerShell also takes its command base64-encoded as UTF-16, which no lexer sees through.
const ENCODED_FLAGS = new Set(['-encodedcommand', '-enc', '-ec', '-e']);
const QUOTED_RUN = /"([^"]*)"|'([^']*)'/g;
const MAX_DEPTH = 3;
// A nested string is itself scanned for nested strings, so an argument holding hundreds
// of quoted runs would cost the cube of them. The guards run inside a hook timeout.
const MAX_NESTED = 64;

// The name a command runs under, however it was spelled: a path, an extension and the
// quotes a path with a space needs say nothing about which command it is.
function commandName(token) {
  const word = token.word.replace(/[\\/]+$/, '');
  return word.slice(word.search(/[^\\/:]*$/)).toLowerCase().replace(/\.(?:exe|cmd|bat|com)$/, '');
}

function decodeEncoded(word) {
  const decoded = Buffer.from(word, 'base64').toString('utf16le');
  return /[\0-\x08\x0e-\x1f]/.test(decoded) ? '' : decoded;
}

// The command strings an interpreter invocation carries inside its own arguments.
function nestedSources(argv) {
  const name = commandName(argv[0]);
  if (!INTERPRETERS.has(name)) return [];
  const sources = [];
  for (let k = 1; k < argv.length; k += 1) {
    const token = argv[k];
    if (!token.quoted && POWERSHELL.has(name) && ENCODED_FLAGS.has(token.word.toLowerCase())) {
      if (argv[k + 1]) { sources.push(decodeEncoded(argv[k + 1].word)); k += 1; }
      continue;
    }
    if (token.quoted) sources.push(token.word);
  }
  return sources.filter(Boolean);
}

// Every command the string runs, each as the tokens the shell would pass it. A
// transparent prefix and a `VAR=x` assignment are dropped, so the first token is the
// command that decides what runs; a redirection and its target belong to no command.
// The commands an interpreter argument carries come after the ones spelled out here.
function commands(command, depth = 0, budget = { left: MAX_NESTED }) {
  const tokens = lex(String(command));
  const calls = [];
  let argv = null;
  for (let k = 0; k < tokens.length; k += 1) {
    const token = tokens[k];
    if (token.op === 'sep') { argv = null; continue; }
    if (token.op === 'redir' || token.consumesWord) { k += 1; continue; }
    if (token.op === 'skip') continue;
    if (argv) { argv.push(token); continue; }
    if (!token.quoted && (/^\w+=/.test(token.word) || TRANSPARENT.has(token.word.toLowerCase()))) continue;
    argv = [token];
    calls.push(argv);
  }
  if (depth >= MAX_DEPTH) return calls;
  for (const call of [...calls]) {
    for (const source of nestedSources(call)) {
      const runs = [...source.matchAll(QUOTED_RUN)].map(([, doubled, singled]) => doubled ?? singled);
      for (const nested of [source, ...runs]) {
        if (budget.left <= 0) return calls;
        budget.left -= 1;
        calls.push(...commands(nested, depth + 1, budget));
      }
    }
  }
  return calls;
}

module.exports = { WORD_BREAK, SEPARATORS, TRANSPARENT, INTERPRETERS, commandName, lex, commands };
