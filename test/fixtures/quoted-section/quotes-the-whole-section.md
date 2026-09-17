---
type: llm
weight: 1
---

PASS the response when its body carries the sections of the template and nothing else.

The rule, from the fixture skill:

## Description Template

**Must**

An issue body must carry the sections of the template for its type and no section outside
them.

```markdown
## Goal
What problem does this solve and why now.

## Test plan
- [ ] How to verify it.
```

Every heading of the block above sits inside a fence, so none of them ends this section.
