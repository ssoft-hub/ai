```c
void flush(unsigned status) {
    // Bit 2 of the status register is set while the transmit buffer is empty.
    if (status & 0x04) send_next();
}
```
