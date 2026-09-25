---
type: llm
weight: 1
---

The prompt shows the bodies of `Save` and `Load`: `Save` calls `os.Create`, `f.Sync` and `os.Rename`, and `Load` calls `os.ReadFile`, with no interface between the package `store` and the file system, so whether the previous `state.json` survives a run cut short is settled by the rename on disk. The package carries no test of its own yet, and the prompt asks at which level each test sits.

Grade only the level the response names for each test, against the section quoted below.

PASS the response when at least one test is named with a level, and every test reaching the file system is named at `Integration`, `Contract` or `End-to-end`. FAIL it otherwise.

The rule, from the `testing` skill:

## Levels of Verification

**Must**

What the code of a test reaches, directly or through the code it calls, fixes its lowest
level:

| Level | The test reaches | The stand-in it admits |
|---|---|---|
| Unit | nothing beyond its own process | one for any collaborator beyond the process |
| Integration | another process, a network endpoint, a file system, a queue or a database, none of them a party outside the project | none for the endpoint the test reaches |
| Contract | a party outside the project, or the recorded agreement that party is verified against as well | that recorded agreement for that party, and no other |
| End-to-end | every boundary from the entry a user meets to the store behind it | one for a party outside the deployment, and none for a part the deployment carries |

Reading a checked-in fixture reaches no file system.

A test reaching what the Integration, Contract or End-to-end row names must not be named,
filed or run as a unit test — by its name, directory, build target, label or tag.
