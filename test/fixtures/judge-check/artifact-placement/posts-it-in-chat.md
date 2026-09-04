Post this in the team's chat channel, so whoever takes the failure up next finds it there:

**`test_render_parallel`: intermittent failure on the Windows runner**

- 7 failures in the last 200 CI runs, all on the Windows runner, none on a developer machine.
- Every failing run shows two worker processes starting within the same second, by the timestamps of their first log lines.
- Each failure is a `PermissionError` on the file `tile-<seconds since epoch>.png` under the temporary directory.
- A rerun of the same commit passed every time.
- 500 runs of the test in a loop on a Windows 11 machine produced no failure.
