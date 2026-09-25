---
max_turns: 6
allowed_tools: [Skill]
---

The Go package `store` keeps a daemon's state in one file. `Save(dir string, s State) error` marshals the state to `state.json.tmp` inside `dir`, syncs it, and renames it over `state.json`; `Load(dir string) (State, error)` reads `state.json` back and returns the zero `State` where the file is absent. What the rename is there for is the part we keep getting wrong: a run cut short after the temporary file is written must leave the previous `state.json` whole and readable.

```go
func Save(dir string, s State) error {
	data, err := json.Marshal(s)
	if err != nil {
		return err
	}
	tmp := filepath.Join(dir, "state.json.tmp")
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	if _, err := f.Write(data); err != nil {
		f.Close()
		return err
	}
	if err := f.Sync(); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, filepath.Join(dir, "state.json"))
}

func Load(dir string) (State, error) {
	var s State
	data, err := os.ReadFile(filepath.Join(dir, "state.json"))
	if errors.Is(err, fs.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return s, err
	}
	return s, json.Unmarshal(data, &s)
}
```

The package carries no test of its own yet. Write the tests covering `Save` and `Load`, and say at which level each test sits. Reply with the tests and their levels alone.
