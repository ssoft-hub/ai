```yaml
host: 0.0.0.0
port: 8080

log_level: info

# Below the timeout of the proxy in front of the service, or the proxy answers first.
request_timeout_seconds: 30

max_connections: 100

database:
  url: postgres://app@db/app
  # Summed over every running instance, stays below the database server's limit.
  pool_size: 10
```
