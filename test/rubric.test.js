'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');
const skillsDir = path.join(repoDir, 'skills');
const templateFile = path.join(repoDir, 'templates', 'SKILL.md');
const rulesFile = path.join(repoDir, 'config', 'claude-config-rules.md');

const MARKERS = ['**Must**', '**Should**', '**Recommended**', '**May**'];
const HEADING = /^##\s+(.*)$/;
const FENCE = /^\s*(?:```|~~~)/;
// A bold word alone on a line is a marker attempt; only the four above are markers.
const MARKER_SHAPED = /^\*\*[^*]+\*\*$/;

// At most one entry per `##` section, however many things are wrong with its marker.
function markerFaults(text) {
  const faults = [];
  let section = null;
  let fenced = false;
  const settle = () => {
    if (!section) return;
    if (section.markers.length === 0) {
      faults.push(section.stray
        ? `${section.heading}: marker outside the closed set (${section.stray})`
        : `${section.heading}: no marker line`);
    } else if (section.markers.length > 1) {
      faults.push(`${section.heading}: ${section.markers.length} marker lines`);
    } else if (!section.markerFirst) {
      faults.push(`${section.heading}: marker line is not the first line under the heading`);
    }
    section = null;
  };
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      if (section) section.body = true;
      continue;
    }
    if (fenced) continue;
    const heading = line.match(HEADING);
    if (heading) {
      settle();
      const title = heading[1].trim();
      if (MARKERS.some(marker => title.includes(marker))) {
        faults.push(`${title}: marker inside the heading line`);
      } else {
        section = { heading: title, markers: [], markerFirst: false, body: false, stray: null };
      }
    } else if (section && MARKERS.includes(line.trim())) {
      if (!section.body) section.markerFirst = true;
      section.markers.push(line.trim());
      section.body = true;
    } else if (section && line.trim()) {
      if (!section.body && MARKER_SHAPED.test(line.trim())) section.stray = line.trim();
      section.body = true;
    }
  }
  settle();
  // A fence left open swallows every heading below it, so the check must not stay silent.
  if (fenced) faults.push('unterminated code fence');
  return faults;
}

// The modal a statement is written with, drawn from the markers themselves so the two
// cannot drift apart. A section may use its own modal or a weaker one; a stronger one
// contradicts the marker above it.
const MODAL_WORDS = MARKERS.map(marker => marker.slice(2, -2));
const MODAL = new RegExp(`\\b(${MODAL_WORDS.join('|')})\\b`, 'gi');
const RANK_OF = new Map(MODAL_WORDS.map((word, rank) => [word.toLowerCase(), rank]));
const INLINE_CODE = /`[^`]*`/g;

// One entry per `##` section whose strongest modal outranks its own marker. Whether a
// line is a normative statement at all is judgement, so only the ceiling is checked.
function modalFaults(text) {
  const faults = [];
  let section = null;
  let fenced = false;
  const settle = () => {
    if (section && section.worstWord) {
      faults.push(`${section.heading}: modal "${section.worstWord}" exceeds ${section.marker}`);
    }
    section = null;
  };
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    if (FENCE.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const heading = line.match(HEADING);
    if (heading) {
      settle();
      section = { heading: heading[1].trim(), rank: null, marker: null, worst: null, worstWord: '' };
      continue;
    }
    if (!section) continue;
    const trimmed = line.trim();
    if (section.rank === null) {
      // Everything above the marker line belongs to no declared force yet.
      if (MARKERS.includes(trimmed)) {
        section.rank = MARKERS.indexOf(trimmed);
        section.marker = trimmed;
      }
      continue;
    }
    // A modal inside backticks is a quoted token, not the verb of a statement.
    for (const found of trimmed.replace(INLINE_CODE, ' ').matchAll(MODAL)) {
      const word = found[1].toLowerCase();
      const rank = RANK_OF.get(word);
      if (rank < section.rank && (section.worst === null || rank < section.worst)) {
        section.worst = rank;
        section.worstWord = word;
      }
    }
  }
  settle();
  return faults;
}

// Indented, because every other key the routing reads sits under `metadata:`.
const DECLARATION = /^[ \t]+rubric:[ \t]*applied[ \t]*$/m;

function frontmatter(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  if (!body.startsWith('---\n')) return '';
  const closing = body.indexOf('\n---', 4);
  return closing === -1 ? '' : body.slice(4, closing);
}

