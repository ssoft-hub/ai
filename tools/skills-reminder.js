'use strict';
const os = require('os');
const path = require('path');
const { TIERS, loadCatalog } = require(path.join(__dirname, 'skill-catalog.js'));

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const skillsDir = path.join(configDir, 'skills');

const HEADER = [
  'SKILLS — before acting, match the work against this list and load every matching',
  'skill with the Skill tool. Loading is the only way a skill applies: recalling that',
  'a skill exists, or that you read it in an earlier session, does not count.',
  'Several may match one task — load them all, process tier first, then domain, then',
  'narrow; the narrower skill wins on its own topic. Skills tied to a kind of file are',
  'left out here — they are named at the moment that file is edited.',
].join('\n');

function trigger(description) {
  return description.replace(/^Apply when\s+/i, '').trim();
}

// A skill that opted out is announced by skill-gate instead, when its file is edited.
function buildSkillList(dir) {
  return loadCatalog(dir)
    .filter(skill => skill.reminder)
    .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.name.localeCompare(b.name))
    .map(skill => `${skill.name} [${skill.tier}]: ${trigger(skill.description)}`);
}

function buildContext(dir) {
  const entries = buildSkillList(dir);
  if (!entries.length) return null;
  return HEADER + '\n' + entries.map(e => `- ${e}`).join('\n');
}

if (require.main === module) {
  let input = '';
  process.stdin.on('data', c => { input += c; });
  process.stdin.on('end', () => {
    const additionalContext = buildContext(skillsDir);
    if (!additionalContext) return;
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext,
      },
    }));
  });
}

module.exports = { trigger, buildSkillList, buildContext };
