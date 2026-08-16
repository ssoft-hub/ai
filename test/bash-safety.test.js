'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { check } = require('../tools/bash-safety');

const TOOL = path.join(__dirname, '..', 'tools', 'bash-safety.js');

test('blocks rm -rf /', () => {
  assert.strictEqual(check('rm -rf /').action, 'block');
});

test('blocks rm -fr /', () => {
  assert.strictEqual(check('rm -fr /').action, 'block');
});

test('blocks rm -Rf /', () => {
  assert.strictEqual(check('rm -Rf /').action, 'block');
});

test('blocks rm -rfv ~/', () => {
  assert.strictEqual(check('rm -rfv ~/').action, 'block');
});

test('blocks rm -rf $HOME/', () => {
  assert.strictEqual(check('rm -rf $HOME/').action, 'block');
});

test('blocks rm -rf /*', () => {
  assert.strictEqual(check('rm -rf /*').action, 'block');
});

test('blocks rm -rf ~/*', () => {
  assert.strictEqual(check('rm -rf ~/*').action, 'block');
});

test('blocks rm -rf $HOME/*', () => {
  assert.strictEqual(check('rm -rf $HOME/*').action, 'block');
});

test('warns without blocking on rm -rf /home/user/build', () => {
  assert.strictEqual(check('rm -rf /home/user/build').action, 'warn');
});

test('blocks rmdir /s /q C:\\', () => {
  assert.strictEqual(check('rmdir /s /q C:\\').action, 'block');
});

test('blocks format C:', () => {
  assert.strictEqual(check('format C:').action, 'block');
});

test('blocks sudo rm -rf /', () => {
  assert.strictEqual(check('sudo rm -rf /').action, 'block');
});

test('blocks rm -rf "$HOME" (quoted, no trailing slash)', () => {
  assert.strictEqual(check('rm -rf "$HOME"').action, 'block');
});

test('blocks rm -rf $HOME (no trailing slash, unquoted)', () => {
  assert.strictEqual(check('rm -rf $HOME').action, 'block');
});

test('warns on DEL /Q /S reversed order', () => {
  assert.strictEqual(check('DEL /Q /S foo').action, 'warn');
});

test('warns on DEL /S /Q uppercase', () => {
  assert.strictEqual(check('DEL /S /Q foo').action, 'warn');
});

test('warns on rm -r foo/', () => {
  assert.strictEqual(check('rm -r foo/').action, 'warn');
});

test('warns on rm -fr foo (recursive but not root)', () => {
  assert.strictEqual(check('rm -fr foo').action, 'warn');
});

test('asks before plain git push', () => {
  assert.strictEqual(check('git push origin main').action, 'ask');
});

test('asks before git push after a chain operator', () => {
  assert.strictEqual(check('cd /d/foo && git push origin main').action, 'ask');
});

test('asks before git push after a newline (cd || cd fallback then push)', () => {
  assert.strictEqual(check('cd /d/foo || cd "D:/foo"\ngit push origin main').action, 'ask');
});

test('asks before git push --force', () => {
  assert.strictEqual(check('git push --force origin main').action, 'ask');
});

test('asks before git push -f', () => {
  assert.strictEqual(check('git push -f origin main').action, 'ask');
});

test('asks before git -C <dir> push', () => {
  assert.strictEqual(check('git -C module/utility push origin br').action, 'ask');
});

test('asks before git -Cdir push (attached form)', () => {
  assert.strictEqual(check('git -Cmodule/utility push origin br').action, 'ask');
});

test('asks before git -c <name>=<value> push', () => {
  assert.strictEqual(check('git -c user.name=x push origin br').action, 'ask');
});

test('asks before git -c <name>="<quoted value>" push', () => {
  assert.strictEqual(check('git -c user.name="A B" push origin br').action, 'ask');
});

test('asks before git --git-dir=<path> push', () => {
  assert.strictEqual(check('git --git-dir=.git push origin br').action, 'ask');
});

test('asks before git --no-pager push (valueless global option)', () => {
  assert.strictEqual(check('git --no-pager push origin br').action, 'ask');
});

test('asks before git -C <dir> push after a chain operator', () => {
  assert.strictEqual(check('cd /d/foo && git -C module/utility push origin br').action, 'ask');
});

test('asks before git -cuser.name=x push (attached -c)', () => {
  assert.strictEqual(check('git -cuser.name=x push origin br').action, 'ask');
});

test('asks before git push invoked by an absolute path', () => {
  assert.strictEqual(check('/usr/bin/git push origin main').action, 'ask');
});

test('asks before sudo git push', () => {
  assert.strictEqual(check('sudo git push origin main').action, 'ask');
});

