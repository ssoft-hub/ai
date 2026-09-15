---
max_turns: 6
allowed_tools: [Skill]
---

Write the `config.yaml` of a small HTTP service with the keys `host` (0.0.0.0), `port` (8080), `log_level` (info), `request_timeout_seconds` (30), `max_connections` (100), and under `database` the keys `url` (postgres://app@db/app) and `pool_size` (10). Comment it as a configuration file handed to an operator usually is. Reply with the file alone, in one fenced block.
