'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');
const skillsDir = path.join(repoDir, 'skills');

// The one place the two wordings are held besides the skills themselves. A skill's own
// frontmatter names which of the two it carries, so no skill name appears in this file.
const TEMPLATES = {
  overrides: {
    heading: 'Project Overrides',
    paragraph: "Must follow the <topic> the repository's `AGENTS.md` file or a project" +
      ' skill defines, instead of the rule here.',
  },
  binding: {
    heading: 'Project Binding',
    paragraph: 'Must apply this skill in the `claude-config` repository alone: it states' +
      " that repository's own conventions, and no project with a different layout takes" +
      ' them as a fallback.',
  },
};

// Indented, because every other key the routing reads sits under `metadata:`.
const RELATION = /^[ \t]+project-relation:[ \t]*(\S+)[ \t]*$/m;

const MARKER_LINE = /^\*\*(?:Must|Should|Recommended|May)\*\*$/;
const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// `<topic>` stands for any non-empty phrase carrying no angle bracket, so the placeholder
// the template ships left unfilled is no topic; the rest is matched verbatim.
const OVERRIDES_PATTERN = new RegExp(
  '^' + TEMPLATES.overrides.paragraph.split('<topic>').map(escapeRegExp).join('[^<>]+?') + '$');

function matchesTemplate(relation, paragraph) {
  return relation === 'binding'
    ? paragraph === TEMPLATES.binding.paragraph
    : OVERRIDES_PATTERN.test(paragraph);
}

// The first paragraph of a section body, the marker line removed and line breaks
// collapsed to single spaces.
function firstParagraph(bodyLines) {
  const paragraphs = [];
  let current = [];
  for (const line of bodyLines) {
    if (line.trim() === '') {
      if (current.length) { paragraphs.push(current); current = []; }
    } else {
      current.push(line.trim());
    }
  }
  if (current.length) paragraphs.push(current);
  for (const paragraph of paragraphs) {
    if (paragraph.length === 1 && MARKER_LINE.test(paragraph[0])) continue;
    return paragraph.join(' ');
  }
  return '';
}

function frontmatter(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  if (!body.startsWith('---\n')) return '';
  const closing = body.indexOf('\n---', 4);
  return closing === -1 ? '' : body.slice(4, closing);
}

function declaredRelation(text) {
  return frontmatter(text).match(RELATION)?.[1] ?? 'overrides';
}

const HEADING = /^##\s+(.*)$/;
const FENCE = /^\s*(?:```|~~~)/;

// The `##` headings of the file in order, each with its body, a fenced `##` line counted
// as neither.
function sections(text) {
  const found = [];
  let current = null;
  let fenced = false;
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      if (current) current.body.push(line);
      continue;
    }
    const heading = !fenced && line.match(HEADING);
    if (heading) {
      current = { heading: heading[1].trim(), body: [] };
      found.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }
  return found;
}

// A presence fault ends the check, since neither position nor wording of a section that
// is missing, doubled or undeclared could name the real defect.
function relationFaults(text) {
  const relation = declaredRelation(text);
  const template = TEMPLATES[relation];
  if (!template) {
    return [`frontmatter declares project-relation: ${relation}, which names no template`];
  }
  const all = sections(text);
  const overrides = all.some(s => s.heading === TEMPLATES.overrides.heading);
  const binding = all.some(s => s.heading === TEMPLATES.binding.heading);
  if (!overrides && !binding) {
    return [`carries neither ## ${TEMPLATES.overrides.heading} nor ## ${TEMPLATES.binding.heading}`];
  }
  if (overrides && binding) {
    return [`carries both ## ${TEMPLATES.overrides.heading} and ## ${TEMPLATES.binding.heading}`];
  }
  const carried = overrides ? TEMPLATES.overrides.heading : TEMPLATES.binding.heading;
  if (carried !== template.heading) {
    return [`carries ## ${carried} where its frontmatter declares ${relation}`];
  }
  const faults = [];
  if (all[0].heading !== template.heading) {
    faults.push(`## ${template.heading} is not the first ## heading`);
  }
  const section = all.find(s => s.heading === template.heading);
  if (!matchesTemplate(relation, firstParagraph(section.body))) {
    faults.push(
      `the first paragraph under ## ${template.heading} does not match the ${relation} template`);
  }
  return faults;
}

// The frontmatter and body of a skill file, assembled so each fixture states only what
// its test is about.
function skillFile(metadataLines, body) {
  return '---\nname: fixture\nmetadata:\n  tier: narrow\n' + metadataLines +
    '---\n\n# Skill: Fixture\n\nApply when testing.\n\n' + body;
}

const OVERRIDES_SECTION = [
  '## Project Overrides',
  '',
  '**Must**',
  '',
  "Must follow the widget conventions the repository's `AGENTS.md` file or a project skill",
  'defines, instead of the rule here.',
].join('\n');

const BINDING_SECTION = [
  '## Project Binding',
  '',
  '**Must**',
  '',
  'Must apply this skill in the `claude-config` repository alone: it states that',
  "repository's own conventions, and no project with a different layout takes them as a",
  'fallback.',
].join('\n');

test('an absent project-relation key reads as overrides', () => {
  assert.strictEqual(declaredRelation(skillFile('', OVERRIDES_SECTION)), 'overrides');
});

