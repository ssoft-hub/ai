'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const skillsDir = path.join(configDir, 'skills');

const MAX_HINT_LEN = 70;

function shortHint(description) {
  let hint = description.replace(/^Apply when\s+/i, '').trim();
  if (hint.length <= MAX_HINT_LEN) return hint;
  const cut = hint.slice(0, MAX_HINT_LEN);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}

function buildSkillList(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const skillFile = path.join(dir, name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    let text;
    try { text = fs.readFileSync(skillFile, 'utf8'); } catch { continue; }
    const m = text.match(/^description:\s*(.+)$/m);
    if (!m) continue;
    entries.push(`${name}: ${shortHint(m[1])}`);
  }
  return entries;
}

function buildContext(dir) {
  const entries = buildSkillList(dir);
  if (!entries.length) return null;
  return 'SKILLS — apply before matching work:\n' + entries.join(' | ');
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

module.exports = { shortHint, buildSkillList, buildContext };
