```yaml
host: 0.0.0.0
port: 8080

# One of: debug, info, warn, error.
log_level: info

request_timeout_seconds: 30

max_connections: 100

database:
  url: postgres://app@db/app
  pool_size: 10
```