test('asks before git push behind an environment assignment', () => {
  assert.strictEqual(check('GIT_SSH_COMMAND=ssh git push origin main').action, 'ask');
});

test('asks before git push behind env', () => {
  assert.strictEqual(check('env GIT_SSH_COMMAND=ssh git push origin main').action, 'ask');
});

test('asks before git push inside a subshell', () => {
  assert.strictEqual(check('(git push origin main)').action, 'ask');
});

test('asks before git push inside a command substitution', () => {
  assert.strictEqual(check('out=$(git push origin main)').action, 'ask');
});

test('does not prompt on git -C <dir> status', () => {
  assert.strictEqual(check('git -C module/utility status').action, 'pass');
});

test('does not prompt on git -C <dir> commit naming push in the message', () => {
  assert.strictEqual(check('git -C module/utility commit -m "how to git push safely"').action, 'pass');
});

test('warns on git -C <dir> reset --hard', () => {
  assert.strictEqual(check('git -C module/utility reset --hard HEAD').action, 'warn');
});

test('does not warn on a command whose name ends in git', () => {
  assert.strictEqual(check('legit reset --hard').action, 'pass');
});

test('does not prompt on a git subcommand named inside a quoted argument', () => {
  assert.strictEqual(check('gh issue comment 84 -b "git -C dir push is now caught"').action, 'pass');
});

test('does not prompt on git push named inside a commit message', () => {
  assert.strictEqual(check('git commit -m "how to git push safely"').action, 'pass');
});

test('does not prompt on "(git push)" named inside a commit message', () => {
  assert.strictEqual(check('git commit -m "run (git push) in a subshell"').action, 'pass');
});

test('warns on git reset --hard', () => {
  assert.strictEqual(check('git reset --hard HEAD').action, 'warn');
});

test('warns on git clean -fd', () => {
  assert.strictEqual(check('git clean -fd').action, 'warn');
});

test('blocks rm -rf / behind an interpreter', () => {
  assert.strictEqual(check('bash -c "rm -rf /"').action, 'block');
});

test('blocks rm -rf / behind a transparent prefix', () => {
  assert.strictEqual(check('xargs rm -rf /').action, 'block');
});

test('does not block rm -rf / named inside a quoted argument', () => {
  assert.strictEqual(check('gh issue comment 84 -b "never run rm -rf / on a host"').action, 'pass');
});

test('does not warn on rm -r named inside a quoted argument', () => {
  assert.strictEqual(check('git commit -m "document rm -r behaviour"').action, 'pass');
});

test('does not block rm -rf / named inside a here-document body', () => {
  const command = ["cat > doc.md <<'EOF'", 'rm -rf / wipes the machine, so never type it.', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'pass');
});

test('blocks rm -rf / after a continuation joins a # onto the word before it', () => {
  assert.strictEqual(check('echo abc\\\n#x; rm -rf /').action, 'block');
});

test('warns on del /s /q behind a # that cmd does not read as a comment', () => {
  assert.strictEqual(check('cmd /c "echo Fixes #118 & del /s /q C:"').action, 'warn');
});

