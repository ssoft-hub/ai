'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { commands, commandName, lex } = require('../tools/shell-lex');
const { gitCalls } = require('../tools/git-command');
const { writeTargets } = require('../tools/skill-gate');

// The lexer read against the shell it answers for, rather than against examples somebody
// thought of. Each shape runs under bash and through the lexer, and the two readings are
// compared. The criterion is asymmetric, because the two errors do not cost the same: bash
// running a command the lexer never sees is a guard gone blind and fails the test, while
// the lexer reading a command bash does not run costs a prompt and is reported instead.

function bashMissing() {
  const r = spawnSync('bash', ['--version'], { stdio: 'pipe', timeout: 5000 });
  return r.error?.code === 'ENOENT' ? 'bash is not on PATH' : false;
}
const skip = bashMissing();

// The flag is written to an absolute path, so a shape that changes directory cannot make
// a command that ran look like one that did not — agreement by accident reads as a pass.
// Double quotes so the shape stays wrappable in the single-quoted `bash -c` leg below;
// the substituted path carries no character double quotes leave special.
const FLAG = '@@FLAG@@';
const PAYLOAD = `touch "${FLAG}"`;

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'shell-lex-diff-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

// Detection is a file the payload creates, never a string in the output: bash quotes the
// offending source text inside its own diagnostics, so a search of stdout and stderr
// reports a command that never ran and only ever appeared in a warning.
function ranUnderBash(shape) {
  const dir = mkTmp();
  try {
    const flag = path.join(dir, 'pwned.flag').split(path.sep).join('/');
    fs.writeFileSync(path.join(dir, 'shape.sh'), `${shape.split(FLAG).join(flag)}\n`);
    spawnSync('bash', [path.join(dir, 'shape.sh')], { cwd: dir, encoding: 'utf8', timeout: 10000 });
    return fs.existsSync(path.join(dir, 'pwned.flag'));
  } finally { rmTmp(dir); }
}

const lexSees = shape => commands(shape).some(argv => commandName(argv[0]) === 'touch');

// The same comparison for the two readings built on top of the lexer, so a shape that
// hides a call from `gitCalls` or a path from `writeTargets` fails here too. Each payload
// leaves a trace of its own, since only the shell can say whether it ran.
const REACH = [
  {
    guard: 'gitCalls',
    payload: 'git init -q made-a-repo',
    ran: dir => fs.existsSync(path.join(dir, 'made-a-repo', '.git')),
    seen: shape => gitCalls(shape).some(call => call.sub === 'init'),
    nested: true,
  },
  {
    guard: 'writeTargets',
    payload: 'tee wrote.cpp </dev/null',
    ran: dir => fs.existsSync(path.join(dir, 'wrote.cpp')),
    seen: shape => writeTargets(shape).includes('wrote.cpp'),
    // `writeTargets` reads one level: it lexes the command it is handed and never follows
    // an interpreter into what that interpreter runs, on this branch or before it.
    nested: false,
  },
];

function ranLeaving(shape, left) {
  const dir = mkTmp();
  try {
    fs.writeFileSync(path.join(dir, 'shape.sh'), `${shape}\n`);
    spawnSync('bash', [path.join(dir, 'shape.sh')], { cwd: dir, encoding: 'utf8', timeout: 10000 });
    return left(dir);
  } finally { rmTmp(dir); }
}

// How many words the shell splits an argument list into, which is what a lexer branch that
// forgets to end a word gets wrong: a `#` swallowing the tail drops arguments.
function shellWordCount(args) {
  const dir = mkTmp();
  try {
    fs.writeFileSync(path.join(dir, 'split.sh'), `printf "<%s>" ${args}\n`);
    const r = spawnSync('bash', [path.join(dir, 'split.sh')], { cwd: dir, encoding: 'utf8', timeout: 10000 });
    return ((r.stdout ?? '').match(/</g) ?? []).length;
  } finally { rmTmp(dir); }
}

