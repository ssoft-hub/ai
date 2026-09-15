```js
function orderTotal(lines) {
  // Start the total at zero
  let total = 0;
  // Loop over every line
  for (const line of lines) {
    // Skip lines with zero or negative quantity
    if (line.quantity <= 0) continue;
    // Add price times quantity to the total
    total += line.price * line.quantity;
  }
  // Return the total
  return total;
}
```
