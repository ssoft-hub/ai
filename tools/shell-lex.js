'use strict';

// A shell command read as argv rather than as text: a quoted argument is one opaque
// token, so prose naming a command gates nothing, and a command counts only where the
// shell would run it. A here-document's body is skipped only where both of its ends are
// provable, because text left lexed costs a guard that runs where it need not while text
// wrongly skipped hides everything after it. Interpreters (node -e, python -c) stay out
// of reach — this narrows what a guard misses, it cannot seal it.
const WORD_BREAK = new Set([' ', '\t', '\n', '\r', '"', "'", '|', ';', '&', '<', '>', '(', ')', '`']);
const SEPARATORS = new Set(['|', ';', '&', '(', ')', '`', '\n']);
const QUOTES = new Set(['"', "'"]);
// what a backslash takes the shell meaning away from; before anything else it is literal
const ESCAPABLE = new Set([...WORD_BREAK, '\\', '$', '#']);

// Prefixes that run their operands as a command, so the command behind them still sits
// in command position.
const TRANSPARENT = new Set(['sudo', 'doas', 'env', 'xargs', 'nohup', 'command', 'time']);

// The delimiter word of a here-document, after the quote removal the shell applies to it
// and the expansion it does not: `<<'EOF'`, `<<"EOF"`, `<<\EOF` and `<<E\OF` all end on a
// line reading EOF, while `<<$X` ends on one reading `$X`. A `$'…'` delimiter is reported
// as unreadable: the shell processes its escapes, so the text here is longer than the
// delimiter and would close the body on a later line than the shell does. Quoting the
// delimiter anywhere also turns off expansion inside the body, so a delimiter carrying no
// quote and no backslash is reported as `expands`: the shell then runs a substitution
// written in the body before whoever reads the body ever sees it.
function markerAt(command, start) {
  let i = start;
  while (command[i] === ' ' || command[i] === '\t') i += 1;
  let marker = '';
  let unreadable = false;
  let expands = true;
  while (i < command.length) {
    const c = command[i];
    if (c === '\\') {
      if (i + 1 === command.length) break;
      marker += command[i + 1];
      expands = false;
      i += 2;
      continue;
    }
    const quoted = c === '$' && QUOTES.has(command[i + 1]) ? i + 1 : QUOTES.has(c) ? i : -1;
    if (quoted !== -1) {
      expands = false;
      if (quoted !== i && command[quoted] === "'") unreadable = true;
      const close = command.indexOf(command[quoted], quoted + 1);
      const end = close === -1 ? command.length : close;
      marker += command.slice(quoted + 1, end);
      i = end + 1;
      continue;
    }
    if (WORD_BREAK.has(c)) break;
    marker += c;
    i += 1;
  }
  return { marker, end: i, unreadable, expands };
}

// The command substitutions written in a body, which an unquoted delimiter has the shell
// run before the body reaches whoever reads it. Only these spans are commands: the literal
// lines around them stay data, which is what keeps a document quoting a command quiet.
// The index just past the `)` closing a substitution opened at `start`, or -1 when nothing
// closes it. A `)` inside quotes or behind a `#` closes nothing, so counting raw parens
// ends the span early and drops whatever the shell still runs after it.
function spanEnd(text, start) {
  let depth = 1;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\\') { i += 1; continue; }
    if (c === "'" || c === '"') {
      const close = text.indexOf(c, i + 1);
      if (close === -1) return -1;
      i = close;
      continue;
    }
    if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      const line = text.indexOf('\n', i);
      if (line === -1) return -1;
      i = line;
      continue;
    }
    if (c === '(') depth += 1;
    else if (c === ')' && (depth -= 1) === 0) return i + 1;
  }
  return -1;
}

// A body is not source. Under an unquoted delimiter the shell substitutes over the whole
// of it, so only `\`, a backtick and `$(` mean anything here — `'`, `"` and `#` are text,
// and a scanner reading them as quoting or as a comment loses the substitution they wrap.
// `$((` needs no case of its own: `spanEnd` closes both the `$( ( … ) … )` reread and
// `$(( $(cmd) ))`, and skipping it would put back a miss on the second.
function substitutionsIn(text) {
  const found = [];
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\\' && '$`\\\n'.includes(text[i + 1])) { i += 1; continue; }
    if (c === '`') {
      const close = text.indexOf('`', i + 1);
      if (close === -1) return [text];
      found.push(text.slice(i + 1, close));
      i = close;
      continue;
    }
    if (c === '$' && text[i + 1] === '(') {
      const end = spanEnd(text, i + 2);
      // an unbalanced span is one this scan did not understand, so the whole body is read
      if (end === -1) return [text];
      found.push(text.slice(i + 2, end - 1));
      i = end - 1;
    }
  }
  return found;
}

