```c
int read_temperature(int sensor) {
    wake(sensor);
    // The sensor answers the first read after a wake with a stale sample.
    read(sensor);
    return read(sensor);
}
```
