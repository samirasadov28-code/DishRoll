# DishRoll — Claude notes

## Workflow preferences
- When making code changes, bump `APP_VERSION` in `src/App.jsx` (patch increment by default).
- Always end every reply by stating the new version number, e.g. "App is now **v0.5.1**."
- After pushing a branch, open a PR and merge it to `main` without waiting for confirmation — the user has pre-authorized this. Netlify deploys from `main`, so merging is required for changes to go live.
- Before creating the PR (or immediately before merging if it fails), always rebase onto main: `git fetch origin main && git rebase origin/main && git push --force-with-lease origin <branch>`. This prevents merge conflicts on every PR.
- Prefer squash-merge unless the branch has meaningful commit history worth preserving.
