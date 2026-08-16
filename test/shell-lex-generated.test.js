'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { commands, commandName } = require('../tools/shell-lex');

// The lexer read against the shell over a generated space rather than a written list. Five
// rounds of hand-picked shapes each left a mechanism unexamined; a grammar covers the
// combinations nobody thought to write, and a new mechanism is added to it as a dimension
// rather than as another example.
//
// The criterion is the differential's: bash running a command the lexer never sees is a
// guard gone blind and fails, while the lexer reading a command bash does not run costs a
// prompt and is reported. Neither count is asserted — the space is meant to grow.

function bashMissing() {
  const r = spawnSync('bash', ['--version'], { stdio: 'pipe', timeout: 5000 });
  return r.error?.code === 'ENOENT' ? 'bash is not on PATH' : false;
}
const skip = bashMissing();

const FLAG = '@@FLAG@@';
const PAYLOAD = `touch "${FLAG}"`;

// Detection is a file at an absolute path: a shape that changes directory would otherwise
// make a command that ran look like one that did not, and bash quotes offending source
// text in its own diagnostics, so searching output reports commands that never ran.
//
// One process per shape, and one directory for the file. Batching shapes into a single
// script is not available here: the space holds unterminated here-documents by design, and
// one of those consumes the rest of the script at parse time — a subshell around each does
// not help, since the parser reaches it first. The batch would then report every later
// shape as one bash did not run, which is a detector that turns a miss into agreement.
const ran = new Map();

function runAll(list) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-lex-gen-'));
  const file = path.join(dir, 'shape.sh');
  try {
    for (const [index, shape] of list) {
      const flag = path.join(dir, `flag-${index}`);
      fs.writeFileSync(file, `${shape.split(FLAG).join(flag.split(path.sep).join('/'))}\n`);
      spawnSync('bash', [file], { cwd: dir, encoding: 'utf8', timeout: 10000 });
      ran.set(index, fs.existsSync(flag));
    }
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
}

const lexSees = shape => commands(shape).some(argv => commandName(argv[0]) === 'touch');

const shapes = new Map();
const add = (family, name, script) => {
  if (!shapes.has(script)) shapes.set(script, { family, name });
};

// ---------------------------------------------------------------- dimension: wrapper
// What the payload sits inside, in the glued and spaced spellings, since the shell reads
// `$((cmd) )` and `$(( cmd ))` differently and a lexer keying on two characters does not.
const WRAPPERS = [
  ['bare', b => b],
  ['subst', (b, glued) => (glued ? `x=$(${b})` : `x=$( ${b} )`)],
  ['backtick', (b, glued) => (glued ? 'x=`' + b + '`' : 'x=` ' + b + ' `')],
  ['arith', (b, glued) => (glued ? `echo $((${b}))` : `echo $(( ${b} ))`)],
  ['arithcmd', (b, glued) => (glued ? `((${b}))` : `(( ${b} ))`)],
  ['subshell', (b, glued) => (glued ? `(${b})` : `( ${b} )`)],
  ['brace', b => `{ ${b}; }`],
  ['case', b => `case a in a) ${b};; esac`],
  ['casepat', b => `case a in (a) ${b};; esac`],
];
// ------------------------------------------------------- dimension: payload position
// Command position is what most rules key on, so the payload is placed where it holds and
// where it has to be re-established.
const POSITIONS = [
  ['first', p => p],
  ['after-sep', p => `: ; ${p}`],
  ['nested-subst', p => `y=$(${p})`],
  ['nested-subshell', p => `( ${p} )`],
];
for (const [wname, wrap] of WRAPPERS) {
  for (const glued of [true, false]) {
    for (const [pname, place] of POSITIONS) {
      for (const prefix of ['', 'echo pre; ']) {
        add('A wrapper', `${wname}${glued ? '/glued' : '/spaced'} ${pname}${prefix ? ' +prefix' : ''}`,
          prefix + wrap(place(PAYLOAD), glued));
      }
    }
  }
}

