# AGENTS.md

Working rules for AI agents (and humans) changing this repository.

## Branching rules — read before you push

`main` is live production. All work goes through `staging`.

1. **Never push to `main` or `staging` directly.** Both branches require a pull request; direct pushes are rejected by GitHub.
2. **Branch off `staging`**, not `main`:
   `git checkout staging && git pull && git checkout -b feature/<slug>`
3. **Open a PR into `staging`**, let CI run, get one teammate approval, merge.
4. **Release by PR**: open a PR from `staging` into `main`. Merging into `main` deploys to production.
5. **Never force-push** `main` or `staging`, and never delete them. To undo something already on `main`, use `git revert` and open a PR.
6. Do not merge your own pull request. GitHub does not count the author's approval, and both protected branches require one approving review from someone else.

Full policy: [docs/BRANCHING_WORKFLOW.md](docs/BRANCHING_WORKFLOW.md).

## Verify before you push

Run the same checks CI runs, from the repository root:

~~~sh
npm run check --prefix backend
npm test --prefix backend
npm run check --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
~~~

Integration tests need the disposable Docker database and must never touch Neon:

~~~sh
docker compose up -d --wait
npm run test:integration:local --prefix backend
~~~

Use Node 22 (see `.nvmrc` / `.node-version`). Newer Node releases ship a native `globalThis.localStorage` that breaks the jsdom test environment.

## Ground rules for changes

- Money, stock and permissions are confirmed by the server. Never trust client-side state for totals, availability or roles.
- Keep secrets out of the repository. Deployment secrets live in the `production` GitHub environment.
- Database changes need a migration under `database/migrations` and must be safe to run on an existing production database.
- Do not weaken or disable tests to make a build pass.
- Match the existing style of the file you are editing; no commented-out code, no stray debug output.
