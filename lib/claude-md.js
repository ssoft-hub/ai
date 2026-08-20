'use strict';

// `<config dir>/CLAUDE.md` is the user's own file. Install adds one import line to it and
// uninstall subtracts that line and nothing else, so both sides have to agree about what
// the line is and where it counts. They read it from here rather than declaring it twice.
const RULES_FILE = 'claude-config-rules.md';
const IMPORT_LINE = `@${RULES_FILE}`;

const FENCE = /^\s*(?:```|~~~)/;
// A run of backticks closes on the same length, so a ``double`` span is one span.
const CODE_SPAN = /(`+)[\s\S]*?\1/g;
// Not followed by a further path character, so `@claude-config-rules.md.bak` is another file.
const MENTION = new RegExp(`(?:^|\\s)@${RULES_FILE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`);

// Claude Code evaluates an import written in prose, not one inside a fence or a code span,
// so a documented example neither suppresses the real import nor is mistaken for one.
function outsideFences(text) {
  const lines = String(text).split('\n');
  const live = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) { fenced = !fenced; continue; }
    if (!fenced) live.push(i);
  }
  return { lines, live };
}

// Liberal on purpose: a line carrying the import among the user's own words is still an
// import, and handing them a second one would be the worse error.
function importsRules(text) {
  const { lines, live } = outsideFences(text);
  return live.some(i => MENTION.test(lines[i].replace(CODE_SPAN, ' ')));
}

// Conservative on purpose: only a line that is nothing but the import may be deleted, so
// uninstall never takes a word the user wrote away with it.
function removableLines(text) {
  const { lines, live } = outsideFences(text);
  return live.filter(i => lines[i].trim() === IMPORT_LINE);
}

// Returns the text to write and exactly what was inserted around the import, which is what
// uninstall cannot infer from the result: whether a blank separator was added, and whether
// the user's last line had to be terminated first.
function addImport(text) {
  const current = String(text);
  if (current.trim() === '') {
    return { text: `${IMPORT_LINE}\n`, added: { separator: false, terminator: false } };
  }
  const terminator = !current.endsWith('\n');
  return {
    text: `${current}${terminator ? '\n' : ''}\n${IMPORT_LINE}\n`,
    added: { separator: true, terminator },
  };
}

// Line-based rather than suffix-based: a suffix match would eat the newline terminating the
// user's last line once they tidied the blank line away. Returns null when there is nothing
// this function may safely remove, which the caller reports rather than guessing.
function removeImport(text, added = {}) {
  const current = String(text);
  const removable = removableLines(current);
  if (removable.length === 0) return null;
  const lines = current.split('\n');
  const drop = new Set(removable);

  // The blank line install inserted goes only where the import is still last in the file,
  // which is where install put it. Moved, the blank above it is the user's own formatting.
  if (added.separator) {
    const last = removable[removable.length - 1];
    const nothingBelow = lines.slice(last + 1).every(l => l.trim() === '');
    if (nothingBelow && last > 0 && lines[last - 1].trim() === '') drop.add(last - 1);
  }
  const out = lines.filter((_, i) => !drop.has(i)).join('\n');
  return added.terminator ? out.replace(/\n$/, '') : out;
}

module.exports = { RULES_FILE, IMPORT_LINE, importsRules, removableLines, addImport, removeImport };
