---
type: llm
weight: 1
---

Find every comment in the response and ask of each one whether a row of the list in the section quoted below describes it: a comment naming a step, saying what a condition tests, saying what a literal stands for, saying what a variable or a parameter holds, naming the units or the admitted values, labelling a block inside a function, or restating the line below it. The list is closed, so a comment no row describes passes here, whatever else it says.

FAIL the response when a row describes one comment or more. PASS it when no row describes any.

A response carrying no comment at all passes this grader. A documentation block on a public interface falls outside the skill and is not measured here; every other comment is, whatever marker opens it, and, as the section The Comments a Change Writes states, line comments on lines of their own are one comment until a line of code stands between them, a blank line splitting none, and a comment ending a line of code is one by itself.

The section, from the `comments` skill:

## A Comment a Name or a Type Replaces

**Must**

Must make the change a row below names in place of the comment that row describes, and
must admit no such comment beside that change.

| The comment | The change in its place |
|---|---|
| names a step | an extracted function of that name |
| says what a condition tests | a named predicate |
| says what a literal stands for | a named constant or enumeration |
| says what a variable or a parameter holds | a name that says it |
| names the units or the admitted values | a type that carries them |
| labels a block inside a function | a separate function |
| restates the line below it | none beyond deleting the comment |

Nothing else belongs to the list; a comment no row describes is not one a name or a type
replaces.

Before, rejected by the rows for a condition and for a step:

```cpp
// Sweep complete with measured points.
if (_state == 3 && _points > 0) {
    // Convert raw samples to dB.
    for (auto& sample : _samples) sample = 20 * std::log10(sample);
}
```

After:

```cpp
if (sweepIsComplete() && hasMeasuredPoints()) {
    convertToDecibels(_samples);
}
```

Before, rejected by the rows for a variable and for units:

```rust
struct Probe {
    ready: bool,     // true once init() returned
    threshold: f64,  // in degrees Celsius
}
```

After:

```rust
struct Probe {
    init_returned: bool,
    threshold: Temperature,
}
```
