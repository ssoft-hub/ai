'use strict';
const fs = require('fs');
const path = require('path');

// Declaration order is the load order skills firing on one task are announced in.
const TIERS = ['process', 'domain', 'narrow'];
const DEFAULT_TIER = 'domain';

function globToRegExp(glob) {
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
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

function readSequence(block, key) {
  const inline = block.match(new RegExp(`^\\s*${key}:\\s*\\[(.*)\\]\\s*$`, 'm'));
  if (inline) {
    // A glob may itself contain a comma, so only a comma outside quotes separates items
    return [...inline[1].matchAll(/(?:^|,)\s*(?:"([^"]*)"|'([^']*)'|([^,]*))/g)]
      .map(m => (m[1] ?? m[2] ?? m[3]).trim())
      .filter(Boolean);
  }
  const lines = block.split('\n');
  const start = lines.findIndex(l => new RegExp(`^\\s*${key}:\\s*$`).test(l));
  if (start === -1) return undefined;
  const items = [];
  for (const line of lines.slice(start + 1)) {
    const m = line.match(/^\s+-\s+(.*)$/);
    if (!m) break;
    items.push(m[1].trim().replace(/^["']|["']$/g, ''));
  }
  return items;
}

function parseFrontmatter(source) {
  // A skill file checked out on Windows carries CRLF; every pattern below anchors on \n
  const text = String(source).replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const block = m[1];
  const scalar = key => block.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'))?.[1].trim();
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
  if (!fs.existsSync(skillsDir)) return [];
  const catalog = [];
  for (const name of fs.readdirSync(skillsDir).sort()) {
    const skillFile = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
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