// A marker nothing closes leaves the search where it started, so the next line searches
// the same remainder again and a command built of them costs the square of its length.
// The guards run inside a hook timeout, so the search is bounded; spending the budget
// stops bodies being skipped, which is the direction that leaves text lexed.
const MAX_BODY_LINES = 200000;

// The index just past a here-document body, or null when no line closes it. Null rather
// than the end of the input is what bounds a misread marker to a body: unclosed text
// stays lexed, so an unmodelled form costs a guard that runs where it need not.
// A CR before the line break ends the line, where the shell would keep it.
function bodyEnd(command, start, { marker, dash }, budget) {
  let i = start;
  while (i < command.length) {
    if (budget.left <= 0) return null;
    budget.left -= 1;
    const stop = command.indexOf('\n', i);
    let line = command.slice(i, stop === -1 ? command.length : stop).replace(/\r$/, '');
    const lineStart = i;
    i = stop === -1 ? command.length : stop + 1;
    // `<<-` indents its terminator with tabs, and only tabs
    if (dash) line = line.replace(/^\t+/, '');
    if (line === marker) return { after: i, body: command.slice(start, lineStart) };
  }
  return null;
}

// The index past every pending body that can be closed, stopping at the first that
// cannot: from there the text is lexed rather than assumed to be data. Each body is left
// on the token that registered it, because a body is data only to the command reading it —
// to an interpreter it is the program, and `commands()` reads it as one.
function skipBodies(command, start, pending, budget) {
  let i = start;
  for (const doc of pending) {
    const closed = bodyEnd(command, i, doc, budget);
    if (closed === null) break;
    doc.token.body = { text: closed.body, expands: doc.expands };
    i = closed.after;
  }
  pending.length = 0;
  return i;
}

