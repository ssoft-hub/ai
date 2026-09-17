---
type: llm
weight: 1
---

The response passes when every sentence in it that prescribes an action carries a force word (must, should, recommended, may) in the active form with the actor named, and fails when any prescribing sentence is a bare imperative or a passive that leaves the actor unnamed. A sentence that prescribes nothing is not judged.

The rule, from the `writing-style` skill:

## Name the Force, Not Just the Action

**Must**

A sentence prescribing an action must convey the force it carries — one of the four
markers, in the words the `writing-language/<language>.json` file gives for that language
— in the register Impersonal and Personal fixes for the text it stands in.

The impersonal form runs the force word with the action, active: "should extract the
loop", "the caller should extract the loop". Never a bare "extract the loop", and never a
passive leaving the actor unnamed: "the loop should be extracted". The personal form runs
in the first person: "I suggest extracting the loop".

A conversation carries force at the recommended level, which is where the language files
give it a first-person form. A stronger force reaches the reader through the label on a
finding, or through the artifact the message names.