test('a project-relation key indented under metadata declares its value', () => {
  assert.strictEqual(
    declaredRelation(skillFile('  project-relation: binding\n', BINDING_SECTION)),
    'binding');
});

test('a top-level project-relation key is not the declared form', () => {
  const text = '---\nproject-relation: binding\nmetadata:\n  tier: narrow\n---\n\n' +
    '# Skill: Fixture\n\n' + BINDING_SECTION;
  assert.strictEqual(declaredRelation(text), 'overrides');
});

test('names a skill carrying neither section', () => {
  const faults = relationFaults(skillFile('', '## Some Rule\n\n**Must**\n\nA rule.\n'));
  assert.deepStrictEqual(faults,
    ['carries neither ## Project Overrides nor ## Project Binding']);
});

test('names a skill carrying both sections', () => {
  const faults = relationFaults(
    skillFile('', OVERRIDES_SECTION + '\n\n' + BINDING_SECTION + '\n'));
  assert.deepStrictEqual(faults,
    ['carries both ## Project Overrides and ## Project Binding']);
});

test('names a skill carrying the section its frontmatter does not declare', () => {
  const faults = relationFaults(
    skillFile('  project-relation: binding\n', OVERRIDES_SECTION + '\n'));
  assert.deepStrictEqual(faults,
    ['carries ## Project Overrides where its frontmatter declares binding']);
});

test('names a skill declaring no relation that carries the binding section', () => {
  const faults = relationFaults(skillFile('', BINDING_SECTION + '\n'));
  assert.deepStrictEqual(faults,
    ['carries ## Project Binding where its frontmatter declares overrides']);
});

test('accepts an overrides section matching the template with a topic phrase', () => {
  assert.deepStrictEqual(relationFaults(skillFile('', OVERRIDES_SECTION + '\n')), []);
});

test('names an overrides paragraph that does not match the template', () => {
  const reworded = OVERRIDES_SECTION.replace('follow', 'apply');
  assert.deepStrictEqual(relationFaults(skillFile('', reworded + '\n')),
    ['the first paragraph under ## Project Overrides does not match the overrides template']);
});

test('names an overrides sentence whose topic phrase is empty', () => {
  const emptied = OVERRIDES_SECTION.replace('the widget conventions the', 'the the');
  assert.deepStrictEqual(relationFaults(skillFile('', emptied + '\n')),
    ['the first paragraph under ## Project Overrides does not match the overrides template']);
});

test('names a topic left as the placeholder the template ships', () => {
  const unfilled = OVERRIDES_SECTION.replace('widget conventions', '<topic>');
  assert.deepStrictEqual(relationFaults(skillFile('', unfilled + '\n')),
    ['the first paragraph under ## Project Overrides does not match the overrides template']);
});

test('collapses line breaks to single spaces before matching', () => {
  const rewrapped = [
    '## Project Overrides',
    '',
    '**Must**',
    '',
    'Must follow the widget',
    'conventions',
    "the repository's `AGENTS.md` file or a project skill defines, instead of the rule",
    'here.',
  ].join('\n');
  assert.deepStrictEqual(relationFaults(skillFile('', rewrapped + '\n')), []);
});

test('accepts a binding section carrying the fixed paragraph verbatim', () => {
  assert.deepStrictEqual(
    relationFaults(skillFile('  project-relation: binding\n', BINDING_SECTION + '\n')),
    []);
});

test('names a binding paragraph differing from the fixed one', () => {
  const reworded = BINDING_SECTION.replace('alone', 'only');
  assert.deepStrictEqual(
    relationFaults(skillFile('  project-relation: binding\n', reworded + '\n')),
    ['the first paragraph under ## Project Binding does not match the binding template']);
});

test('accepts a second paragraph after the canonical first', () => {
  const followed = OVERRIDES_SECTION +
    '\n\nThe catalog steps the file states are additional to these.\n';
  assert.deepStrictEqual(relationFaults(skillFile('', followed)), []);
});

test('names a section that is not the first ## heading of its file', () => {
  const displaced = '## Some Rule\n\n**Must**\n\nA rule.\n\n' + OVERRIDES_SECTION + '\n';
  assert.deepStrictEqual(relationFaults(skillFile('', displaced)),
    ['## Project Overrides is not the first ## heading']);
});

test('ignores a ## heading inside a fenced code block', () => {
  const fenced = '```markdown\n## Not A Section\n```\n\n' + OVERRIDES_SECTION + '\n';
  assert.deepStrictEqual(relationFaults(skillFile('', fenced)), []);
});

test('names a project-relation outside the two relations', () => {
  const faults = relationFaults(
    skillFile('  project-relation: optional\n', OVERRIDES_SECTION + '\n'));
  assert.deepStrictEqual(faults,
    ['frontmatter declares project-relation: optional, which names no template']);
});

function skillNames() {
  const names = fs.readdirSync(skillsDir)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
  // A vacuous pass would hide the skills going missing entirely.
  if (names.length === 0) throw new Error(`no skill files in ${skillsDir}`);
  return names;
}

test('every skill carries the one section its project-relation declares, worded to its template', () => {
  for (const name of skillNames()) {
    const text = fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
    assert.deepStrictEqual(relationFaults(text), [], `skills/${name}/SKILL.md`);
  }
});