// ----------------------------------------------------------------- dimension: marker
const MARKERS = [
  ['plain', 'EOF', 'EOF'],
  ['single', "'EOF'", 'EOF'],
  ['double', '"EOF"', 'EOF'],
  ['escaped', '\\EOF', 'EOF'],
  ['ansic', "$'EOF'", 'EOF'],
  ['ansic-escape', "$'E\\x4fF'", 'EOF'],
  ['dash', '-EOF', '\tEOF'],
];
// ------------------------------------------------------------------ dimension: owner
// A body is data to `cat` and a program to a shell, so the command word owning the
// redirection decides whether what the body holds runs at all.
const OWNERS = ['cat', 'bash', 'sh', 'node -e "$(cat)"'];
// --------------------------------------------------- dimension: terminator position
// The dimension a corpus is blind without. Written with the terminator before the payload,
// this whole space reports far fewer failures than it holds: the body then ends above the
// payload and nothing is skipped over it. Every shape here therefore exists in both
// orders, and a new mechanism must be added the same way.
const TERMINATORS = ['after', 'before', 'absent'];
for (const [mname, marker, term] of MARKERS) {
  for (const owner of OWNERS) {
    for (const tpos of TERMINATORS) {
      let lines;
      if (tpos === 'after') lines = ['body', term, PAYLOAD];
      else if (tpos === 'before') lines = [PAYLOAD, term, 'echo tail'];
      else lines = ['body', PAYLOAD];
      add('B heredoc', `${mname} owner=${owner.split(' ')[0]} term=${tpos}`,
        [`${owner} <<${marker}`, ...lines].join('\n'));
    }
  }
}
// the marker's own newline falling inside a frame, with and without a later line that a
// deferred body would close on having swallowed the payload above it
for (const [mname, marker, term] of MARKERS.slice(0, 5)) {
  for (const [wname, wrap] of [['subst', b => `x=$(${b}\n)`], ['subshell', b => `(${b}\n)`],
    ['backtick', b => 'x=`' + b + '\n`'], ['case', b => `case a in a) ${b}\n;; esac`],
    ['nested subst', b => `x=$( y=$(${b}\n) )`]]) {
    for (const trailing of ['', `\n${term.trim()}`]) {
      add('B wrapped', `${mname} in ${wname}${trailing ? ' +marker line' : ''}`,
        `${wrap([`cat <<${marker}`, 'body', term].join('\n'))}\n${PAYLOAD}${trailing}`);
    }
  }
}
// a delimiter the shell shortens by escape processing matches a line the written one does not
for (const spelling of ["$'E\\x4fF'", "$'EO\\106'", "$'E\\117F'"]) {
  add('F ansic', spelling,
    [`cat <<${spelling}`, 'body', 'EOF', PAYLOAD, spelling.slice(2, -1)].join('\n'));
}

// ------------------------------------------------- dimension: span without redirection
// Where the shell recognises no redirection, so a marker registered inside one would skip
// commands it does run. Each is paired with the line its phantom marker would close on.
const SPANS = ['${x:-<<EOF}', '${x#<<E}', '${x%<<E}', '${x/<<E/y}', '${x[1<<2]}',
  '$[1<<2]', 'a[1<<2]=v', '${#x}', '${x:-$((1<<2))}'];
for (const span of SPANS) {
  const after = /<<-?(.*)$/.exec(span)?.[1] ?? '';
  const phantoms = [after, after.replace(/[}\]].*$/, ''), `${after.replace(/[}\]].*$/, '')}}`];
  for (const phantom of new Set(phantoms)) {
    add('C expansion', `${span} closed by ${phantom}`, `echo ${span}\n${PAYLOAD}\n${phantom}`);
  }
  add('C expansion', `${span} unclosed`, `echo ${span}\n${PAYLOAD}`);
}

// ------------------------------------------------------ dimension: arithmetic spelling
for (const inner of [`$(${PAYLOAD})`, '`' + PAYLOAD + '`']) {
  for (const spacing of [['', ''], [' ', ' ']]) {
    add('D arith-glue', `1+${inner}`, `echo $((1+${spacing[0]}${inner}${spacing[1]}))`);
  }
}
for (const shape of [`echo $((${PAYLOAD}) )`, `$((${PAYLOAD}) )`, `echo $((${PAYLOAD}); (:))`,
  `x=$((${PAYLOAD}) )`, `echo $(( (${PAYLOAD}) ))`]) {
  add('D arith-reparse', shape.slice(0, 28), shape);
}

