'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  formatResetAt,
  resetAtMs,
  colorFor,
  paint,
  displacedCommand,
  displacedCached,
  displacedStale,
  resolveBranch,
  render,
  COLORS,
  DISPLACED_CACHE,
  DISPLACED_PAYLOAD,
} = require('../tools/statusline');

const plain = text => text.replace(/\x1b\[[0-9;]*m/g, '');

const toolPath = path.join(__dirname, '..', 'tools', 'statusline.js').replace(/\\/g, '/');
function runMain(stdin, configDir) {
  return spawnSync('node', ['-e', `require(${JSON.stringify(toolPath)}).main()`], {
    input: stdin,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-test-'));
}
function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
function withConfigDir(fn) {
  const dir = mkTmp();
  try { return fn(dir); } finally { rmTmp(dir); }
}
// Stands in for whatever statusline command install displaced - a plugin's own script in
// practice. The tool knows nothing about it beyond the string the manifest recorded.
const PRIOR_BADGE = 'node -e "process.stdout.write(\'[PRIOR]\')"';

function writePriorCommand(dir, command) {
  const manifest = { settings: { additions: { replaced: { statusLine: { had: true, prior: { type: 'command', command } } } } } };
  fs.writeFileSync(path.join(dir, '.claude-config-manifest.json'), JSON.stringify(manifest));
}
function writeCache(dir, text) {
  fs.writeFileSync(path.join(dir, DISPLACED_CACHE), text);
}

const RESET_5H = new Date(2026, 7, 7, 14, 12).getTime();
const RESET_7D = new Date(2026, 7, 10, 16, 0).getTime();
const payload = extra => ({
  model: { display_name: 'Opus 5 (1M context)' },
  context_window: { used_percentage: 34 },
  workspace: { current_dir: os.tmpdir() },
  ...extra,
});
const renderPlain = (input, dir) => plain(render(input, { configDir: dir }));

test('formatResetAt renders the reset moment in local time', () => {
  assert.strictEqual(formatResetAt(RESET_5H), '2026-08-07T14:12');
});

test('formatResetAt pads every field to its ISO width', () => {
  assert.strictEqual(formatResetAt(new Date(2026, 0, 5, 9, 7).getTime()), '2026-01-05T09:07');
});

test('formatResetAt renders nothing when the reset moment is unknown', () => {
  assert.strictEqual(formatResetAt(null), '');
  assert.strictEqual(formatResetAt(NaN), '');
});

test('resetAtMs reads a reset time given in epoch seconds', () => {
  assert.strictEqual(resetAtMs(1786000000), 1786000000000);
});

test('resetAtMs reads a reset time given as an ISO string', () => {
  assert.strictEqual(resetAtMs('2026-08-07T12:00:00.000Z'), Date.parse('2026-08-07T12:00:00.000Z'));
});

test('resetAtMs returns null for a missing or unparsable reset time', () => {
  assert.strictEqual(resetAtMs(undefined), null);
  assert.strictEqual(resetAtMs(null), null);
  assert.strictEqual(resetAtMs('soon'), null);
  assert.strictEqual(resetAtMs({}), null);
});

test('colorFor stays green below the first threshold', () => {
  assert.strictEqual(colorFor(0), COLORS.green);
  assert.strictEqual(colorFor(59), COLORS.green);
});

test('colorFor turns yellow from 60 through 84 per cent', () => {
  assert.strictEqual(colorFor(60), COLORS.yellow);
  assert.strictEqual(colorFor(84), COLORS.yellow);
});

test('colorFor turns red from 85 per cent up', () => {
  assert.strictEqual(colorFor(85), COLORS.red);
  assert.strictEqual(colorFor(100), COLORS.red);
});

test('paint wraps text in a 256-colour escape sequence', () => {
  assert.strictEqual(paint('x', 172), '[38;5;172mx[0m');
});

test('paint leaves text untouched without a colour', () => {
  assert.strictEqual(paint('x', null), 'x');
});

test('displacedCommand reads the command install recorded as replaced', () => {
  withConfigDir(dir => {
    writePriorCommand(dir, PRIOR_BADGE);
    assert.strictEqual(displacedCommand(dir), PRIOR_BADGE);
  });
});

test('displacedCommand returns nothing without a usable manifest record', () => {
  withConfigDir(dir => {
    assert.strictEqual(displacedCommand(dir), null);
    fs.writeFileSync(path.join(dir, '.claude-config-manifest.json'), 'not json');
    assert.strictEqual(displacedCommand(dir), null);
    fs.writeFileSync(path.join(dir, '.claude-config-manifest.json'), JSON.stringify({
      settings: { additions: { replaced: { statusLine: { had: false } } } },
    }));
    assert.strictEqual(displacedCommand(dir), null);
  });
});

test('displacedCached returns the text the refresh last wrote', () => {
  withConfigDir(dir => {
    fs.writeFileSync(path.join(dir, DISPLACED_CACHE), '[PRIOR]\n');
    assert.strictEqual(displacedCached(dir), '[PRIOR]');
  });
});

test('displacedCached returns nothing without a cache, and never blocks on one', () => {
  withConfigDir(dir => {
    assert.strictEqual(displacedCached(dir), '');
    fs.writeFileSync(path.join(dir, DISPLACED_CACHE), '');
    assert.strictEqual(displacedCached(dir), '');
  });
});

test('displacedStale is true without a cache and false right after one is written', () => {
  withConfigDir(dir => {
    assert.strictEqual(displacedStale(dir, Date.now()), true);
    fs.writeFileSync(path.join(dir, DISPLACED_CACHE), '[PRIOR]');
    assert.strictEqual(displacedStale(dir, Date.now()), false);
    assert.strictEqual(displacedStale(dir, Date.now() + 10_000), true);
  });
});

test('the refresh run stores the displaced command output for the next render', () => {
  withConfigDir(dir => {
    writePriorCommand(dir, PRIOR_BADGE);
    fs.writeFileSync(path.join(dir, DISPLACED_PAYLOAD), '{}');
    const r = spawnSync('node', [toolPath, '--refresh-displaced', dir], { encoding: 'utf8', stdio: 'pipe' });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(fs.readFileSync(path.join(dir, DISPLACED_CACHE), 'utf8'), '[PRIOR]');
  });
});

test('the refresh run leaves an empty cache when the displaced command fails', () => {
  withConfigDir(dir => {
    writePriorCommand(dir, 'node -e "process.exit(1)"');
    fs.writeFileSync(path.join(dir, DISPLACED_PAYLOAD), '{}');
    const r = spawnSync('node', [toolPath, '--refresh-displaced', dir], { encoding: 'utf8', stdio: 'pipe' });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(fs.readFileSync(path.join(dir, DISPLACED_CACHE), 'utf8'), '');
  });
});

test('the refresh run hands the payload to the displaced command', () => {
  withConfigDir(dir => {
    writePriorCommand(dir, 'node -e "process.stdout.write(JSON.parse(require(\'fs\').readFileSync(0,\'utf8\')).model.display_name)"');
    fs.writeFileSync(path.join(dir, DISPLACED_PAYLOAD), JSON.stringify({ model: { display_name: 'Echoed' } }));
    const r = spawnSync('node', [toolPath, '--refresh-displaced', dir], { encoding: 'utf8', stdio: 'pipe' });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(fs.readFileSync(path.join(dir, DISPLACED_CACHE), 'utf8'), 'Echoed');
  });
});

test('render places every badge in order after the cached displaced statusline', () => {
  withConfigDir(dir => {
    writeCache(dir, '[PRIOR]');
    const line = renderPlain(payload({
      effort: { level: 'high' },
      worktree: { branch: 'main' },
      rate_limits: {
        five_hour: { used_percentage: 42, resets_at: RESET_5H / 1000 },
        seven_day: { used_percentage: 61, resets_at: RESET_7D / 1000 },
      },
    }), dir);
    assert.strictEqual(
      line,
      '[PRIOR] [Opus 5 (1M context)] [effort high] [Context 34%]'
      + ' [5h 42% 2026-08-07T14:12] [7d 61% 2026-08-10T16:00] [main]',
    );
  });
});

test('render omits the effort badge when the payload carries no effort', () => {
  withConfigDir(dir => {
    assert.strictEqual(renderPlain(payload(), dir), '[Opus 5 (1M context)] [Context 34%]');
  });
});

test('render omits the context badge when the payload carries no context window', () => {
  withConfigDir(dir => {
    const line = renderPlain(payload({ context_window: undefined }), dir);
    assert.strictEqual(line, '[Opus 5 (1M context)]');
  });
});

test('render shows only the rate-limit windows the payload carries', () => {
  withConfigDir(dir => {
    const line = renderPlain(payload({
      rate_limits: { five_hour: { used_percentage: 90, resets_at: RESET_5H / 1000 } },
    }), dir);
    assert.strictEqual(line, '[Opus 5 (1M context)] [Context 34%] [5h 90% 2026-08-07T14:12]');
  });
});

test('render drops the reset time from a limit badge when it is unknown', () => {
  withConfigDir(dir => {
    const line = renderPlain(payload({
      rate_limits: { seven_day: { used_percentage: 61, resets_at: null } },
    }), dir);
    assert.strictEqual(line, '[Opus 5 (1M context)] [Context 34%] [7d 61%]');
  });
});

test('render colours a badge by its own percentage', () => {
  withConfigDir(dir => {
    const line = render(payload({
      context_window: { used_percentage: 92 },
      rate_limits: { five_hour: { used_percentage: 12, resets_at: null } },
    }), { configDir: dir });
    assert.ok(line.includes(paint('[Context 92%]', COLORS.red)), 'context badge is red');
    assert.ok(line.includes(paint('[5h 12%]', COLORS.green)), 'limit badge is green');
  });
});

test('render keeps the cached displaced statusline when the rest of the payload is unusable', () => {
  withConfigDir(dir => {
    writeCache(dir, '[PRIOR]');
    assert.strictEqual(renderPlain(null, dir), '[PRIOR]');
  });
});

test('main writes the rendered line for a payload on stdin', () => {
  withConfigDir(dir => {
    writeCache(dir, '[PRIOR]');
    const r = runMain(JSON.stringify({ model: { display_name: 'Opus 5' } }), dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(plain(r.stdout), '[PRIOR] [Opus 5]');
  });
});

test('main keeps the cached displaced statusline when stdin is not JSON', () => {
  withConfigDir(dir => {
    writeCache(dir, '[PRIOR]');
    const r = runMain('not json', dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(plain(r.stdout), '[PRIOR]');
  });
});

test('main leaves a refresh behind that fills the cache for the next render', async () => {
  const dir = mkTmp();
  try {
    writePriorCommand(dir, PRIOR_BADGE);
    const r = runMain(JSON.stringify({ model: { display_name: 'Opus 5' } }), dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(plain(r.stdout), '[Opus 5]', 'the first render does not wait for the command');
    const cache = path.join(dir, DISPLACED_CACHE);
    for (let waited = 0; waited < 10_000 && fs.readFileSync(cache, 'utf8') === ''; waited += 50)
      await new Promise(resolve => setTimeout(resolve, 50));
    assert.strictEqual(fs.readFileSync(cache, 'utf8'), '[PRIOR]');
  } finally { rmTmp(dir); }
});

test('main writes nothing for an empty stdin and no displaced command', () => {
  withConfigDir(dir => {
    const r = runMain('', dir);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
    assert.strictEqual(r.stderr, '');
  });
});

test('resolveBranch prefers the branch the worktree payload names', () => {
  const input = { worktree: { branch: 'ssoft/feat/x' }, workspace: { current_dir: os.tmpdir() } };
  assert.strictEqual(resolveBranch(input), 'ssoft/feat/x');
});

test('resolveBranch falls back to the workspace worktree branch', () => {
  const input = { workspace: { current_dir: os.tmpdir(), git_worktree: { branch: 'release' } } };
  assert.strictEqual(resolveBranch(input), 'release');
});

test('resolveBranch reads a symbolic HEAD from the nearest repository', () => {
  withConfigDir(dir => {
    fs.mkdirSync(path.join(dir, '.git'));
    fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/feature/nested\n');
    const nested = path.join(dir, 'src', 'deep');
    fs.mkdirSync(nested, { recursive: true });
    assert.strictEqual(resolveBranch({ workspace: { current_dir: nested } }), 'feature/nested');
  });
});

test('resolveBranch shortens a detached HEAD to its commit prefix', () => {
  withConfigDir(dir => {
    fs.mkdirSync(path.join(dir, '.git'));
    fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'b812ca0d1e2f3a4b5c6d7e8f90112233445566778\n');
    assert.strictEqual(resolveBranch({ workspace: { current_dir: dir } }), 'b812ca0');
  });
});

test('resolveBranch follows a gitdir pointer left by a linked worktree', () => {
  withConfigDir(dir => {
    const gitDir = path.join(dir, 'store', 'worktrees', 'wt');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/linked\n');
    const work = path.join(dir, 'wt');
    fs.mkdirSync(work);
    fs.writeFileSync(path.join(work, '.git'), `gitdir: ${gitDir}\n`);
    assert.strictEqual(resolveBranch({ workspace: { current_dir: work } }), 'linked');
  });
});

test('resolveBranch resolves a relative gitdir pointer against the pointer file', () => {
  withConfigDir(dir => {
    const gitDir = path.join(dir, '.git', 'modules', 'sub');
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/submodule-head\n');
    const work = path.join(dir, 'sub');
    fs.mkdirSync(work);
    fs.writeFileSync(path.join(work, '.git'), 'gitdir: ../.git/modules/sub\n');
    assert.strictEqual(resolveBranch({ workspace: { current_dir: work } }), 'submodule-head');
  });
});

test('resolveBranch drops control bytes a crafted HEAD carries', () => {
  withConfigDir(dir => {
    fs.mkdirSync(path.join(dir, '.git'));
    fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/\x1b[31mred\x07\n');
    assert.strictEqual(resolveBranch({ workspace: { current_dir: dir } }), '[31mred');
  });
});

test('resolveBranch caps a branch name long enough to flood the line', () => {
  withConfigDir(dir => {
    fs.mkdirSync(path.join(dir, '.git'));
    fs.writeFileSync(path.join(dir, '.git', 'HEAD'), `ref: refs/heads/${'x'.repeat(200)}\n`);
    assert.strictEqual(resolveBranch({ workspace: { current_dir: dir } }), 'x'.repeat(40));
  });
});

test('resolveBranch renders nothing outside a repository', () => {
  withConfigDir(dir => {
    assert.strictEqual(resolveBranch({ workspace: { current_dir: dir } }), '');
  });
});
