Where should the decision record for this choice go? Neither the `README.md` nor the `CONTRIBUTING.md` of `ledger-api` says where the project keeps decision records. Until its place is settled, here is the start of the record:

**Title:** Invalidate cached balances through PostgreSQL `LISTEN`/`NOTIFY`

## Decision

A trigger on the table `balances` fires a notification on the channel `balance_changed`, carrying the account id alone, and every other instance drops that account's cached balance.
