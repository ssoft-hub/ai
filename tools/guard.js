'use strict';

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

    const said = verdict(data);
    if (said?.block) {
      process.stderr.write(String(said.block));
      process.exit(2);
    }
    if (said?.output) process.stdout.write(String(said.output));
    process.exit(0);
  });
}

module.exports = { runAsScript };
