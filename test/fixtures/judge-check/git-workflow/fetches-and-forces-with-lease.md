Your remote-tracking ref is out of date. Refresh it and push again under the lease:

```bash
git fetch origin
git push --force-with-lease origin mia/fix/TP-31/close-idle-conns
```

After the fetch the lease matches the remote, so the push goes through and the PR shows your rebased commits.