// Tokens: {word, quoted} for arguments, {op} for the shell punctuation the scan keys on.
// 'sep' restarts command position; 'redir' is a stdout redirection whose next token is
// the written file; 'skip' is punctuation that only ends the position — with
// `consumesWord` when the following token belongs to it (an input redirection's source,
// a here-string's data, a descriptor redirection's target) rather than to the
// surrounding command.
// Adjacent pieces with no space between them are one shell word (`V="x y"`), so they
// merge into one token, quoted only when every piece was.
function lex(command) {
  const tokens = [];
  const pending = [];
  let i = 0;
  let wordEnd = -1;
  const nesting = [];
  const frame = () => nesting[nesting.length - 1];
  const inArith = () => ['arith', 'group'].includes(frame()?.kind);
  let commented = -1;
  let inBacktick = false;
  let framesBroken = false;
  // unclosed `${`, `$[` and `[` spans, inside which the shell reads no redirection
  let noRedir = 0;
  const countSpans = text => {
    for (let k = 0; k < text.length; k += 1) {
      if (text[k] === '[' || (text[k] === '{' && text[k - 1] === '$')) noRedir += 1;
      else if (text[k] === ']' || text[k] === '}') noRedir = Math.max(0, noRedir - 1);
    }
  };
  const budget = { left: MAX_BODY_LINES };
  const pushWord = (start, word, quoted, operand) => {
    const last = tokens[tokens.length - 1];
    if (start === wordEnd && last?.word !== undefined) {
      last.word += word;
      last.quoted = last.quoted && quoted;
    } else {
      tokens.push(operand ? { word, quoted, operand: true } : { word, quoted });
    }
  };
  // Every branch below advances `i` unconditionally. One that can decline to costs the
  // whole hook rather than itself: a lexer that stops advancing hangs, so it surfaces as a
  // test run that never ends instead of one that fails.
  while (i < command.length) {
    const c = command[i];
    if (c === ' ' || c === '\t' || c === '\r') { i += 1; continue; }
    // inside a comment a backslash is text: it continues no line and quotes nothing, and a
    // comment ends at its newline whatever precedes it
    if (c === '\\' && i < commented) {
      pushWord(i, '\\', false, inArith());
      i += 1;
      wordEnd = i;
      continue;
    }
    // The shell joins a continued line, so the newline behind the backslash ends nothing.
    // A join inside a word keeps the word open, so what follows is still glued to it.
    if (c === '\\' && (command[i + 1] === '\n' || (command[i + 1] === '\r' && command[i + 2] === '\n'))) {
      const joining = i === wordEnd;
      i += command[i + 1] === '\r' ? 3 : 2;
      if (joining) wordEnd = i;
      continue;
    }
    // An escaped metacharacter belongs to the word around it and must not reach the
    // separator branch, where it would close a substitution the shell still has open.
    // Before anything else the backslash stays literal, since a Windows shell reads
    // `C:\Tools\git.exe` as a path and the guards answer for that shell too.
    if (c === '\\') {
      // Escaping a metacharacter is a quoting act, so the character carries the quoted flag
      // and a word built of quoted runs joined by `'\''` stays one quoted argument. A
      // literal backslash does not, which is what leaves `\rm` and `\sudo` naming commands.
      const escapes = i + 1 < command.length && ESCAPABLE.has(command[i + 1]);
      pushWord(i, escapes ? command[i + 1] : '\\', escapes, inArith());
      i += escapes ? 2 : 1;
      wordEnd = i;
      continue;
    }
    // `$(( ))` and `(( ))` evaluate rather than run, and `<<`, `<`, `>` and `#` inside mean
    // shift, comparison and radix. What the span produced is discarded only once an adjacent
    // `))` closes it: any other ending is the shell rereading the text as nested subshells,
    // which run.
    if ((c === '$' && command.startsWith('((', i + 1)) || (c === '(' && command[i + 1] === '(')) {
      nesting.push({ kind: 'arith', mark: tokens.length, expansion: c === '$', glued: i === wordEnd });
      i += c === '$' ? 3 : 2;
      continue;
    }
    if (inArith() && c === '(') { nesting.push({ kind: 'group' }); i += 1; continue; }
    if (c === ')' && frame()?.kind === 'group') { nesting.pop(); i += 1; continue; }
    if (c === ')' && frame()?.kind === 'arith' && command[i + 1] === ')') {
      const arith = nesting.pop();
      // only the operands go: a `$( )` written inside the span runs before the span is
      // evaluated, so the commands it carries are not the arithmetic's to discard
      const ran = tokens.slice(arith.mark).filter(token => !token.operand);
      tokens.length = arith.mark;
      for (const token of ran) tokens.push(token);
      // an expansion is a word, so what glues onto it joins that word and not the one
      // before it; `(( ))` as a command produces none
      if (arith.expansion && !arith.glued) tokens.push({ word: '', quoted: false });
      i += 2;
      wordEnd = i;
      continue;
    }
    // a substitution inside arithmetic runs commands, so its operands are not arithmetic
    if (c === '$' && command[i + 1] === '(') {
      nesting.push({ kind: 'subst' });
      tokens.push({ op: 'sep', opens: true });
      i += 2;
      continue;
    }
    // a `case` pattern ends on a `)` that closes nothing, so the frame it sits in stays open
    if (c === ')' && frame()?.kind === 'case') {
      tokens.push({ op: 'sep' });
      i += 1;
      continue;
    }
    // inside arithmetic these are comparison and radix, and carry no operand of their own
    if (inArith() && (c === '<' || c === '>' || c === '#')) {
      while (command[i] === c) i += 1;
      continue;
    }
    // `#` opens a comment only where a word could start, so `x#y` and `"a"#b` are words.
    // The span is barred from opening a here-document rather than skipped: the dialect of
    // a command handed to the lexer is not provable, and a span stepped over is one no
    // guard reads. Lexed, it yields arguments of a word `#`, which no rule names.
    if (c === '#' && i !== wordEnd) {
      const stop = command.indexOf('\n', i);
      commented = stop === -1 ? command.length : stop;
    }
    if (SEPARATORS.has(c)) {
      // a single `|` joins stages of one pipeline, which share their standard input and so
      // share a here-document body; `||` is a list operator and joins nothing
      const sep = { op: 'sep' };
      if (c === '|' && command[i + 1] !== '|') sep.pipe = true;
      tokens.push(sep);
      // a separator that opens a frame begins a compound command rather than ending one,
      // so a reader downstream of it is still a stage of the same pipeline
      const depthBefore = nesting.length;
      while (SEPARATORS.has(command[i])) {
        const ch = command[i];
        if (ch === '(') nesting.push({ kind: 'subst' });
        // a `)` closing nothing means the frames no longer describe the command, and only
        // an empty stack lets a body start, so the miscount must bar one rather than free it
        else if (ch === ')') {
          const closing = nesting.pop();
          if (!closing) framesBroken = true;
          // the span was not arithmetic after all, so what it collected re-enters command
          // position: the shell reread `$((cmd) …)` as `$( (cmd) … )` and ran it
          else if (closing.kind === 'arith') tokens.splice(closing.mark, 0, { op: 'sep' });
        }
        else if (ch === '`') {
          // the same character opens and closes, and what it runs is not arithmetic
          inBacktick = !inBacktick;
          if (inBacktick) nesting.push({ kind: 'subst' }); else nesting.pop();
        }
        i += 1;
        // a here-document's body begins at the line after the one carrying its marker, so
        // the rest of that line is still the shell's to run, and a newline still inside a
        // substitution ends no line at all. The run ends here because `i` then sits past
        // the body, where a separator belongs to the next command.
        if (ch === '\n' && pending.length) {
          // the body begins on the line after the marker, whatever that line sits inside.
          // A newline this scan cannot start one at therefore ends the marker's claim: it
          // is dropped unread, leaving the text lexed rather than skipped somewhere later.
          if (nesting.length || inBacktick || framesBroken) pending.length = 0;
          else { i = skipBodies(command, i, pending, budget); break; }
        }
      }
      if (nesting.length > depthBefore) sep.opens = true;
      // and one that closes a frame ends a compound command, which the separator after it
      // is what ends the stage — the `)` itself joins nothing and separates nothing
      else if (nesting.length < depthBefore) sep.closes = true;
      continue;
    }
    if (c === '"' || c === "'") {
      // a quote opened inside a comment ends with the line: an apostrophe in English prose
      // would otherwise run to the end of the input and take every command after it
      const limit = i < commented ? commented : command.length;
      let j = i + 1;
      while (j < limit && command[j] !== c) {
        j += c === '"' && command[j] === '\\' ? 2 : 1;
      }
      const closed = j < limit && command[j] === c;
      pushWord(i, command.slice(i + 1, Math.min(j, limit)), true, inArith());
      i = closed ? j + 1 : Math.min(j, limit);
      wordEnd = i;
      continue;
    }
    if (c === '<') {
      // exactly two, since `<<<` is a here-string whose data is the one word after it, and
      // outside a comment or a `${ }`, `$[ ]` or subscript span, where the shell recognises
      // no redirection and a marker registered here would skip commands it does run
      if (command[i + 1] === '<' && command[i + 2] !== '<' && i >= commented && !noRedir) {
        const dash = command[i + 2] === '-';
        const { marker, end, unreadable, expands } = markerAt(command, i + (dash ? 3 : 2));
        const token = { op: 'skip', consumesWord: false };
        if (!unreadable) pending.push({ marker, dash, token, expands });
        i = end;
        tokens.push(token);
        continue;
      }
      while (command[i] === '<') i += 1;
      tokens.push({ op: 'skip', consumesWord: true });
      continue;
    }
    if (c === '>') {
      let j = i;
      while (command[j] === '>') j += 1;
      // inside a comment it redirects nothing, the same as `<<` one branch above: a path
      // named after a `#` is one no command writes
      if (i < commented) { i = j; continue; }
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
    // a word ends at a `$(` glued to it, or the substitution would be read as the word's
    // own text and the commands it runs would go with it
    while (j < command.length && !WORD_BREAK.has(command[j]) && command[j] !== '\\'
      && !(command[j] === '$' && command[j + 1] === '(')) j += 1;
    const word = command.slice(i, j);
    countSpans(word);
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
    const startsCommand = i !== wordEnd
      && (tokens.length === 0 || tokens[tokens.length - 1].op === 'sep');
    pushWord(i, word, false, inArith());
    i = j;
    wordEnd = i;
    if (!startsCommand) continue;
    const keyword = word.toLowerCase();
    if (keyword === 'case') nesting.push({ kind: 'case' });
    else if (keyword === 'esac' && frame()?.kind === 'case') nesting.pop();
  }
  return tokens;
}

// An interpreter runs a command written inside one of its own arguments, so an argv read
// at the outer level stops at the interpreter's name. Every quoted argument of one is
// read as a command string in its own right, and so is every quoted run inside that — the
// command a script hands to its own exec function sits one quoting level deeper again.
const INTERPRETERS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'ash', 'busybox',
  'pwsh', 'powershell', 'cmd', 'node', 'nodejs', 'deno', 'bun',
  'python', 'python3', 'py', 'perl', 'ruby', 'php',
  // `source` and `.` run their input in the current shell
  'source', '.']);
