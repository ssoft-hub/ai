---
max_turns: 6
allowed_tools: [Skill]
---

`wrenfield` is a Go service relaying readings from weather stations, kept by five developers in one repository holding `cmd/`, `internal/`, `go.mod`, a `README.md` and a `CONTRIBUTING.md`. The `CONTRIBUTING.md` reads in full:

> Every change goes through a pull request reviewed by one developer, with `go vet` and `go test ./...` passing. An architectural decision is recorded as an issue in the project's issue tracker, carrying the label `adr`, and the pull request making the change links that issue.

Until now the service has polled each station over HTTP every 10 seconds. The team has settled on each station pushing its readings over one long-lived gRPC stream instead: a reading reaches the service within a second of being taken, and a station that goes silent is noticed when its stream closes rather than after three missed polls. A station running firmware older than version 4 cannot open a stream and stays on polling until it is upgraded. The team counts the choice as an architectural decision, and the pull request making the change opens tomorrow.

Write the decision record for this choice. The repository is not checked out in this session; work from this description.
