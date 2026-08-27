# hooks/

One dispatcher per Claude Code event, named after it. Each reads the payload on stdin and
routes it to the tools of that event; which tools those are, and what each dispatcher
routes on, is `README.md` → Hooks. Writing one is `skills/hook-scripts/SKILL.md`.

## What holds the two copies of a routing rule in step

`tools/payload.js` states the payload rules for the tools and each dispatcher states the
ones it routes on again for itself, under the rule in `skills/hook-scripts/SKILL.md` →
Hook JSON Fields against requiring `tools/` to start. `test/payload.test.js` runs every
copy over every payload shape, so the duplication cannot drift.

## How a tool is reached

`PreToolUse.js` calls each guard's `verdict(payload)` in the dispatcher's own process and
keeps the strictest permission decision of the run; a direct run of the same guard goes
through `runAsScript` in `tools/guard.js`, and `test/guard.test.js` runs both over the same
payloads, so the two paths cannot answer one differently. `PostToolUse.js` spawns its tools
instead — they run after the call and state no verdict.

`tools/statusline.js` is the one tool no dispatcher reaches: `config/settings.json` calls
its exported `main()` in the single `statusLine` slot — `README.md` → Statusline.