const POWERSHELL = new Set(['pwsh', 'powershell']);
// PowerShell also takes its command base64-encoded as UTF-16, which no lexer sees through.
const ENCODED_FLAGS = new Set(['-encodedcommand', '-enc', '-ec', '-e']);
const QUOTED_RUN = /"([^"]*)"|'([^']*)'/g;
const MAX_DEPTH = 3;
// A body nests deeper than an argument does in practice, so it gets its own ceiling.
const MAX_BODY_DEPTH = 8;
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

// Commands whose standard input is data and stays data. Which body is a program is decided
// against this list rather than against a list of interpreters, because an unrecognised
// name has to leave the body lexed: a name allow-list guarding the unsafe direction is
// blind to every name nobody wrote down, which is the defect a payload-keyed guard exists
// to avoid.
const DATA_SINKS = new Set(['cat', 'tee', 'grep', 'egrep', 'fgrep', 'head', 'tail', 'sort',
  'uniq', 'wc', 'tr', 'cut', 'rev', 'nl', 'fold', 'column', 'diff', 'patch', 'less', 'more',
  'base64', 'md5sum', 'sha1sum', 'sha256sum', 'xxd', 'hexdump', 'od', 'gzip', 'gunzip',
  // a database client is not one of these: its input is a script in its own language, and
  // each of those languages has a shell escape
  'git', 'jq', 'mail', 'mailx', 'sendmail', 'ssh-keygen']);