test('blocks rm -rf / behind an escaped ) that leaves a substitution open', () => {
  const command = ['cat <<EOF $(echo \\)', 'rm -rf /)', 'body', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / in a body a pipeline stage runs', () => {
  assert.strictEqual(check(['cat <<EOF | bash', 'rm -rf /', 'EOF'].join('\n')).action, 'block');
});

test('blocks rm -rf / in a body piped to sh -s', () => {
  assert.strictEqual(check(["cat <<'EOF' | sh -s", 'rm -rf /', 'EOF'].join('\n')).action, 'block');
});

test('blocks rm -rf / in a body piped through tee into bash', () => {
  const command = ["cat <<'EOF' | tee s.sh | bash", 'rm -rf /', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('leaves a body piped to a reader that runs nothing as data', () => {
  assert.strictEqual(check(["cat <<'EOF' | cat", 'rm -rf /', 'EOF'].join('\n')).action, 'pass');
});

test('blocks a substitution the shell expands inside an unquoted body', () => {
  assert.strictEqual(check(['cat <<EOF', '$(rm -rf /)', 'EOF'].join('\n')).action, 'block');
});

test('blocks a backtick run the shell expands inside an unquoted body', () => {
  assert.strictEqual(check(['cat <<EOF', '`rm -rf /`', 'EOF'].join('\n')).action, 'block');
});

test('leaves the same substitution quoted by the delimiter as data', () => {
  assert.strictEqual(check(["cat <<'EOF'", '$(rm -rf /)', 'EOF'].join('\n')).action, 'pass');
});

test('leaves the literal lines of an unquoted body as data', () => {
  const command = ['cat > doc.md <<EOF', 'rm -rf / wipes the machine', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'pass');
});

test('blocks rm -rf / in a body behind an option-taking prefix', () => {
  assert.strictEqual(check(["timeout 5 bash <<'EOF'", 'rm -rf /', 'EOF'].join('\n')).action, 'block');
});

test('blocks rm -rf / in a body behind env with an option', () => {
  assert.strictEqual(check(["env -u FOO bash <<'EOF'", 'rm -rf /', 'EOF'].join('\n')).action, 'block');
});

test('blocks rm -rf / in a body sourced from /dev/stdin', () => {
  assert.strictEqual(check([". /dev/stdin <<'EOF'", 'rm -rf /', 'EOF'].join('\n')).action, 'block');
});

test('blocks rm -rf / in a body behind an owner it does not recognise', () => {
  assert.strictEqual(check(["mystery <<'EOF'", 'rm -rf /', 'EOF'].join('\n')).action, 'block');
});

test('blocks rm -rf / in (( )) the shell rereads as nested subshells', () => {
  assert.strictEqual(check('((rm -rf /); (echo two))').action, 'block');
});

test('blocks rm -rf / in (( )) closed by a spaced-out pair', () => {
  assert.strictEqual(check('((rm -rf /) )').action, 'block');
});

test('blocks rm -rf / in nested subshells behind bash -c', () => {
  assert.strictEqual(check('bash -c "((rm -rf /); (echo two))"').action, 'block');
});

test('asks before git push in (( )) the shell rereads as nested subshells', () => {
  assert.strictEqual(check('((git push origin main); (:))').action, 'ask');
});

test('blocks rm -rf / after a case pattern terminator inside a substitution', () => {
  const command = ['cat <<EOF $(case a in a)', 'rm -rf /;;', 'esac)', 'body', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / after a case pattern terminator behind bash -c', () => {
  const command = 'bash -c "cat <<EOF $(case a in a)\nrm -rf /;;\nesac)\nbody\nEOF"';
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / on the line after a comment holding an apostrophe', () => {
  assert.strictEqual(check(["echo hi # don't run it", 'rm -rf /'].join('\n')).action, 'block');
});

test('blocks rm -rf / on the line after a comment ending in >', () => {
  assert.strictEqual(check(['echo hi # redirect with >', 'rm -rf /'].join('\n')).action, 'block');
});

test('blocks rm -rf / on the line after a comment ending in <<', () => {
  assert.strictEqual(check(['echo hi # heredoc with <<', 'rm -rf /'].join('\n')).action, 'block');
});

test('blocks rm -rf / on the line after a comment ending in 2>', () => {
  assert.strictEqual(check(['echo hi # stderr with 2>', 'rm -rf /'].join('\n')).action, 'block');
});

test('blocks rm -rf / on the line after a comment ending in a backslash', () => {
  assert.strictEqual(check(['echo hi # trailing \\', 'rm -rf /'].join('\n')).action, 'block');
});

test('blocks rm -rf / in a here-document body an interpreter runs', () => {
  assert.strictEqual(check(['bash <<EOF', 'rm -rf /', 'EOF'].join('\n')).action, 'block');
});

test('blocks rm -rf / in a quoted-marker body an interpreter runs', () => {
  assert.strictEqual(check(["bash <<'EOF'", 'rm -rf /', 'EOF'].join('\n')).action, 'block');
});

test('blocks rm -rf / in a body sh runs', () => {
  assert.strictEqual(check(['sh <<-EOF', '\trm -rf /', '\tEOF'].join('\n')).action, 'block');
});

test('leaves a body cat merely writes as data', () => {
  assert.strictEqual(check(['cat <<EOF', 'rm -rf /', 'EOF'].join('\n')).action, 'pass');
});

test('blocks rm -rf / after a marker whose newline fell inside a substitution', () => {
  const command = ['x=$(cat <<EOF', 'body', 'EOF', ')', 'rm -rf /', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / after a marker whose newline fell inside a subshell', () => {
  const command = ['(cat <<EOF', 'body', 'EOF', ')', 'rm -rf /', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / after a << inside a parameter expansion', () => {
  assert.strictEqual(check(['echo ${x:-<<EOF}', 'rm -rf /', 'EOF}'].join('\n')).action, 'block');
});

test('blocks rm -rf / after a << inside an array subscript', () => {
  assert.strictEqual(check(['a[1<<2]=v', 'rm -rf /', '2]=v'].join('\n')).action, 'block');
});

test('blocks rm -rf / after a << inside old-style $[ ] arithmetic', () => {
  assert.strictEqual(check(['echo $[1<<2]', 'rm -rf /', '2]'].join('\n')).action, 'block');
});

test("blocks rm -rf / after a $'...' marker the shell shortens by escape processing", () => {
  const command = ["cat <<$'E\\x4fF'", 'body', 'EOF', 'rm -rf /', "E\\x4fF"].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / in a substitution glued into arithmetic', () => {
  assert.strictEqual(check('echo $((1+$(rm -rf /)))').action, 'block');
});

test('blocks rm -rf / where $(( turns out not to be arithmetic', () => {
  assert.strictEqual(check('echo $((rm -rf /) )').action, 'block');
});

test('blocks rm -rf / behind an escaped transparent prefix', () => {
  assert.strictEqual(check('\\sudo rm -rf /').action, 'block');
});

test('blocks a substitution the arithmetic around it never runs', () => {
  assert.strictEqual(check('echo $(( $(rm -rf /) + 1 ))').action, 'block');
});

test('blocks a backtick run inside arithmetic', () => {
  assert.strictEqual(check('echo $(( `rm -rf /` ))').action, 'block');
});

test('blocks a substitution inside a (( )) arithmetic command', () => {
  assert.strictEqual(check('(( x = $(rm -rf /) ))').action, 'block');
});

test('blocks a substitution inside the arithmetic of an if', () => {
  assert.strictEqual(check('if (( $(rm -rf /) )); then echo y; fi').action, 'block');
});

test('asks before git push --force inside arithmetic', () => {
  assert.strictEqual(check('echo $(( $(git push --force origin main) ))').action, 'ask');
});

test('blocks a substitution inside arithmetic behind bash -c', () => {
  assert.strictEqual(check('bash -c "echo $(( $(rm -rf /) ))"').action, 'block');
});

test('blocks rm -rf / on the line after a backslash-escaped marker', () => {
  const command = ['cat <<\\EOF', 'body', 'EOF', 'rm -rf /'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('asks before git push --force on the line after a <<E\\OF marker', () => {
  const command = ['cat <<E\\OF', 'body', 'EOF', 'git push --force origin main'].join('\n');
  assert.strictEqual(check(command).action, 'ask');
});

test('blocks rm -rf / on the line after a comment that names a here-document', () => {
  const command = ['echo hi   # write it with cat <<EOF', 'rm -rf /'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / on the line after an arithmetic left shift', () => {
  const command = ['echo $((1 << 3))', 'rm -rf /'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / hidden behind an arithmetic left shift inside bash -c', () => {
  assert.strictEqual(check('bash -c "echo $((1 << 3))\nrm -rf /"').action, 'block');
});

test('blocks rm -rf / joined onto the marker line by a line continuation', () => {
  const command = ['cat <<EOF \\', '; rm -rf /', 'body', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / inside a substitution spanning the marker line', () => {
  const command = ['cat <<EOF $(:', 'rm -rf /)', 'body', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('blocks rm -rf / inside a backtick run spanning the marker line', () => {
  const command = ['cat <<EOF `:', 'rm -rf /`', 'body', 'EOF'].join('\n');
  assert.strictEqual(check(command).action, 'block');
});

test('asks before git push behind bash -c', () => {
  assert.strictEqual(check('bash -c "git push origin main"').action, 'ask');
});

test('asks before git push run through a git alias', () => {
  assert.strictEqual(check('git -c alias.p=push p origin main').action, 'ask');
});

test('warns on Remove-Item -Recurse -Force behind an interpreter', () => {
  assert.strictEqual(check('pwsh -Command "Remove-Item -Recurse -Force foo"').action, 'warn');
});

test('warns on DROP TABLE', () => {
  assert.strictEqual(check('DROP TABLE users').action, 'warn');
});

test('warns on Remove-Item -Recurse -Force', () => {
  assert.strictEqual(check('Remove-Item -Recurse -Force foo').action, 'warn');
});

test('passes safe rm', () => {
  assert.strictEqual(check('rm foo.txt').action, 'pass');
});

test('passes git status', () => {
  assert.strictEqual(check('git status').action, 'pass');
});

test('passes ls -la', () => {
  assert.strictEqual(check('ls -la').action, 'pass');
});

test('emits a PreToolUse ask decision for git push', () => {
  const r = spawnSync('node', [TOOL], {
    input: JSON.stringify({ tool_input: { command: 'git push origin main' } }),
    encoding: 'utf8',
  });
  assert.strictEqual(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'ask');
});
