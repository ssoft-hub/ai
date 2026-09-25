```python
def wait_ready(device):
    # Keeps read_status() from starving the other devices on the bus.
    interval = 0.2
    while not read_status(device):
        time.sleep(interval)
```
