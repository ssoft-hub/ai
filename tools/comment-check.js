'use strict';
const path = require('path');

const CPP_EXTS = new Set(['.h', '.hpp', '.cpp', '.cc', '.cxx']);

// A "plain" comment line the `comments` skill governs. Doxygen markers (///, //!,
// /**) are excluded — those belong to the separate `doxygen` skill. `//` must sit at
// line start or after whitespace so a URL literal like "https://x" doesn't match.
function isPlainCommentLine(line) {
  if (/\/\/\/|\/\/!|\/\*\*/.test(line)) return false;
  if (/(^|\s)\/\/(?!\/)/.test(line)) return true;
  return /\/\*(?!\*)/.test(line) || /\*\/\s*$/.test(line);
}

// Compares whole lines against the pre-edit set, not just the comment substring, so
// a comment attached to a changed code line is flagged too — cheaper than a real
// line-level diff, at the cost of an occasional re-flag of an unchanged comment.
function addedCommentLines(oldText, newText) {
  const oldLines = new Set((oldText ?? '').split('\n'));
  return (newText ?? '').split('\n').filter(line => isPlainCommentLine(line) && !oldLines.has(line));
}

// Edit -> one {old,new} pair; MultiEdit -> one pair per edits[]. Write has no prior
// content in the hook payload, so it's intentionally not covered here — flagging
// every comment in a full overwrite would be noise, not a useful nudge.
function extractEdits(toolInput) {
  if (!toolInput) return [];
  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map(e => ({ old: e?.old_string ?? '', new: e?.new_string ?? '' }));
  }
  if (toolInput.old_string !== undefined || toolInput.new_string !== undefined) {
    return [{ old: toolInput.old_string ?? '', new: toolInput.new_string ?? '' }];
  }
  return [];
}

function check(toolInput, filePath) {
  if (!filePath || !CPP_EXTS.has(path.extname(filePath).toLowerCase())) return { added: [] };
  const added = extractEdits(toolInput).flatMap(({ old, new: n }) => addedCommentLines(old, n));
  return { added };
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); }

    const filePath = data.tool_input?.file_path ?? '';
    const { added } = check(data.tool_input, filePath);
    if (added.length) {
      process.stdout.write(
        `comment-check reminder — ${added.length} new comment${added.length === 1 ? '' : 's'} in ${filePath}:\n` +
        added.map(l => `  ${l.trim()}`).join('\n') + '\n' +
        'Check each against the `comments` skill: default is no comment; keep only one ' +
        'that states a fact the code cannot say itself.\n'
      );
    }
    process.exit(0);
  });
}

module.exports = { isPlainCommentLine, addedCommentLines, extractEdits, check };