// ----------------------------------------------------------- dimension: body content
// What the body holds, not merely where the marker is written. An unquoted delimiter has
// the shell expand the body before any reader sees it, so a substitution written there
// runs whoever reads it — a dimension unreachable while every body is a literal.
const BODY_CONTENT = [
  ['literal', 'body'],
  ['payload literal', PAYLOAD],
  ['substitution', `$(${PAYLOAD})`],
  ['backtick', '`' + PAYLOAD + '`'],
  ['assign-default', `\${x:=$(${PAYLOAD})}`],
];
// --------------------------------------------------------------- dimension: consumer
// Who executes the body, which is not the command owning the redirection: a pipeline hands
// it to a later stage, and `cat <<EOF | bash` is the ordinary installer idiom.
const CONSUMERS = [
  ['none', ''],
  ['pipe bash', ' | bash'],
  ['pipe sh -s', ' | sh -s'],
  ['pipe tee then bash', ' | tee s.sh | bash'],
  ['pipe cat', ' | cat'],
];
// ------------------------------------------------------------ dimension: prefix form
// What stands between the start of the command and the interpreter. An allow-list of
// transparent words is blind to the option-taking and unrecognised forms.
const OWNER_FORMS = [
  ['cat', 'cat'],
  ['bash', 'bash'],
  ['timeout', 'timeout 5 bash'],
  ['exec', 'exec bash'],
  ['nice', 'nice -n 5 bash'],
  ['stdbuf', 'stdbuf -o0 bash'],
  ['env -u', 'env -u FOO bash'],
  ['env --', 'env -- bash'],
  ['dot stdin', '. /dev/stdin'],
  ['source stdin', 'source /dev/stdin'],
];
const DELIMITERS = [['unquoted', 'EOF'], ['single', "'EOF'"]];
for (const [bname, body] of BODY_CONTENT) {
  for (const [dname, marker] of DELIMITERS) {
    for (const [cname, sink] of CONSUMERS) {
      for (const [oname, owner] of [['cat', 'cat'], ['bash', 'bash'],
        ['timeout', 'timeout 5 bash'], ['env -u', 'env -u FOO bash'], ['dot stdin', '. /dev/stdin']]) {
        add('G body', `${bname} ${dname} owner=${oname} sink=${cname}`,
          `${owner} <<${marker}${sink}\n${body}\nEOF`);
      }
    }
  }
}
for (const [oname, owner] of OWNER_FORMS) {
  for (const [dname, marker] of DELIMITERS) {
    add('G prefix', `${oname} ${dname}`, `${owner} <<${marker}\n${PAYLOAD}\nEOF`);
  }
}

// -------------------------------------------------------- dimension: reserved word
// A reserved word that is not a separator absorbs the command after it as an argument.
const RESERVED = [
  ['then', p => `if true; then ${p}; fi`],
  ['do for', p => `for d in a; do ${p}; done`],
  ['do while', p => `i=0; while [ $i = 0 ]; do ${p}; i=1; done`],
  ['until', p => `i=0; until [ $i = 1 ]; do ${p}; i=1; done`],
  ['else', p => `if false; then :; else ${p}; fi`],
  ['elif', p => `if false; then :; elif true; then ${p}; fi`],
  ['bang', p => `! ${p}`],
  ['function body', p => `f() { ${p}; }\nf`],
  ['select', p => `echo 1 | { select x in a; do ${p}; break; done; }`],
  ['coproc', p => `coproc X { ${p}; }\nwait`],
];
for (const [name, wrap] of RESERVED) add('E reserved', name, wrap(PAYLOAD));

// The class is every reserved word that is not a separator: it absorbs the command after
// it as an argument, so `{ cmd; }` names `{` and `if true; then rm -rf ~; fi` names `then`.
// That last one sizes what is missing — a command inside the most ordinary conditional
// wrapper there is, not an adversarial spelling. One witness per opening word is pinned
// below, since naming a word without pinning it costs the ratchet: nothing would go red
// when it is fixed or when it regresses. All are identical before this work, so they cannot
// fail this run; each goes red once it starts being caught, which is the signal to drop it
// rather than narrow the space.
const KNOWN_MISSING = new Set([
  'A wrapper: brace/glued first',
  'A wrapper: brace/glued first +prefix',
  'E reserved: then',
  'E reserved: do for',
  'E reserved: do while',
  'E reserved: until',
  'E reserved: else',
  'E reserved: elif',
  'E reserved: bang',
  'E reserved: function body',
  'E reserved: select',
  'E reserved: coproc',
]);

const indexed = [...shapes.keys()].map((script, index) => [index, script]);
if (!skip) runAll(indexed);

for (const [index, script] of indexed) {
  const { family, name } = shapes.get(script);
  const id = `${family}: ${name}`;
  if (KNOWN_MISSING.has(id)) {
    test(`known missing, a reserved word is not a separator - ${id}`, { skip }, () => {
      assert.ok(ran.get(index) && !lexSees(script),
        `this shape is now read correctly — drop it from KNOWN_MISSING:\n${script}`);
    });
    continue;
  }
  test(`bash runs no command the lexer misses - ${id}`, { skip }, t => {
    const seen = lexSees(script);
    assert.ok(!(ran.get(index) && !seen),
      `bash ran the payload and the lexer never saw it, so every guard is blind to it:\n${script}`);
    if (seen && !ran.get(index)) {
      t.diagnostic('read more strictly than bash, which costs a prompt and not a miss');
    }
  });
}
