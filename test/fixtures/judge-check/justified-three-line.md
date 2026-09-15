```yaml
# 0.0.0.0 accepts connections on every interface, including public ones.
host: 0.0.0.0
port: 8080

# One of: debug, info, warn, error.
log_level: info

# Keep under the timeout of any proxy in front of this service, or the proxy
# reports the failure first and its error reaches the client instead.
request_timeout_seconds: 30

max_connections: 100

database:
  url: postgres://app@db/app
  # Shared across all in-flight requests: while below max_connections, requests
  # queue here under load. The sum over all running instances must stay under
  # the database server's own connection limit.
  pool_size: 10
```
