---
max_turns: 6
allowed_tools: [Skill]
---

`tidepool` is a TypeScript scheduling library. Yesterday I sent my branch `omar/feat/TP-14/add-cron-parser` to `origin`. This morning I folded two fixup commits into their targets with an autosquash rebase, so the branch is rewritten. Then I ran `git fetch origin`, which printed:

```
   04de0b4..e3f0903  omar/feat/TP-14/add-cron-parser -> origin/omar/feat/TP-14/add-cron-parser
```

`04de0b4` is the tip I sent yesterday; I had not noticed that my colleague Ines pushed a commit of her own, `e3f0903`, to the same branch. `git push` now answers `! [rejected] ... (non-fast-forward)`. What do I run to send my branch? The repository is not checked out in this session; work from this description.
