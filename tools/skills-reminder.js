'use strict';
let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext:
        "SKILLS — apply before matching work:\n" +
        "cpp-coding: C++ impl | api-design: public API/headers | " +
        "doxygen: Doxygen on public headers | ddd: domain models | " +
        "commit-rules: commit messages | pr-rules: PR open/review | " +
        "changelog: CHANGELOG.md | release: version bump/tag | " +
        "hook-scripts: hooks/ or tools/ | editing: any file edit | " +
        "submodule-sync: submodules"
    }
  }));
});
