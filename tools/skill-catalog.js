'use strict';
const fs = require('fs');
const path = require('path');

// Declaration order is the load order skills firing on one task are announced in.
const TIERS = ['process', 'domain', 'narrow'];
const DEFAULT_TIER = 'domain';

// Wildcards sharing one segment each split it independently, so a near miss costs
// exponentially in their number. Real patterns use one or two; past the cap nothing matches.
const WILDCARDS_PER_SEGMENT = 4;

function crowded(glob) {
  return glob.split('/').some(seg => (seg.match(/[*?]/g) ?? []).length > WILDCARDS_PER_SEGMENT);
}

function globToRegExp(glob) {
  if (crowded(glob)) return /(?!)/;
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // '**/' spans any number of directories, including none at all
        if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{' && glob.includes('}', i)) {
      // A brace holds literal alternatives only, so one skill can claim the dozens of
      // extensions of a language family on a single line
      const close = glob.indexOf('}', i);
      re += `(?:${glob.slice(i + 1, close).split(',')
        .map(alt => alt.trim()).filter(Boolean)
        .map(alt => alt.replace(/[.+^${}()|[\]\\*?]/g, '\\$&')).join('|')})`;
      i = close;
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  // Case-insensitive: the filesystems this runs on are, so `Makefile` and `makefile`
  // are one file and must reach the same skill
  return new RegExp(`^${re}$`, 'i');
}

// Indentation is spaces and tabs; `\s` matches the newline too, so at every line start it
// would rescan the block. Only the indentation narrows — what follows a colon is unchanged.
const INDENT = '[ \\t]*';

// Built on first use and kept: one regex per key per process, with no list of keys to fall off.
const SCALAR = new Map();
function scalarPattern(key) {
  if (!SCALAR.has(key)) SCALAR.set(key, new RegExp(`^${INDENT}${key}:\\s*(.+)$`, 'm'));
  return SCALAR.get(key);
}

const SEQUENCE = new Map();
function sequencePatterns(key) {
  if (!SEQUENCE.has(key)) {
    SEQUENCE.set(key, {
      inline: new RegExp(`^${INDENT}${key}:\\s*\\[(.*)\\]\\s*$`, 'm'),
      header: new RegExp(`^${INDENT}${key}:\\s*$`),
    });
  }
  return SEQUENCE.get(key);
}

const SEQUENCE_ITEM = /^[ \t]+-\s+(.*)$/;
const OPENING = /^---\r?$/;

function readSequence(block, key) {
  const { inline: inlineRe, header: headerRe } = sequencePatterns(key);
  const inline = block.match(inlineRe);
  if (inline) {
    // A glob may itself contain a comma, so only a comma outside quotes separates items
    return [...inline[1].matchAll(/(?:^|,)\s*(?:"([^"]*)"|'([^']*)'|([^,]*))/g)]
      .map(m => (m[1] ?? m[2] ?? m[3]).trim())
      .filter(Boolean);
  }
  const lines = block.split('\n');
  const start = lines.findIndex(l => headerRe.test(l));
  if (start === -1) return undefined;
  const items = [];
  for (const line of lines.slice(start + 1)) {
    const m = line.match(SEQUENCE_ITEM);
    if (!m) break;
    items.push(m[1].trim().replace(/^["']|["']$/g, ''));
  }
  return items;
}

function parseFrontmatter(source) {
  const text = String(source);
  const firstBreak = text.indexOf('\n');
  if (firstBreak === -1 || !OPENING.test(text.slice(0, firstBreak))) return {};
  const blockStart = firstBreak + 1;
  const closing = text.indexOf('\n---', blockStart);
  if (closing === -1) return {};
  // A skill file checked out on Windows carries CRLF; every pattern below anchors on \n
  const block = text
    .slice(blockStart, text[closing - 1] === '\r' ? closing - 1 : closing)
    .replace(/\r\n/g, '\n');
  const scalar = key => block.match(scalarPattern(key))?.[1].trim();
  const fm = {};
  const description = scalar('description');
  if (description !== undefined) fm.description = description;
  const tier = scalar('tier');
  if (tier !== undefined) fm.tier = tier;
  const reminder = scalar('reminder');
  if (reminder !== undefined) fm.reminder = reminder !== 'false';
  const paths = readSequence(block, 'paths');
  if (paths !== undefined) fm.paths = paths;
  const companions = readSequence(block, 'with');
  if (companions !== undefined) fm.with = companions;
  return fm;
}

function loadCatalog(skillsDir) {
  let names;
  try { names = fs.readdirSync(skillsDir); } catch { return []; }
  const catalog = [];
  for (const name of names.sort()) {
    const skillFile = path.join(skillsDir, name, 'SKILL.md');
    let text;
    try { text = fs.readFileSync(skillFile, 'utf8'); } catch { continue; }
    const fm = parseFrontmatter(text);
    if (fm.description === undefined) continue;
    catalog.push({
      name,
      description: fm.description,
      tier: TIERS.includes(fm.tier) ? fm.tier : DEFAULT_TIER,
      paths: fm.paths ?? [],
      companions: fm.with ?? [],
      // Design work precedes the file it produces, so paths alone never opt a skill out.
      reminder: fm.reminder ?? true,
    });
  }
  return catalog;
}

function matchSkills(catalog, filePath) {
  const normalised = String(filePath).replace(/\\/g, '/');
  const byName = new Map(catalog.map(skill => [skill.name, skill]));
  const selected = catalog.filter(skill =>
    skill.paths.some(pattern => globToRegExp(pattern).test(normalised)));
  const companions = selected
    .flatMap(skill => skill.companions)
    .map(name => byName.get(name))
    .filter(skill => skill && !selected.includes(skill));
  return [...selected, ...new Set(companions)]
    .map((skill, position) => ({ skill, position }))
    .sort((a, b) =>
      TIERS.indexOf(a.skill.tier) - TIERS.indexOf(b.skill.tier) || a.position - b.position)
    .map(entry => entry.skill.name);
}

module.exports = { TIERS, globToRegExp, parseFrontmatter, loadCatalog, matchSkills };
