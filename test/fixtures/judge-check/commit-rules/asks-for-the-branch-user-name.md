The branch name opens with your user name, and neither your message nor the git configuration gives one: `git config user.name` prints nothing. Which name should the branch carry? With it, the command is:

```bash
git checkout -b <user>/feat/TH-31/add-csv-export main
```
