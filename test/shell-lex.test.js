'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { commands, MAX_BODY_LINES } = require('../tools/shell-lex');
const { writeTargets } = require('../tools/skill-gate');

// The command word of every call the string runs, which is what a guard keys on.
function names(command) {
  return commands(command).map(argv => argv[0].word);
}

test('reads a here-document body as data rather than as commands', () => {
  const command = ['cat <<EOF', 'rm -rf /', 'EOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});

test('ends the body of a single-quoted marker on that marker', () => {
  const command = ["cat <<'EOF'", 'rm -rf /', 'EOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});

test('ends the body of a double-quoted marker on that marker', () => {
  const command = ['cat <<"EOF"', 'rm -rf /', 'EOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});

test('ends the body of a backslash-escaped marker on that marker', () => {
  const command = ['cat <<\\EOF', 'rm -rf /', 'EOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});

test('ends the body of a marker escaped mid-word on that marker', () => {
  const command = ['cat <<E\\OF', 'rm -rf /', 'EOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});

// The shell processes the escapes in a `$'…'` delimiter, so the text read here is longer
// than the delimiter and would close the body later than the shell does.
test("lexes the body of a $'...' marker, whose escapes the shell processes", () => {
  const command = ["cat <<$'EOF'", 'rm -rf /', 'EOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'rm', 'EOF', 'echo']);
});

test('ends a <<- body on a terminator the shell reaches past leading tabs', () => {
  const command = ['cat <<-EOF', '\trm -rf /', '\tEOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});

test('gives each here-document of one command its own body', () => {
  const command = ['cat <<A <<B', 'rm -rf /', 'A', 'shutdown now', 'B', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});

test('lexes a command following the marker on the marker line, which the shell runs', () => {
  const command = ['cat <<EOF; rm -rf /', 'body', 'EOF'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'rm']);
});

test('reads << inside $(( )) as a shift rather than a marker', () => {
  const command = ['echo $((1 << 3))', 'rm -rf /', '3'].join('\n');
  assert.deepStrictEqual(names(command), ['echo', 'rm', '3']);
});

test('reads << inside a (( )) command as a shift rather than a marker', () => {
  const command = ['((x = 1 << 3))', 'rm -rf /', '3'].join('\n');
  assert.deepStrictEqual(names(command), ['rm', '3']);
});

test('leaves $( ) command substitution lexed as a command', () => {
  assert.deepStrictEqual(names('echo $(tee inner.cpp)'), ['echo', 'tee']);
});

test('lexes a substitution inside arithmetic, which the shell runs first', () => {
  assert.ok(names('echo $(( $(rm -rf /) + 1 ))').includes('rm'));
});

test('reads > inside arithmetic as a comparison rather than a redirection', () => {
  assert.deepStrictEqual(writeTargets('echo $((a > b))'), []);
});

test('keeps an arithmetic expansion a word apart from the command before it', () => {
  assert.deepStrictEqual(names('echo $((1+1))#x; rm -rf /'), ['echo', 'rm']);
});

test('keeps an escaped metacharacter inside the word it belongs to', () => {
  assert.deepStrictEqual(names('echo a\\)b; rm -rf /'), ['echo', 'rm']);
});

test('swallows a marker whose quote crosses lines, as the shell does', () => {
  const command = ["cat <<'A", 'rm -rf /', "A'"].join('\n');
  assert.deepStrictEqual(names(command), ['cat']);
});

// A comment is read to bar a here-document, never to skip text: the dialect of a command
// handed to the lexer is not provable, and `cmd` has no comment at all.
test('lexes the text a comment covers rather than skipping it', () => {
  const command = ['echo hi   # then; rm -rf /', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['echo', 'rm', 'echo']);
});

test('lexes the text a comment covers for an interpreter that has no comment', () => {
  assert.ok(names('cmd /c "echo Fixes #118 & del /s /q C:"').includes('del'));
});

// `'…'\''…'` is one quoted argument in three pieces, and an interpreter runs what it holds
test('keeps an argument quoted when an escape joins two quoted runs', () => {
  assert.ok(names("bash -c 'echo '\\''a'\\''; rm -rf /'").includes('rm'));
});

test('reads a here-document body an interpreter runs as the program it is', () => {
  assert.ok(names(['bash <<EOF', 'rm -rf /', 'EOF'].join('\n')).includes('rm'));
});

test('leaves a here-document body a writing command reads as data', () => {
  assert.deepStrictEqual(names(['cat <<EOF', 'rm -rf /', 'EOF'].join('\n')), ['cat']);
});

test('starts no body for a marker named inside a comment', () => {
  const command = ['echo hi   # write it with cat <<EOF', 'rm -rf /', 'EOF'].join('\n');
  assert.deepStrictEqual(names(command), ['echo', 'rm', 'EOF']);
});

test('keeps the body of a marker a comment follows on the same line', () => {
  const command = ['cat <<EOF   # note', 'rm -rf /', 'EOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});

test('starts the body after the line a continuation joins, not at the backslash', () => {
  const command = ['cat <<EOF \\', '; rm -rf /', 'body', 'EOF'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'rm']);
});

// Each unclosed marker rescans the remainder, so a command built of them costs the square
// of its length. The budget bounds that, and spending it stops bodies being skipped at all
// — the direction that leaves text visible to the guards.
test('stops skipping bodies once the terminator search is spent', () => {
  const openers = Math.ceil(Math.sqrt(2 * MAX_BODY_LINES)) + 50;
  const command = [...Array.from({ length: openers }, (_, k) => `cat <<M${k}`),
    'cat <<END', 'rm -rf /', 'END'].join('\n');
  assert.ok(names(command).includes('rm'));
});

test('reads <<< as a here-string, which carries no body of its own', () => {
  const command = ['grep x <<<"some text"', 'rm -rf /'].join('\n');
  assert.deepStrictEqual(names(command), ['grep', 'rm']);
});

test('lexes the remainder when no line closes the body', () => {
  const command = ['cat <<EOF', 'rm -rf /', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'rm', 'echo']);
});

test('lexes the remainder when a <<- terminator is indented with spaces', () => {
  const command = ['cat <<-EOF', '\trm -rf /', '    EOF', 'echo done'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'rm', 'EOF', 'echo']);
});

test('skips the bodies it can close and lexes from the one it cannot', () => {
  const command = ['cat <<A <<B', 'rm -rf /', 'A', 'shutdown now'].join('\n');
  assert.deepStrictEqual(names(command), ['cat', 'shutdown']);
});

test('ends a body on a terminator whose line ends in CRLF', () => {
  const command = ['cat <<EOF', 'rm -rf /', 'EOF', 'echo done'].join('\r\n');
  assert.deepStrictEqual(names(command), ['cat', 'echo']);
});
