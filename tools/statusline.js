'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MANIFEST = '.claude-config-manifest.json';

const ESC = '\x1b';
const COLORS = { dim: 245, green: 71, yellow: 179, red: 203 };
const YELLOW_AT = 60;
const RED_AT = 85;

function colorFor(pct) {
  if (pct >= RED_AT) return COLORS.red;
  if (pct >= YELLOW_AT) return COLORS.yellow;
  return COLORS.green;
}

function paint(text, color) {
  if (typeof color !== 'number') return text;
  return `${ESC}[38;5;${color}m${text}${ESC}[0m`;
}

const pad = value => String(value).padStart(2, '0');

// Local time, since the reset moment is read against the clock on the wall next to it.
function formatResetAt(atMs) {
  if (typeof atMs !== 'number' || !Number.isFinite(atMs)) return '';
  const at = new Date(atMs);
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  return `${date}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

// Claude Code passes `resets_at` as epoch seconds, while the rate-limit wire schema
// declares it a string — accept either rather than depending on which one arrives.
function resetAtMs(resetsAt) {
  if (typeof resetsAt === 'number' && Number.isFinite(resetsAt)) return resetsAt * 1000;
  if (typeof resetsAt === 'string') {
    const parsed = Date.parse(resetsAt);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

const TEXT_MAX_LENGTH = 40;

function sanitizeText(text, maxLength) {
  return text.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLength);
}

// Claude Code registers one statusLine command, so installing this one displaces whatever
// was there. Its output is kept by running it again — the command string comes from what
// install recorded, never from knowing which tool it belongs to.
const REFRESH_FLAG = '--refresh-displaced';
const DISPLACED_CACHE = '.statusline-displaced';
const DISPLACED_PAYLOAD = '.statusline-payload.json';
const DISPLACED_MAX_LENGTH = 200;
const DISPLACED_STALE_MS = 2000;
const DISPLACED_TIMEOUT_MS = 10_000;

function displacedCommand(configDir) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(configDir, MANIFEST), 'utf8'));
    const record = manifest.settings?.additions?.replaced?.statusLine;
    const command = record?.had ? record.prior?.command : null;
    return typeof command === 'string' && command ? command : null;
  } catch {
    return null;
  }
}

function displacedCached(configDir) {
  try {
    return fs.readFileSync(path.join(configDir, DISPLACED_CACHE), 'utf8').trimEnd();
  } catch {
    return '';
  }
}

function displacedStale(configDir, nowMs) {
  try {
    return nowMs - fs.statSync(path.join(configDir, DISPLACED_CACHE)).mtimeMs > DISPLACED_STALE_MS;
  } catch {
    return true;
  }
}

// The refresh outlives this process: the render must never wait on a command whose cost
// belongs to whoever registered it. Touching the cache first makes the next few renders
// see a fresh timestamp, so a slow command is not started again on every keystroke.
function startDisplacedRefresh(configDir, raw) {
  const command = displacedCommand(configDir);
  if (command === null) return;
  const cache = path.join(configDir, DISPLACED_CACHE);
  try {
    fs.writeFileSync(path.join(configDir, DISPLACED_PAYLOAD), raw);
    if (fs.existsSync(cache)) fs.utimesSync(cache, new Date(), new Date());
    else fs.writeFileSync(cache, '');
    const child = spawn(process.execPath, [__filename, REFRESH_FLAG, configDir], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  } catch {}
}

function refreshDisplaced(configDir) {
  const command = displacedCommand(configDir);
  if (command === null) return;
  let payload = '';
  try { payload = fs.readFileSync(path.join(configDir, DISPLACED_PAYLOAD), 'utf8'); } catch {}
  const run = spawnSync(command, {
    shell: true,
    input: payload,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: DISPLACED_TIMEOUT_MS,
    windowsHide: true,
  });
  const output = run.status === 0 && run.stdout ? run.stdout.trimEnd().slice(0, DISPLACED_MAX_LENGTH) : '';
  try { fs.writeFileSync(path.join(configDir, DISPLACED_CACHE), output); } catch {}
}

const SHORT_SHA_LENGTH = 7;

// HEAD is a plain file anyone can write, and its contents reach the terminal on every
// render: control bytes would inject escape sequences, and a long ref would flood the line.
const sanitizeBranch = name => sanitizeText(name, TEXT_MAX_LENGTH);

function headBranch(gitPath) {
  let dir = gitPath;
  try {
    if (fs.statSync(gitPath).isFile()) {
      const pointer = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(gitPath, 'utf8'));
      if (!pointer) return '';
      // A submodule's pointer is relative to the file holding it, not to the process.
      dir = path.resolve(path.dirname(gitPath), pointer[1].trim());
    }
    const head = fs.readFileSync(path.join(dir, 'HEAD'), 'utf8').trim();
    const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
    return sanitizeBranch(ref ? ref[1] : head.slice(0, SHORT_SHA_LENGTH));
  } catch {
    return '';
  }
}

// Reading HEAD instead of asking git: the statusline is re-rendered constantly and must
// not spawn a process per render.
function resolveBranch(input) {
  const named = input?.worktree?.branch || input?.workspace?.git_worktree?.branch;
  if (named) return sanitizeBranch(named);

  let dir = input?.workspace?.current_dir || input?.cwd;
  if (typeof dir !== 'string' || !dir) return '';
  for (let previous = null; dir !== previous; previous = dir, dir = path.dirname(dir)) {
    const gitPath = path.join(dir, '.git');
    if (fs.existsSync(gitPath)) return headBranch(gitPath);
  }
  return '';
}

function percentBadge(label, pct, reset = '') {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return '';
  const rounded = Math.round(pct);
  const body = reset ? `${label} ${rounded}% ${reset}` : `${label} ${rounded}%`;
  return paint(`[${body}]`, colorFor(rounded));
}

function limitBadge(label, limit) {
  return percentBadge(label, limit?.used_percentage, formatResetAt(resetAtMs(limit?.resets_at)));
}

function resolveConfigDir(configDir) {
  return configDir || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function render(input, opts = {}) {
  const configDir = resolveConfigDir(opts.configDir);
  const badges = [displacedCached(configDir)];
  const model = input?.model?.display_name;
  if (model) badges.push(paint(`[${model}]`, COLORS.dim));
  const effort = input?.effort?.level;
  if (effort) badges.push(paint(`[effort ${effort}]`, COLORS.dim));
  badges.push(percentBadge('Context', input?.context_window?.used_percentage));
  badges.push(limitBadge('5h', input?.rate_limits?.five_hour));
  badges.push(limitBadge('7d', input?.rate_limits?.seven_day));
  const branch = resolveBranch(input);
  if (branch) badges.push(paint(`[${branch}]`, COLORS.dim));

  return badges.filter(Boolean).join(' ');
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// A statusline command that throws would print a stack trace where the badges belong,
// so every failure degrades to whatever render() can still produce.
function main() {
  const raw = readStdin();
  let input = null;
  try { input = JSON.parse(raw); } catch {}
  let line = '';
  try { line = render(input); } catch {}
  if (line) process.stdout.write(line);
  const configDir = resolveConfigDir();
  if (displacedStale(configDir, Date.now())) startDisplacedRefresh(configDir, raw);
}

if (require.main === module && process.argv[2] === REFRESH_FLAG)
  refreshDisplaced(process.argv[3] || resolveConfigDir());

module.exports = {
  formatResetAt,
  main,
  render,
  displacedCommand,
  displacedCached,
  displacedStale,
  DISPLACED_CACHE,
  DISPLACED_PAYLOAD,
  resetAtMs,
  colorFor,
  paint,
  resolveBranch,
  COLORS,
};