function skillsDeclaringRubric() {
  return fs.readdirSync(skillsDir)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')))
    .filter(name => DECLARATION.test(
      frontmatter(fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8'))));
}

// Extended by the pass that marks the next skill; every name here is checked below.
const MARKED_SKILLS = ['comments'];

test('markerFaults accepts each of the four force markers', () => {
  for (const marker of ['**Must**', '**Should**', '**Recommended**', '**May**']) {
    const faults = markerFaults('## Keep It Short' + '\n\n' + marker + '\n');
    assert.deepStrictEqual(faults, [], marker + ' is in the closed set');
  }
});

test('markerFaults names a section carrying no marker line', () => {
  const faults = markerFaults('## Keep It Short\n\nA comment is one line.\n');
  assert.deepStrictEqual(faults, ['Keep It Short: no marker line']);
});

test('markerFaults leaves a section whose marker sits alone under the heading', () => {
  const faults = markerFaults('## Keep It Short\n\n**Must**\n\nA comment is one line.\n');
  assert.deepStrictEqual(faults, []);
});

test('markerFaults names a marker outside the closed set', () => {
  const faults = markerFaults('## Keep It Short\n\n**Rule**\n\nA comment is one line.\n');
  assert.deepStrictEqual(faults, ['Keep It Short: marker outside the closed set (**Rule**)']);
});

test('markerFaults names a section carrying two marker lines', () => {
  const faults = markerFaults('## Keep It Short\n\n**Must**\n\n**Should**\n');
  assert.deepStrictEqual(faults, ['Keep It Short: 2 marker lines']);
});

test('markerFaults names a marker carried inside the heading line itself', () => {
  const faults = markerFaults('## Keep It Short **Must**\n\nA comment is one line.\n');
  assert.deepStrictEqual(faults, ['Keep It Short **Must**: marker inside the heading line']);
});

test('markerFaults names a marker line that is not the first line under the heading', () => {
  const faults = markerFaults('## Keep It Short\n\nA comment is one line.\n\n**Must**\n');
  assert.deepStrictEqual(faults, ['Keep It Short: marker line is not the first line under the heading']);
});

test('markerFaults ignores a ## line inside a fenced code block', () => {
  const faults = markerFaults('## Keep It Short\n\n**Must**\n\n```sh\n## not a section\n```\n');
  assert.deepStrictEqual(faults, []);
});

test('markerFaults ignores a marker shown inside a fenced code block', () => {
  const faults = markerFaults('## Keep It Short\n\n**Must**\n\n```markdown\n**Should**\n```\n');
  assert.deepStrictEqual(faults, []);
});

test('markerFaults names a fence that is never closed', () => {
  const faults = markerFaults('## A\n\n**Must**\n\n```sh\nnever closed\n\n## B\n\nno marker here at all\n');
  assert.deepStrictEqual(faults, ['unterminated code fence']);
});

test('DECLARATION reads the key only where it is indented under metadata', () => {
  assert.strictEqual(
    DECLARATION.test(frontmatter('---\nmetadata:\n  rubric: applied\n---\n')), true,
    'indented under metadata: is the declared form');
  assert.strictEqual(
    DECLARATION.test(frontmatter('---\nrubric: applied\nmetadata:\n  tier: narrow\n---\n')), false,
    'a top-level key is not the declared form');
});

test('modalFaults names a modal stronger than the section marker', () => {
  const faults = modalFaults('## Keep It Short\n\n**Should**\n\nA comment must be one line.\n');
  assert.deepStrictEqual(faults,
    ['Keep It Short: modal "must" exceeds **Should**']);
});

test('modalFaults accepts a section using exactly its own modal', () => {
  const faults = modalFaults('## Keep It Short\n\n**Should**\n\nA comment should be one line.\n');
  assert.deepStrictEqual(faults, []);
});

test('modalFaults accepts a section using a modal weaker than its marker', () => {
  const faults = modalFaults('## Keep It Short\n\n**Must**\n\nA comment may be omitted.\n');
  assert.deepStrictEqual(faults, []);
});

test('modalFaults reports the strongest modal when a section carries several', () => {
  const faults = modalFaults('## Keep It Short\n\n**May**\n\nIt should be short.\nIt must be one line.\n');
  assert.deepStrictEqual(faults, ['Keep It Short: modal "must" exceeds **May**']);
});

test('modalFaults ignores a modal inside inline code', () => {
  const faults = modalFaults('## Keep It Short\n\n**May**\n\nThe `must` field is optional.\n');
  assert.deepStrictEqual(faults, []);
});

test('modalFaults ignores a modal inside a fenced code block', () => {
  const faults = modalFaults('## Keep It Short\n\n**May**\n\n```sh\n# must run first\n```\n');
  assert.deepStrictEqual(faults, []);
});

test('the rubric rollout has reached exactly the skills listed here', () => {
  assert.deepStrictEqual(skillsDeclaringRubric(), MARKED_SKILLS);
});

test('every section of a skill declaring the rubric carries one marker line', () => {
  for (const name of skillsDeclaringRubric()) {
    const file = path.join(skillsDir, name, 'SKILL.md');
    assert.deepStrictEqual(markerFaults(fs.readFileSync(file, 'utf8')), [],
      `skills/${name}/SKILL.md declares rubric: applied`);
  }
});

test('no section of a marked skill speaks above its own marker', () => {
  for (const name of skillsDeclaringRubric()) {
    const file = path.join(skillsDir, name, 'SKILL.md');
    assert.deepStrictEqual(modalFaults(fs.readFileSync(file, 'utf8')), [],
      `skills/${name}/SKILL.md declares rubric: applied`);
  }
});

// A skill installs without this repository, so the legend has to travel with it. Presence
// only: pinning the wording would break on every reword of prose nobody parses.
test('the installed rules file names every marker a skill can carry', () => {
  const legend = fs.readFileSync(rulesFile, 'utf8');
  for (const marker of MARKERS) {
    assert.ok(legend.includes(marker),
      `config/claude-config-rules.md names no ${marker}, so a skill carrying it ships no meaning`);
  }
});

test('every section of the skill template carries one marker line', () => {
  assert.deepStrictEqual(markerFaults(fs.readFileSync(templateFile, 'utf8')), [],
    'templates/SKILL.md is the file every new skill is copied from');
});