// A sink is a name, and a name can be redefined in the same string. The definition is
// right there to read, so a body handed to a redefined name is read as commands.
// bash spells a definition four ways and an alias a fifth. Matching one name too many
// drops a sink, which reads its body as commands — a prompt, so the widening errs safely.
const DEFINES = [
  /(?:^|[\n;&|(){}])\s*(?:function\s+)?([\w.-]+)\s*\(\s*\)/g,
  /(?:^|[\n;&|(){}])\s*function\s+([\w.-]+)\s*(?:\r?\n)?\s*\{/g,
  /(?:^|[\n;&|(){}])\s*alias\s+([\w.-]+)=/g,
];
function sinksFor(command) {
  const text = String(command);
  const redefined = DEFINES.flatMap(re => [...text.matchAll(re)].map(m => m[1].toLowerCase()));
  if (!redefined.some(name => DATA_SINKS.has(name))) return DATA_SINKS;
  return new Set([...DATA_SINKS].filter(name => !redefined.includes(name)));
}

// What a body holds, read as commands only where the shell would run it: the whole body
// for anything that may execute it, and the substitutions alone for a data sink, since an
// unquoted delimiter has the shell run those before the sink sees the text.
// A reader that may execute the body gets the whole of it, and its substitutions besides:
// the shell expands those before the reader parses the text, so reading the body as that
// reader's source would lose one an apostrophe or a `#` happens to sit in front of.
// The paths a string later runs: named in command position, handed to an interpreter, or
// sourced. A stage writing one of these wrote a script whatever its own name suggests.
function executedPaths(calls) {
  const run = new Set();
  const bare = word => word.replace(/^\.\//, '');
  for (const argv of calls) {
    run.add(bare(argv[0].word));
    const name = commandName(argv[0]);
    if (!INTERPRETERS.has(name)) continue;
    for (const token of argv.slice(1)) if (token.word) run.add(bare(token.word));
  }
  return run;
}

function bodySources(argv, sinks, executed = new Set()) {
  // `tee` names what it writes as operands rather than behind a redirection
  const written = [...(argv.writes ?? []),
    ...(commandName(argv[0]) === 'tee' ? argv.slice(1).map(t => t.word ?? '') : [])];
  const wrote = written.some(target => target && executed.has(target.replace(/^\.\//, '')));
  const sink = !wrote && sinks.has(commandName(argv[0]));
  return (argv.heredocs ?? []).flatMap(body => {
    const expanded = body.expands ? substitutionsIn(body.text) : [];
    return sink ? expanded : [body.text, ...expanded];
  });
}

// The command strings an invocation carries: its own arguments when it is an interpreter,
// and whatever of its here-document body is not merely data.
function nestedSources(argv, sinks = DATA_SINKS, executed = new Set()) {
  const name = commandName(argv[0]);
  const sources = bodySources(argv, sinks, executed);
  if (!INTERPRETERS.has(name)) return sources.filter(Boolean);
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
// One pass from tokens to calls, grouped into the pipelines that share a body. It is
// exported through the accounting below so an invariant can be asserted against this pass
// rather than against a second copy of it, which would agree with itself and prove nothing.
function callsFrom(tokens) {
  const calls = [];
  const groups = [];
  const unread = [];
  let argv = null;
  let bodies = null;
  let writes = null;
  let group = null;
  const openGroup = () => { group = { stages: [], pipes: 0, bodies: [] }; groups.push(group); };
  // a body registered where no argv is open still belongs to the pipeline: the reader may
  // be a compound command, whose head is punctuation and produces no argv at all
  const closeStage = () => {
    if (bodies) { group.bodies.push(...bodies); if (argv) argv.heredocs = bodies; }
    if (writes && argv) argv.writes = writes;
    argv = null;
    bodies = null;
    writes = null;
  };
  const closeGroup = () => {
    if (group.bodies.length) {
      for (const stage of group.stages) stage.heredocs = group.bodies;
      // A pipeline of k stages is joined by k-1 pipes. Anything less means a stage the
      // lexer could not name, and a body whose reader it cannot name is not one it may
      // silence — so that body is read as commands whatever the named stages are.
      if (group.stages.length !== group.pipes + 1) unread.push(...group.bodies);
    }
    openGroup();
  };
  openGroup();
  for (let k = 0; k < tokens.length; k += 1) {
    const token = tokens[k];
    if (token.op === 'sep') {
      closeStage();
      if (token.pipe) group.pipes += 1;
      // a separator opening or closing a compound command bounds a stage rather than the
      // pipeline holding it; the separator after it is what ends the stage
      else if (!token.opens && !token.closes) closeGroup();
      continue;
    }
    // a redirection takes the file after it, never the separator ending the command
    if (token.op === 'redir' || token.consumesWord) {
      const target = tokens[k + 1];
      if (target?.word !== undefined) {
        // the path a stage writes decides whether its body is data: a sink by name that
        // writes a file something else runs has produced a script, not a document
        if (token.op === 'redir') (writes ??= []).push(target.word);
        k += 1;
      }
      continue;
    }
    if (token.op === 'skip') {
      // the body belongs to the command reading it, whose word may not be lexed yet
      if (token.body !== undefined) (bodies ??= []).push(token.body);
      continue;
    }
    if (argv) { argv.push(token); continue; }
    // `\sudo` and `/usr/bin/sudo` run sudo, so the prefix test reads the name, not the word
    if (!token.quoted && (/^\w+=/.test(token.word) || TRANSPARENT.has(commandName(token)))) continue;
    argv = [token];
    calls.push(argv);
    group.stages.push(argv);
  }
  closeStage();
  closeGroup();
  return { calls, unread, groups: groups.filter(g => g.stages.length || g.bodies.length) };
}

// What became of every body the lexer skipped. `orphaned` is a body attached to no reader
// at all and `silenced` one whose every reader is a named data sink; both are bodies no
// guard will read, so an invariant over them catches a reader the lexer cannot name
// without anyone having to think of that reader first.
function bodyAccounting(command) {
  const tokens = lex(String(command));
  const skipped = tokens.filter(token => token.body !== undefined).map(token => token.body);
  const { calls, unread } = callsFrom(tokens);
  const readersOf = body => calls.filter(argv => (argv.heredocs ?? []).includes(body));
  const orphaned = skipped.filter(body => readersOf(body).length === 0 && !unread.includes(body));
  const silenced = skipped.filter(body => !unread.includes(body) && readersOf(body).length
    && readersOf(body).every(argv => DATA_SINKS.has(commandName(argv[0]))));
  return { skipped, orphaned, silenced };
}

// The pipelines a command was grouped into, for the invariant that a pipeline of k stages
// is joined by exactly k-1 pipes: a separator that opened a compound command must not have
// ended one.
function pipelineAccounting(command) {
  return callsFrom(lex(String(command))).groups;
}

// The here-document text a command reads as commands rather than as data, for a reader
// that lexes a payload itself instead of walking the calls `commands()` returns.
// Applied to its own output until nothing new appears: a body holding a body is ordinary,
// and a reader that walked one level would miss what the lexer descends into. Bounded by
// the body counter and deduplicated, so a body naming itself terminates.
function readableBodies(command, depth = 0, found = new Set()) {
  const { calls, unread } = callsFrom(lex(String(command)));
  const sinks = sinksFor(command);
  const executed = executedPaths(calls);
  const here = [...unread.map(body => body.text),
    ...calls.flatMap(argv => bodySources(argv, sinks, executed))];
  for (const body of here) {
    if (found.has(body)) continue;
    found.add(body);
    if (depth < MAX_BODY_DEPTH) readableBodies(body, depth + 1, found);
  }
  return [...found];
}

// Every command the string runs, each as the tokens the shell would pass it. A
// transparent prefix and a `VAR=x` assignment are dropped, so the first token is the
// command that decides what runs; a redirection and its target belong to no command.
// The commands an interpreter argument carries come after the ones spelled out here.
function commands(command, depth = 0, budget = { left: MAX_NESTED }, bodyDepth = 0) {
  const { calls, unread } = callsFrom(lex(String(command)));
  // A body is the same program text one indirection away rather than another quoting
  // level, so it descends on a counter of its own: sharing one would make nesting a
  // here-document compete with following an interpreter's argument. Exhausting it fails
  // closed — the text nobody read is reported so a guard can say so.
  if (depth >= MAX_DEPTH || bodyDepth >= MAX_BODY_DEPTH) {
    if (bodyDepth >= MAX_BODY_DEPTH) calls.unread = String(command);
    return calls;
  }
  // The fallback reads bodies whose reader could not be named, and a command can hold any
  // number of those. It spends a budget of its own so that filling it cannot leave the
  // interpreter arguments below unread, and running out ends this phase rather than the
  // function: a cap that aborts the rest is one that fails open.
  const bodyBudget = { left: MAX_NESTED };
  for (const body of unread) {
    if (bodyBudget.left <= 0) break;
    bodyBudget.left -= 1;
    calls.push(...commands(body.text, depth, bodyBudget, bodyDepth + 1));
  }
  const sinks = sinksFor(command);
  const executed = executedPaths(calls);
  for (const call of [...calls]) {
    for (const source of nestedSources(call, sinks, executed)) {
      const runs = [...source.matchAll(QUOTED_RUN)].map(([, doubled, singled]) => doubled ?? singled);
      // The quoted runs of one source are a guess at nested commands, worth making for an
      // argument and expensive for a body, which is larger by orders of magnitude. They get
      // a budget per source so one body cannot spend what every later call needs, and
      // running out skips the guess rather than the primary read it sits beside.
      const runBudget = { left: Math.min(budget.left, MAX_NESTED) };
      for (const [rank, nested] of [source, ...runs].entries()) {
        const fromBody = call.heredocs?.some(body => body.text === source);
        if (rank > 0 || (depth > 0 && !fromBody)) {
          if (runBudget.left <= 0 || budget.left <= 0) continue;
          runBudget.left -= 1;
          budget.left -= 1;
        }
        calls.push(...commands(nested, depth + (fromBody ? 0 : 1), budget,
          bodyDepth + (fromBody ? 1 : 0)));
      }
    }
  }
  return calls;
}

module.exports = { WORD_BREAK, SEPARATORS, TRANSPARENT, INTERPRETERS, DATA_SINKS,
  MAX_BODY_LINES, commandName, lex, commands, bodyAccounting, pipelineAccounting,
  readableBodies };
