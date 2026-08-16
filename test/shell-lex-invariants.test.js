'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { bodyAccounting, pipelineAccounting, readableBodies, commands, commandName } =
  require('../tools/shell-lex');

// Structural invariants, asserted over the whole shape space rather than over shapes
// somebody thought of. Each is O(1) per shape and needs no shell, and each goes red on a
// mechanism nobody enumerated — which is the difference between these and a corpus: a
// corpus grows by someone naming the next dimension, an invariant does not.
//
// The shapes below are the space, kept in one list so both invariants run over all of it.

const READERS = ['cat', 'bash', 'sh', 'tee', 'timeout 5 bash', 'env -u FOO bash',
  '. /dev/stdin', 'mystery', '(bash)', '$(echo bash)', '`echo bash`', '(cat)',
  '{ bash; }', 'if true; then bash; fi', 'while false; do bash; done'];
const SINKS = ['', ' | bash', ' | sh -s', ' | (cd /tmp && bash)', ' | (cat) | bash',
  ' | (tee s.sh) | sh', ' | cat', ' | tee out.txt | bash', ' | $(echo bash)',
  ' | `echo bash`', ' || bash', ' && bash'];
const MARKERS = ["EOF", "'EOF'", '"EOF"', '\\EOF', '-EOF'];

const SHAPES = [];
for (const reader of READERS) {
  for (const sink of SINKS) {
    SHAPES.push(`${reader} <<EOF${sink}\nbody\nEOF`);
  }
}
for (const marker of MARKERS) {
  for (const reader of READERS) {
    const term = marker === '-EOF' ? '\tEOF' : 'EOF';
    SHAPES.push(`${reader} <<${marker}\nbody\n${term}`);
  }
}
for (const shape of ['cat <<A <<B\nx\nA\ny\nB', 'cat <<EOF | bash | sh\nbody\nEOF',
  'x=$(cat <<EOF | bash\nbody\nEOF\n)', 'cat <<EOF > out.txt | bash\nbody\nEOF',
  '(cat <<EOF)\nbody\nEOF', 'cat <<EOF; bash <<EOF2\na\nEOF\nb\nEOF2']) {
  SHAPES.push(shape);
}

// A body the lexer removed from the token stream is a body no guard can read unless
// `commands()` gives it to one. A reader whose head is punctuation — a subshell, a
// substitution, a backtick span — produces no argv, so the body reaches nobody and is
// silenced by omission rather than by a decision anyone made.
test('every skipped body reaches a reader', () => {
  const orphans = SHAPES.filter(shape => bodyAccounting(shape).orphaned.length);
  assert.deepStrictEqual(orphans, [],
    `these skipped a body and gave it to no reader:\n${orphans.join('\n---\n')}`);
});

// Silencing is a decision the sink list is allowed to make, but only when every reader of
// the body was named. A pipeline holding a stage the lexer could not name has not decided
// anything about that stage, so a body silenced there is silenced by ignorance.
test('no body is silenced by a pipeline holding an unnamed reader', () => {
  const wrong = SHAPES.filter(shape => {
    const { silenced } = bodyAccounting(shape);
    if (!silenced.length) return false;
    return pipelineAccounting(shape).some(group => group.stages.length < group.pipes + 1);
  });
  assert.deepStrictEqual(wrong, [],
    `these silenced a body while a stage went unread:\n${wrong.join('\n---\n')}`);
});

// A pipeline of k stages is joined by exactly k-1 pipes. Fewer stages than that means a
// separator opening a compound command was read as one ending the pipeline, which severs
// it and strands every body registered upstream.
test('a pipeline holds one more stage than it holds pipes', () => {
  const severed = SHAPES.filter(shape =>
    pipelineAccounting(shape).some(group => group.stages.length !== group.pipes + 1));
  assert.deepStrictEqual(severed, [],
    `these grouped the wrong number of stages:\n${severed.join('\n---\n')}`);
});

// The three above instrument where a body is routed. This one instruments what is pulled
// out of it once silencing has been decided, which they cannot see.
//
// A here-document body is not shell source. With an unquoted delimiter the shell performs
// command substitution over the whole body, and `'`, `"` and `#` carry no meaning there —
// so wrapping a substitution in any of them must not change what is found inside it. A
// scanner that reads the body under source rules loses the substitution to the wrapper,
// and `# generated $(…)` is the ordinary shape of a generated config file.
const SUBSTITUTIONS = ['$(rm -rf /)', '`rm -rf /`', '$((rm -rf /) )', '${x:=$(rm -rf /)}'];
const WRAPPERS = [['quoted double', body => `"${body}"`], ['quoted single', body => `'${body}'`],
  ['behind a hash', body => `# ${body}`]];

