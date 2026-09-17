---
max_turns: 6
allowed_tools: [Skill]
---

Write a TypeScript function `withRetry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T>` that calls `fn`, and on a rejection waits `delayMs` milliseconds and calls it again, up to `attempts` calls in total, rethrowing the last error once they are used up. Comment the implementation for the next reader. Reply with the code alone, in one fenced block.
