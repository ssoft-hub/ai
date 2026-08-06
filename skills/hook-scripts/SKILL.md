---
name: hook-scripts
version: "1.0.0"
description: Apply when writing or modifying hook scripts in hooks/ or tools/
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  reminder: false
  paths:
    - "**/hooks/*.js"
    - "**/tools/*.js"
  with:
    - "comments"
  tags:
    - hooks
    - workflow
---

# Skill: Claude Code Hook Scripts

Apply when writing or modifying hook scripts in `~/.claude/hooks/` or `~/.claude/tools/`.

## Hard Rules

- **Only Node.js built-ins.** No npm, no third-party `require`. Allowed: `child_process`, `fs`, `path`, `os`, `crypto`, `stream`, `util`.
- **No shell logic.** No `bash -c`, `cmd /c`, PowerShell. Shell is only the `node -e` launcher in settings.json; all logic lives in `.js` files.
- **No hardcoded paths.** Use `process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')` and `path.join()` everywhere.

## Architecture

```
hooks/<EventName>.js   ← dispatcher: routing only, named after Claude Code event
tools/<action>.js      ← atomic tool: one responsibility, one action
```

Hook event names (exact, case-sensitive): `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `UserPromptSubmit`, `SubagentStop`, `PreCompact`.

## Dispatcher Skeleton

```javascript
'use strict';
const { spawnSync } = require('child_process');
const os = require('os'), path = require('path');
const d = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

const DISPATCH = { ToolName: ['tool-name.js'], OtherTool: ['other-tool.js'] };

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data; try { data = JSON.parse(raw); } catch { process.exit(0); }
  const context = [];
  for (const tool of DISPATCH[data.tool_name] ?? []) {
    const r = spawnSync('node', [path.join(d, 'tools', tool)], { input: raw, encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
    if (r.stdout?.trim()) context.push(r.stdout.trim());
    if (r.stderr?.trim()) process.stderr.write(r.stderr);
    if (r.status === 2) process.exit(2);
  }
  if (context.length) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: context.join('\n') },
    }));
  }
  process.exit(0);
});
```

A dispatcher collects what its tools write instead of forwarding it line by line: on
every event but the three below, plain stdout reaches nobody (see Reaching the Model).

## Tool Skeleton

```javascript
'use strict';
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data; try { data = JSON.parse(raw); } catch { process.exit(0); }
  const command  = data.tool_input?.command ?? '';
  const filePath = data.tool_input?.file_path ?? data.tool_input?.path ?? '';
  const content  = data.tool_input?.new_string ?? data.tool_input?.content ?? '';
  // ... logic ...
  process.exit(0);
});
```

## Exit Codes

| Code | Meaning | Channel |
|------|---------|---------|
| `0` | Allow / warning | stdout, parsed as JSON output; anything else goes to the debug log |
| `2` | Deny / block | stderr → the model reads it; `PreToolUse` also blocks the call |

Never use `1` — unpredictable behavior.

## Reaching the Model

A warning nobody reads is worse than no warning: it looks like a working guard. Which
channel carries a hook's output to the model depends on the event.

- `UserPromptSubmit`, `UserPromptExpansion` and `SessionStart` — plain stdout on exit `0`
  is added to the model's context as written.
- Every other event, `PreToolUse` and `PostToolUse` included — the model reads
  `hookSpecificOutput.additionalContext` inside a JSON document on stdout, or stderr
  behind exit `2`. Plain stdout reaches the debug log alone.
- `permissionDecisionReason` is the text of the permission prompt: the user reads it,
  the model does not. A warning that both need goes in both fields.

```javascript
process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'what the model must know' },
}));
```

The event name in the payload must match the event the hook is registered for.

## Hook JSON Fields

```
tool_name:  'Edit' | 'Write' | 'Bash' | 'Read' | ...
tool_input: { file_path, old_string, new_string }  // Edit
            { file_path, content }                  // Write
            { command }                             // Bash
```

## PATH Resolution

```javascript
function findTool(name) {
  // --version works for most CLI tools; if a tool uses different flags,
  // check r.error?.code === 'ENOENT' only — ignore non-zero exit status.
  const r = require('child_process').spawnSync(name, ['--version'], { stdio: 'pipe', timeout: 5000 });
  return r.error?.code === 'ENOENT' ? null : name;
}
// If null → stderr.write warning + exit(0)
```

No `where.exe`, no `which`. Node.js `spawnSync` searches PATH on all platforms.

## settings.json Registration

```json
"PreToolUse": [{
  "hooks": [{
    "type": "command",
    "command": "node -e \"const{spawnSync}=require('child_process'),p=require('path'),o=require('os'),d=process.env.CLAUDE_CONFIG_DIR||p.join(o.homedir(),'.claude');spawnSync('node',[p.join(d,'hooks','PreToolUse.js')],{stdio:'inherit',timeout:5000})\"",
    "timeout": 5
  }]
}]
```

Filename must match the event name exactly (`PreToolUse.js`, `PostToolUse.js`, etc.).
`"timeout"` in settings.json = seconds (Claude Code). `timeout` in `spawnSync` = milliseconds (Node.js).
For `PostToolUse` use `timeout: 30` / `timeout:30000`, `Stop` use `timeout: 10` / `timeout:10000`.
`stdio:'inherit'` forwards Claude Code's stdin pipe to the hook process — verified working.
For project-level: `"command": "node .claude/hooks/PreToolUse.js"` (relative path, no launcher needed).

Scripts are portable global↔project without changes — only the command path differs.

## Useful Patterns

**Extension filter:**
```javascript
const CPP_EXTS = new Set(['.h', '.hpp', '.cpp', '.cc', '.cxx']);
if (!CPP_EXTS.has(path.extname(filePath).toLowerCase())) process.exit(0);
```

**Skip if project overrides global:**
```javascript
// ProjectHookName.js — name of the project-level hook file that overrides this global one
if (require('fs').existsSync(path.join(process.cwd(), '.claude', 'hooks', 'ProjectHookName.js'))) process.exit(0);
```

**Exercise a tool without shell quoting issues:** feed it its stdin JSON from Node, never
through a shell. The form that takes as a test — exported logic called directly, versus a
`spawnSync` round-trip for the exit-code and stdin/stdout contract — is `node-testing`
skill.

## Cross-References

- `node-testing` — the tests covering the hooks and tools written here (`test/*.test.js`).
- `comments` — comment rules inside these scripts (arrives with this skill via `with`).
