```c
int read_temperature(int sensor) {
    wake(sensor);
    // The sensor answers the first read after a wake with a stale sample and clears its alarm flag on every read.
    read(sensor);
    return read(sensor);
}
```
