'use strict';
const path = require('path');

// One entry per family of comment syntaxes. `doc` marks the doc-comment openers this
// check leaves alone (`cpp-doxygen` owns those); every opener, doc included, must sit
// at line start or after whitespace, so "https://x", "#ffffff", "counter--" and the
// `/*` or `/**` of a glob like "**/*.cpp" are not comments — an unanchored doc opener
// would also swallow the line and hide a real comment sitting next to it.
const C_FAMILY = {
  doc: /(^|\s)(\/\/\/|\/\/!|\/\*\*)/,
  line: /(^|\s)\/\/(?!\/)/,
  block: [/(^|\s)\/\*(?!\*)/, /\*\/\s*$/],
};
const HASH = { skip: /^#!/, line: /(^|\s)#/ };
const DASH = { line: /(^|\s)--/ };
const SEMICOLON = { line: /(^|\s);/ };
const PERCENT = { line: /(^|\s)%/ };
const MARKUP = { block: [/<!--/, /-->\s*$/] };

const BY_EXT = new Map([
  [C_FAMILY, ['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx', '.inl', '.ipp',
    '.m', '.mm', '.java', '.cs', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts',
    '.tsx', '.go', '.rs', '.swift', '.kt', '.kts', '.scala', '.php', '.qml', '.dart',
    '.groovy', '.gradle', '.glsl', '.vert', '.frag', '.proto', '.css', '.scss', '.less']],
  [HASH, ['.py', '.pyi', '.rb', '.pl', '.pm', '.sh', '.bash', '.zsh', '.fish', '.ps1',
    '.psm1', '.r', '.jl', '.ex', '.exs', '.nim', '.yml', '.yaml', '.toml', '.cfg',
    '.conf', '.tf', '.tfvars', '.cmake', '.mk']],
  [DASH, ['.sql', '.lua', '.hs', '.elm', '.ada', '.adb', '.ads', '.vhd', '.vhdl']],
  [SEMICOLON, ['.ini', '.lisp', '.cl', '.el', '.clj', '.cljs', '.cljc', '.scm', '.rkt',
    '.asm', '.s']],
  [PERCENT, ['.tex', '.sty', '.cls', '.erl', '.hrl']],
  [MARKUP, ['.html', '.htm', '.xhtml', '.xml', '.xsl', '.xslt', '.svg']],
].flatMap(([syntax, exts]) => exts.map(ext => [ext, syntax])));

// `path.extname('.env')` is '', so a name that looks like an extension is matched whole.
const BY_NAME = new Map([
  ['cmakelists.txt', HASH], ['makefile', HASH], ['dockerfile', HASH],
  ['gemfile', HASH], ['rakefile', HASH], ['.env', HASH], ['.gitignore', HASH],
  ['.gitattributes', HASH], ['.dockerignore', HASH], ['.editorconfig', HASH],
]);

function syntaxFor(filePath) {
  if (!filePath) return undefined;
  const name = path.basename(String(filePath)).toLowerCase();
  return BY_NAME.get(name) ?? BY_EXT.get(path.extname(name));
}

function isPlainCommentLine(line, syntax) {
  if (!syntax || syntax.skip?.test(line) || syntax.doc?.test(line)) return false;
  if (syntax.line?.test(line)) return true;
  return (syntax.block ?? []).some(re => re.test(line));
}

// Compares whole lines against the pre-edit set, not just the comment substring, so
// a comment attached to a changed code line is flagged too — cheaper than a real
// line-level diff, at the cost of an occasional re-flag of an unchanged comment.
function addedCommentLines(oldText, newText, syntax) {
  const oldLines = new Set((oldText ?? '').split('\n'));
  return (newText ?? '').split('\n')
    .filter(line => isPlainCommentLine(line, syntax) && !oldLines.has(line));
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
  const syntax = syntaxFor(filePath);
  if (!syntax) return { added: [] };
  const added = extractEdits(toolInput)
    .flatMap(({ old, new: n }) => addedCommentLines(old, n, syntax));
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

module.exports = { syntaxFor, isPlainCommentLine, addedCommentLines, extractEdits, check };
