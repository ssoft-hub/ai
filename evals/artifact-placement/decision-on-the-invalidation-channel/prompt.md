---
max_turns: 6
allowed_tools: [Skill]
---

`ledger-api` is a Node.js service kept by a team of four in one repository, which holds `src/`, `test/`, `package.json`, a `README.md` on running the service and a `CONTRIBUTING.md` on branch names and code review. Each of its three instances caches account balances, and a write on one instance has to drop the cached balance on the other two.

The team has settled how: PostgreSQL `LISTEN`/`NOTIFY` on a channel `balance_changed`, fired by a trigger on the table `balances`, rather than Redis pub/sub. The service already runs against PostgreSQL and runs no Redis, which would be one more store to operate for one feature. A notification sent while an instance is disconnected is lost, so an instance drops its whole cache when it reconnects; a payload is limited to 8000 bytes, so it carries the account id alone. A colleague who joins the team later will read the record to learn why the service runs no Redis.

Write the decision record for this choice. The repository is not checked out in this session; work from this description.
