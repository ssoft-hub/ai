'use strict';
const path = require('path');

function scriptName() {
  return path.basename(process.argv[1] ?? 'guard');
}

// `String()` throws on a value with no primitive conversion; a decision holds either way.
function asText(value) {
  try { return String(value); } catch { return null; }
}

// The `.message` read is inside the try too: a hostile error object throws on it.
function asReason(err) {
  try { return String(err?.message ?? err).split('\n')[0]; } catch { return null; }
}

// A guard states its verdict once, and both paths that reach it read that one value: the
// dispatcher calls `verdict(payload)` in its own process, and this runner calls it behind
// the guard's `require.main === module`. Turning the verdict into output lives here alone,
// so the two paths cannot drift into different answers for the same payload.
//
// A block goes to stderr and exits 2 — the only channel exit 2 leaves open — and anything
// else goes to stdout, which the dispatcher reads as a decision or as text.
function runAsScript(verdict) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }

    // Each field read once, and the block acted on before `output` is read: a throw
    // reading `output` must not discard a block already stated.
    let said;
    let block;
    try {
      said = verdict(data);
      block = said?.block;
    } catch (err) {
      process.stderr.write(`${scriptName()} did not run — ${asReason(err) ?? 'it stated no reason'}\n`);
      process.exit(0);
    }

    if (block) {
      const stated = asText(block);
      process.stderr.write(
        stated?.trim() ? stated : `${scriptName()} blocked the call without stating why\n`);
      process.exit(2);
    }

    let output;
    try {
      output = said?.output;
    } catch (err) {
      process.stderr.write(`${scriptName()} did not run — ${asReason(err) ?? 'it stated no reason'}\n`);
      process.exit(0);
    }

    if (output) {
      const written = asText(output);
      if (written === null) process.stderr.write(`${scriptName()} stated output it could not write\n`);
      else process.stdout.write(written);
    }
    process.exit(0);
  });
}

module.exports = { runAsScript };
