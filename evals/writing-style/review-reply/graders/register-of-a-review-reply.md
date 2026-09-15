---
type: llm
weight: 1
---

The response is a reply in a review thread, which is a conversation. It passes when every sentence of it stands in the register the rule below fixes for that kind of text, and fails when any sentence stands in the other one.

The rule, from the `writing-style` skill:

## Impersonal and Personal

**Must**

A conversation — a review comment or reply, an issue or thread comment, a message — is
written in the personal register. Every other text is written in the impersonal one: a
skill, a command, a persona, documentation, an issue, a description, a commit body.

| Register | The subject of a sentence | Who stands in it |
|---|---|---|
| impersonal | the thing the sentence is about | neither the writer nor the reader: no "we saw above", no "you get a pointer" |
| personal | the writer | the writer, addressing the reader |

| Defective | Corrected |
|---|---|
| "as we saw above, you get a pointer to the object" | "the cast answers a pointer to the object" |
| "the loop should be extracted" — in a review comment | "I suggest extracting the loop" |
