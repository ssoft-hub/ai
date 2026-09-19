'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, '..');
const skillsDir = path.join(repoDir, 'skills');

// A fenced block holds a template or a transcript rather than prose, so a citation
// inside one cites nothing and a heading inside one is that template's heading rather
// than a section of the skill carrying it.
function outsideFences(text, where = 'the text read') {
  const kept = [];
  let fenced = false;
  text.replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return; }
    if (!fenced) kept.push({ line, number: i + 1 });
  });
  assert.ok(!fenced,
    `${where}: a fence opens and never closes, which would hide the rest of the file`);
  return kept;
}

// A citation wraps across lines and its section name runs on into the sentence, so the
// prose is read as one run of text. The offset each line starts at is carried alongside,
// so a failure names the line a reader has to open.
function prose(file) {
  const starts = [];
  let text = '';
  const where = path.relative(repoDir, file).replace(/\\/g, '/');
  for (const { line, number } of outsideFences(fs.readFileSync(file, 'utf8'), where)) {
    starts.push({ offset: text.length, number });
    text += line.trim().replace(/\s+/g, ' ') + ' ';
  }
  const lineAt = offset => {
    let found = 0;
    for (const s of starts) { if (s.offset <= offset) found = s.number; else break; }
    return found;
  };
  return { text, lineAt };
}

const headingCache = new Map();
function sectionHeadings(name) {
  if (!headingCache.has(name)) {
    const file = path.join(skillsDir, name, 'SKILL.md');
    headingCache.set(name, fs.existsSync(file)
      ? outsideFences(fs.readFileSync(file, 'utf8'), `skills/${name}/SKILL.md`)
        .filter(entry => /^#{2,}\s/.test(entry.line))
        .map(entry => entry.line.replace(/^#+\s+/, '').trim())
      : null);
  }
  return headingCache.get(name);
}

// The citation resolves where a heading of the cited skill opens the span, at a word
// boundary: "Lifecycle defines each state" resolves to the section `Lifecycle`. Nothing
// delimits the end of a span, so what this holds is the leading heading and not the
// words after it: a span opening with a real heading resolves whatever follows.
function resolve(span, headings) {
  return headings.find(heading => span === heading ||
    (span.startsWith(heading) && /^[\s.,;:)'"\u2019]/.test(span.slice(heading.length))));
}

// A backticked lowercase name is a skill, a persona, a command or a context. Only the
// first carries sections; a name that is none of the four is a citation left behind by a
// rename (`skill-authoring` -> Renaming or Retiring).
function knownNonSkillNames() {
  const names = new Set();
  for (const dir of ['agents', 'commands']) {
    for (const file of fs.readdirSync(path.join(repoDir, dir))) {
      if (file.endsWith('.md')) names.add(file.replace(/\.md$/, ''));
    }
  }
  const vocabulary = JSON.parse(fs.readFileSync(path.join(repoDir, 'config', 'skill-contexts.json'), 'utf8'));
  for (const name of Object.keys(vocabulary.contexts)) names.add(name);
  return names;
}

// `<name>` -> Section Name, in either arrow form, with or without the word "skill"
// between the name and the arrow.
function citations(file) {
  const { text, lineAt } = prose(file);
  const found = [];
  for (const hit of text.matchAll(/`([a-z][a-z0-9-]*)`(?:\s+skill)?\s*(?:\u2192|->)\s*([^|`]+)/g)) {
    const span = hit[2].trim();
    if (span) found.push({ name: hit[1], span, line: lineAt(hit.index) });
  }
  return found;
}

// Every file that carries a rule or an index and may cite a skill's section: the skills
// themselves, the persona and command definitions composing them, and the two files
// indexing the catalog.
function citingFiles() {
  const files = fs.readdirSync(skillsDir)
    .map(name => [`skills/${name}/SKILL.md`, path.join(skillsDir, name, 'SKILL.md')])
    .filter(entry => fs.existsSync(entry[1]));
  if (files.length === 0) throw new Error(`no skill files found in ${skillsDir}`);
  for (const dir of ['agents', 'commands']) {
    for (const name of fs.readdirSync(path.join(repoDir, dir)).filter(n => n.endsWith('.md'))) {
      files.push([`${dir}/${name}`, path.join(repoDir, dir, name)]);
    }
  }
  files.push(['AGENTS.md', path.join(repoDir, 'AGENTS.md')]);
  files.push(['README.md', path.join(repoDir, 'README.md')]);
  return files;
}

test('the corpus carries citations to resolve', () => {
  const counted = citingFiles().map(([rel, full]) => [rel, citations(full).length]);
  const carrying = counted.filter(entry => entry[1] > 0).map(entry => entry[0]);
  assert.ok(carrying.length > 1,
    `citations were found in ${carrying.length} file(s) of ${counted.length}, so the pattern`
    + ' reaches almost nothing and the checks below run over next to no input');
  const index = counted.find(entry => entry[0] === 'AGENTS.md');
  assert.ok(index && index[1] > 1,
    `AGENTS.md yields ${index ? index[1] : 0} citation(s), where it cites a section of a skill`
    + ' in most of its rows');
});

test('every name a citation carries is a skill, a persona, a command or a context', () => {
  const known = knownNonSkillNames();
  const unknown = [];
  for (const [rel, full] of citingFiles()) {
    for (const c of citations(full)) {
      if (sectionHeadings(c.name) === null && !known.has(c.name)) {
        unknown.push(`${rel}:${c.line}  ${c.name} -> ${c.span.slice(0, 60)}`);
      }
    }
  }
  assert.deepStrictEqual(unknown, []);
});

test('every citation of a skill section resolves to a heading of that skill', () => {
  const unresolved = [];
  for (const [rel, full] of citingFiles()) {
    for (const c of citations(full)) {
      const headings = sectionHeadings(c.name);
      if (headings === null) continue;
      if (!resolve(c.span, headings)) {
        unresolved.push(`${rel}:${c.line}\n    ${c.name} -> ${c.span.slice(0, 80)}`);
      }
    }
  }
  assert.deepStrictEqual(unresolved, []);
});

test('a fenced block yields no heading', () => {
  const sample = [
    '## Outside', '```markdown', '## Inside a fence', '```', '## Outside again',
  ].join('\n');
  const kept = outsideFences(sample).filter(entry => /^#{2,}\s/.test(entry.line));
  assert.deepStrictEqual(kept.map(entry => entry.line), ['## Outside', '## Outside again']);

  // The corpus exercises what the sample states: a skill quoting a template drops the
  // template's headings, and a suite where no skill did would hold the rule over nothing.
  let dropped = 0;
  for (const name of fs.readdirSync(skillsDir)) {
    const file = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
    const all = lines.filter(line => /^#{2,}\s/.test(line)).length;
    dropped += all - sectionHeadings(name).length;
  }
  assert.ok(dropped > 0,
    'no skill of the catalog carries a heading inside a fence, so the corpus holds nothing here');
});