// Shapes carrying no here-document at all: the lexer reads comments, arithmetic, escapes
// and continuations whether or not a body is in play, so its corpus has to as well.
const NO_HEREDOC = [
  ['substitution inside arithmetic', `echo $(( $(${PAYLOAD}) + 1 ))`],
  ['backtick inside arithmetic', 'echo $(( `' + PAYLOAD + '` ))'],
  ['(( )) arithmetic command', `(( x = $(${PAYLOAD}) ))`],
  ['arithmetic inside an if', `if (( $(${PAYLOAD}) )); then :; fi`],
  ['arithmetic with nested grouping', `echo $(( ((1+2)) + $(${PAYLOAD}) ))`],
  ['shift then a command', `echo $((1 << 3)); ${PAYLOAD}`],
  ['comment then a command', `echo hi # note\n${PAYLOAD}`],
  ['comment glued to a word', `echo abc#x; ${PAYLOAD}`],
  ['comment after an arithmetic expansion', `echo $((1+1))#x; ${PAYLOAD}`],
  ['comment after an assignment', `v=$((1+1))#x; ${PAYLOAD}`],
  ['comment after a continuation', `echo abc\\\n#x; ${PAYLOAD}`],
  ['comment after a quoted word', `echo "a"#b; ${PAYLOAD}`],
  ['parameter expansion holding a hash', `echo "\${HOME#/x}"; ${PAYLOAD}`],
  ['escaped closing paren', `echo \\); ${PAYLOAD}`],
  ['escaped semicolon', `echo a\\;b; ${PAYLOAD}`],
  ['escaped backtick', 'echo a\\`b; ' + PAYLOAD],
  ['escaped command name', `\\${PAYLOAD}`],
  ['escaped transparent prefix', `\\sudo ${PAYLOAD}`],
  ['trailing backslash', 'echo a\\'],
  ['line continuation', `echo abc\\\ndef; ${PAYLOAD}`],
  ['continuation at line start', `echo abc\n\\${PAYLOAD}`],
  ['substitution spanning a newline', `x=$(:\n${PAYLOAD})`],
  ['backtick spanning a newline', 'x=`:\n' + PAYLOAD + '`'],
  ['payload after a directory change', `cd /tmp && ${PAYLOAD}`],
];

// What a comment holds, not merely where one starts. A token opened inside a comment that
// runs past the newline takes every command after it with it.
const COMMENT_CONTENTS = [
  ['comment holding an apostrophe', `echo hi # don't run it\n${PAYLOAD}`],
  ['comment holding a double quote', `echo hi # the "thing\n${PAYLOAD}`],
  ['comment ending in >', `echo hi # redirect with >\n${PAYLOAD}`],
  ['comment ending in <<', `echo hi # heredoc with <<\n${PAYLOAD}`],
  ['comment ending in 2>', `echo hi # stderr with 2>\n${PAYLOAD}`],
  ['comment ending in <', `echo hi # read with <\n${PAYLOAD}`],
  ['comment ending in a backslash', `echo hi # trailing \\\n${PAYLOAD}`],
  ['comment holding a paren', `echo hi # a smiley :)\n${PAYLOAD}`],
  ['comment holding an opening paren', `echo hi # see (note\n${PAYLOAD}`],
];

// Frame accounting: a `(` or `)` the shell does not read the way the lexer counts it.
const FRAMES = [
  ['nested subshells spelled ((', `((${PAYLOAD}); (echo two))`],
  ['subshell pair spaced apart', `((${PAYLOAD}) )`],
  ['adjacent )) is arithmetic', `((${PAYLOAD}))`],
  ['case pattern terminator', `cat <<EOF $(case a in a)\n${PAYLOAD};;\nesac)\nbody\nEOF`],
  ['case at top level with a pending marker', `cat <<EOF\nbody\nEOF\ncase a in a) ${PAYLOAD};; esac`],
  ['case pattern with a leading paren', `case a in (a) ${PAYLOAD};; esac`],
  ['unbalanced close paren', `echo a) ; ${PAYLOAD}`],
  ['subshell holding a here-document', `(cat <<EOF\nbody\nEOF\n); ${PAYLOAD}`],
];

const MARKER_QUOTE = [
  ['marker quote never closed', `cat <<'A\n${PAYLOAD}\nA'`],
  ['marker quote closed two lines down', `cat <<'A\n${PAYLOAD}\n' \nbody\nA`],
  ['marker double quote crossing lines', `cat <<"A\n${PAYLOAD}\n"\nbody\nA`],
  ['marker ansi-c quote crossing lines', `cat <<$'A\n${PAYLOAD}\n'\nbody\nA`],
  ['marker with an escaped quote', `cat <<\\'A\n${PAYLOAD}\n'A`],
];

// A body is data to the command reading it and a program to an interpreter, so the owner
// of the redirection decides whether what it holds runs.
const INTERPRETER_BODY = [
  ['bash reads the body', `bash <<EOF\n${PAYLOAD}\nEOF`],
  ['bash reads a quoted-marker body', `bash <<'EOF'\n${PAYLOAD}\nEOF`],
  ['sh reads the body', `sh <<EOF\n${PAYLOAD}\nEOF`],
  ['sh reads a tab-indented body', `sh <<-EOF\n\t${PAYLOAD}\n\tEOF`],
  ['bash reads an escaped-marker body', `bash <<\\EOF\n${PAYLOAD}\nEOF`],
  ['cat only writes the body', `cat <<EOF\n${PAYLOAD}\nEOF`],
  ['bash reads a body behind a redirection', `bash <<EOF >/dev/null\n${PAYLOAD}\nEOF`],
  ['bash reads the second of two bodies', `bash <<A <<B\nx\nA\n${PAYLOAD}\nB`],
];

