---
max_turns: 6
allowed_tools: [Skill]
---

`mosaicwren` is a Python package rendering map tiles, tested with pytest in CI on Ubuntu, macOS and Windows runners. Its test `test_render_parallel` has failed 7 times in the last 200 CI runs, every time on the Windows runner and never on a developer machine. What has been observed so far:

- every failing run shows two worker processes starting within the same second, by the timestamps of their first log lines;
- each failure is a `PermissionError` on a file `tile-<seconds since epoch>.png` under the temporary directory;
- a rerun of the same commit passed every time;
- 500 runs of the test in a loop on a Windows 11 machine produced no failure.

Nobody has found the cause, and nobody takes it up this week. Write the record of the observed conditions, so that whoever takes the failure up next starts from it. The repository is not checked out in this session; work from this description.
