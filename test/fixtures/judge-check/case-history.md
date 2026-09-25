```js
function orderTotal(lines) {
  let total = 0;
  for (const line of lines) {
    // Added in the second round of review.
    if (line.quantity <= 0) continue;
    total += line.price * line.quantity;
  }
  return total;
}
```