const HERE_DOCUMENT = [
  ['body closed, command after', `cat <<EOF\nbody\nEOF\n${PAYLOAD}`],
  ['payload inside the body', `cat <<EOF\n${PAYLOAD}\nEOF`],
  ['body nothing closes', `cat <<EOF\nbody\n${PAYLOAD}`],
  ['tab-indented terminator', `cat <<-EOF\n\tbody\n\tEOF\n${PAYLOAD}`],
  ['two bodies in one command', `cat <<A <<B\nx\nA\ny\nB\n${PAYLOAD}`],
  ['redirection after the marker', `cat <<EOF > out.txt\nbody\nEOF\n${PAYLOAD}`],
  ['payload on the marker line', `cat <<EOF; ${PAYLOAD}\nbody\nEOF`],
  ['here-string carries no body', `cat <<<hello; ${PAYLOAD}`],
];

const GROUPS = [['no here-document', NO_HEREDOC], ['comment contents', COMMENT_CONTENTS],
  ['frame accounting', FRAMES], ['marker quote', MARKER_QUOTE], ['here-document', HERE_DOCUMENT],
  ['interpreter body', INTERPRETER_BODY]];

// a single-quoted wrapper reaches a shape holding single quotes by closing, escaping and
// reopening, which is what the `<<'EOF'` idiom needs to be covered rather than skipped
const singleQuoted = shape => `'${shape.split("'").join("'\\''")}'`;

function compare(t, shape) {
  const ran = ranUnderBash(shape);
  const seen = lexSees(shape);
  assert.ok(!(ran && !seen),
    `bash ran the payload and the lexer never saw it, so every guard is blind to it:\n${shape}`);
  if (seen && !ran) {
    t.diagnostic('read more strictly than bash, which costs a prompt and not a miss');
  }
}

for (const [group, shapes] of GROUPS) {
  for (const [name, shape] of shapes) {
    test(`bash runs no command the lexer misses - ${group}: ${name}`, { skip }, t => {
      compare(t, shape);
    });
    // The same shape one level down. An interpreter's own argument is lexed by the same
    // scan, and a frame or comment defect reaches it there too.
    test(`bash runs no command the lexer misses - ${group} under bash -c: ${name}`, { skip }, t => {
      compare(t, `bash -c ${singleQuoted(shape)}`);
    });
  }
}

// The readings built on the lexer, against the shell. A shape that hides a git call or a
// written path fails here even when the command word itself was never in question.
for (const { guard, payload, ran, seen, nested } of REACH) {
  for (const [name, wrap, needsNesting] of [
    ['plain', p => p, false],
    ['inside a substitution', p => `x=$(${p})`, false],
    ['inside arithmetic that is not arithmetic', p => `echo $((${p}) )`, false],
    ['after a case pattern', p => `case a in a) ${p};; esac`, false],
    ['after a comment holding an apostrophe', p => `echo hi # don't\n${p}`, false],
    ['in a body an interpreter reads', p => `bash <<EOF\n${p}\nEOF`, true],
    ['behind bash -c', p => `bash -c ${singleQuoted(p)}`, true],
  ]) {
    if (needsNesting && !nested) continue;
    test(`${guard} sees what bash runs - ${name}`, { skip }, () => {
      const shape = wrap(payload);
      assert.ok(!(ranLeaving(shape, ran) && !seen(shape)),
        `bash ran it and ${guard} did not see it:\n${shape}`);
    });
  }
}

// A word the shell keeps whole is one word here too. This is the invariant behind every
// branch that advances without ending a word, and it fails on shapes nobody thought to try.
const WORD_SPLITTING = [
  'a b c', '$((1+1))#x', 'abc#x', '"a"#b', 'a\\;b', '\\)', 'a\\ b',
  '"${HOME#/x}"', '$((1 << 3))', 'a\\\nb', 'x#y z', 'C:\\Tools\\git.exe', 'a$((1))b c',
];

for (const args of WORD_SPLITTING) {
  test(`word splitting matches the shell: ${args.replace(/\n/g, '\\n')}`, { skip }, () => {
    const lexed = lex(`echo ${args}`).filter(token => token.word !== undefined).length - 1;
    assert.strictEqual(lexed, shellWordCount(args));
  });
}