// Spending a cap must never reduce the set of calls produced. A budget that runs out part
// way through decides by position rather than by content, so whatever the command wrote
// last goes unread — and filling the cap is something any long command does by accident.
// One filler is deliberately absent: an argument holding hundreds of quoted runs spends
// the nesting cap on the branch before this work too, so pinning it here would assert a
// property the lexer has never had rather than one this work must not lose.
const FILLERS = [
  ['balanced pipeline body', 'cat <<E | (cat)\nx\nE'],
  ['miscounted pipeline', 'cat <<E | (cat) | (cat)\nx\nE'],
  ['unread body', '(bash) <<E\nx\nE'],
  ['expanding body', 'cat <<E\n$(:)\nE'],
  ['interpreter body', 'bash <<E\n:\nE'],
  ['subshell body', '(cat <<E\nx\nE\n)'],
  ['two bodies', 'cat <<A <<B\nx\nA\ny\nB'],
  // the only filler here that charges the nesting cap: without one the invariant passes
  // whatever that cap does, which is how the exemption that answered it went untested
  ['quoted runs in a body', 'bash <<E\n: "a" "b"\nE'],
];

// Repetition never nests, so a cap reached by depth rather than by width is invisible to
// the fillers above. A body is program text one indirection away, and nesting it must not
// spend the budget that following an interpreter's argument needs.
function nestBodies(levels, innermost) {
  let text = innermost;
  for (let at = 0; at < levels; at += 1) text = `bash <<'X${at}'\n${text}\nX${at}`;
  return text;
}

test('a command written after enough filler is still read', () => {
  const trailing = "bash -c 'touch FLAG'";
  const lost = [];
  for (const [name, filler] of FILLERS) {
    for (const repeats of [1, 20, 60, 120, 200]) {
      const text = `${Array.from({ length: repeats }, () => filler).join('\n')}\n${trailing}`;
      const seen = commands(text).some(argv => commandName(argv[0]) === 'touch');
      if (!seen) lost.push(`${name} x${repeats}`);
    }
  }
  assert.deepStrictEqual(lost, [],
    `these spent a cap and stopped reading:\n${lost.join('\n')}`);
});

test('a command nested inside bodies is still read', () => {
  const lost = [];
  for (const levels of [1, 2, 3, 4, 6]) {
    const text = nestBodies(levels, "bash -c 'touch FLAG'");
    if (!commands(text).some(argv => commandName(argv[0]) === 'touch')) lost.push(`${levels} levels`);
  }
  assert.deepStrictEqual(lost, [], `these stopped descending:\n${lost.join('\n')}`);
});

// The five above are stated over the lexer's own answer. This one is the first to span the
// lexer and a guard reading it: `skill-gate` walks `readableBodies` once and lexes each
// result, so anything `commands()` descends into that one pass does not reach is a path the
// gate never sees. A body holding a body is the ordinary case, and the cost is a deny that
// silently becomes an allow.
function reachedFrom(command, seen = new Set(), depth = 0) {
  if (depth > 8) return seen;
  for (const body of readableBodies(command)) {
    if (seen.has(body)) continue;
    seen.add(body);
    reachedFrom(body, seen, depth + 1);
  }
  return seen;
}

test('one walk of the bodies reaches everything the lexer descends into', () => {
  const nested = [
    "bash <<'X'\nbash <<'Y'\necho hi > AGENTS.md\nY\nX",
    "bash <<'X'\ncat <<'Y' | bash\ntee a.cpp\nY\nX",
    "bash <<'X'\nbash -c 'bash <<\"Y\"\ntee b.cpp\nY'\nX",
  ];
  const short = nested.filter(shape => reachedFrom(shape).size > readableBodies(shape).length);
  assert.deepStrictEqual(short, [],
    `a single walk missed a nested body in these:\n${short.join('\n---\n')}`);
});

test('wrapping a substitution in a body does not hide it', () => {
  const hidden = [];
  for (const inner of SUBSTITUTIONS) {
    const bare = readableBodies(`cat <<EOF\n${inner}\nEOF`).join('\n');
    for (const [how, wrap] of WRAPPERS) {
      const wrapped = readableBodies(`cat <<EOF\n${wrap(inner)}\nEOF`).join('\n');
      if (!bare.includes('rm')) continue;
      if (!wrapped.includes('rm')) hidden.push(`${inner} ${how}`);
    }
  }
  assert.deepStrictEqual(hidden, [],
    `these lost a substitution to its wrapper:\n${hidden.join('\n')}`);
});
