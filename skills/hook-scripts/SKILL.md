---
name: hook-scripts
version: "1.0.0"
description: Apply when writing or modifying hook scripts in hooks/ or tools/
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - node
    - claude-code
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

A tool decides on the payload and states its verdict; the dispatcher turns the verdicts
into one answer. Each tool is loaded and read inside the try that calls it, so a file that
is missing, throws, or answers in the wrong shape costs that one tool and a line on stderr.

```javascript
'use strict';
const os = require('os'), path = require('path');
const d = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

const DISPATCH = { ToolName: ['tool-name.js'], OtherTool: ['other-tool.js'] };

// `String()` throws on a value with no primitive conversion, and so does a hostile
// `.message`: both reads belong inside a try, or one guard's verdict takes the hook down.
const asText = v => { try { return String(v); } catch { return null; } };
const asReason = e => { try { return String(e?.message ?? e).split('\n')[0]; } catch { return null; } };

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let data; try { data = JSON.parse(raw); } catch { process.exit(0); }
  const context = [];
  for (const tool of DISPATCH[data.tool_name] ?? []) {
    try {
      const { verdict } = require(path.join(d, 'tools', tool));
      if (typeof verdict !== 'function') throw new Error('it exports no verdict');
      // Each field read once, and the block acted on before `output` is read: a throw
      // reading `output` must not discard a block already stated.
      const said = verdict(data);
      const block = said?.block;
      if (block) {
        const stated = asText(block)?.trim();
        process.stderr.write(`${stated || `${tool} blocked the call without stating why`}\n`);
        process.exit(2);
      }
      const output = said?.output;
      const out = output === undefined ? '' : asText(output);
      if (out === null) process.stderr.write(`${tool} stated output it could not write\n`);
      else if (out.trim()) context.push(out.trim());
    } catch (err) {
      process.stderr.write(`${tool} did not run — ${asReason(err) ?? 'it stated no reason'}\n`);
    }
  }
  if (context.length) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: context.join('\n') },
    }));
  }
  process.exit(0);
});
```

A dispatcher collects what its tools state instead of forwarding it line by line: on
every event but the three below, plain stdout reaches nobody (see Reaching the Model).

## Tool Skeleton

A tool exports one entry the dispatcher calls, and hands the same function to the runner
that runs it as a script. Returning the verdict rather than writing it keeps the two paths
from drifting: the stdin, stdout and exit-code contract exists once, in `tools/guard.js`.

```javascript
'use strict';
const path = require('path');

// undefined — nothing to say
// { block: text }  — text on stderr, exit 2
// { output: text } — text on stdout, exit 0
function verdict(data) {
  const command  = data.tool_input?.command ?? '';
  const filePath = data.tool_input?.file_path ?? data.tool_input?.path ?? '';
  const content  = data.tool_input?.new_string ?? data.tool_input?.content ?? '';
  // ... logic ...
  return undefined;
}

if (require.main === module) require(path.join(__dirname, 'guard.js')).runAsScript(verdict);

module.exports = { verdict };
```

Require a module where it is first needed rather than at the top, unless every payload
reads it: the dispatcher loads a guard in front of every call the payload routes to it, so
a module that guard never reaches on this payload is startup spent for nothing — `guard.js`
above is reached only by a direct run of the tool. It also narrows a failure, which matters
more: a module required where it is used costs the guard on the payloads that needed it
rather than on all of them, so a missing file takes the guard off a shell command without
taking it off an edit.

A `verdict` runs inside the dispatcher's process with no watchdog in front of it, so it
must return rather than exit, and return in bounded time: no network call, no unbounded
read, no synchronous child process. One that never returns costs the whole hook rather than
itself: it spends the hook's whole timeout, and the guards behind it never decide.

A tool that runs after the fact, or that takes a file path on argv instead of a payload,
states no verdict and is spawned as a script — `hooks/PostToolUse.js` and its lint tools.

## Exit Codes

| Code | Meaning | Channel |
|------|---------|---------|
| `0` | Allow / warning | stdout, parsed as JSON output; anything else goes to the debug log |
| `2` | Deny / block | stderr → the model reads it; `PreToolUse` also blocks the call |

Never use `1` — unpredictable behavior. A tool exporting a verdict states these rather than
writing them: `{ output }` is the exit-`0` channel and `{ block }` the exit-`2` one.

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
tool_name:  'Edit' | 'Write' | 'Bash' | 'PowerShell' | 'Read' | ...
tool_input: { file_path, old_string, new_string }  // Edit
            { file_path, content }                  // Write
            { command }                             // Bash, PowerShell
```

Route on the payload, not on the tool name. Tool names are an open set — a second shell, an
MCP server, a plugin's own edit tool — and a guard keyed on a name is bypassed by every
other tool carrying the same payload. The bypass is silent: the dispatcher finds no entry
and exits 0, so the guard stays installed and never runs. A `command` string means the
command guards, a write target (`file_path`, `path`, `notebook_path`) arriving with its
content means the write guards, and a payload carrying both reaches both. Keep a name list
only for the tools whose payload alone would not say what they do, and read it as the
exception rather than as the rule.

The cost is the other direction: a tool whose `command` field is not a shell command still
reaches the command guards. Fail that way round — a guard that runs where it need not is a
prompt, while a guard that does not run where it must is an unchecked `git push`. A payload
carrying both a command and a write target reaches both sets of guards, since either half
alone would leave the other unchecked.

A dispatcher does not `require` a file from `tools/` in order to start: a missing or
half-installed tool would throw before any payload is read and take every tool call in the
session with it. It may require one where it calls it, inside the try that calls it, since
that failure costs the one tool and a line on stderr. So the routing rule, which decides
which tools are called at all, is stated on both sides of the boundary — add a test that
runs the two copies over the same inputs. A duplication a test holds together beats a
dependency that can bring the session down.

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
