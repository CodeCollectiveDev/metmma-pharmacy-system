# Branching and release workflow

`main` is live production. Nothing reaches `main` without passing through `staging`.

## The flow

```
feature/xyz  ──PR──▶  staging  ──PR──▶  main
(branch off            (tested,          (production
 staging)               verified)         deploy)
```

1. Branch off `staging`, never off `main`:
   `git checkout staging && git pull && git checkout -b feature/xyz`
2. Open a PR from `feature/xyz` into `staging`.
3. CI must pass and one teammate must approve. Merge to `staging`.
4. Test the staged build. When you are confident it works, open a PR from `staging` into `main`.
5. CI must pass, one teammate must approve, all review comments must be resolved. Merge to `main`.
6. Merging to `main` triggers the production deploy (`.github/workflows/deploy.yml`, environment `production`).

## Why the gates exist

- `staging` and `main` both require a pull request, so no direct pushes land on either branch — not even from admins.
- Both branches require one approving review from a teammate. GitHub does not let you approve your own pull request, so the person who wrote the code cannot be the only approver.
- Both branches require the `backend-test` and `frontend-test` CI checks to pass.
- `main` additionally requires every review conversation to be resolved before merging.
- Force pushes and branch deletion are blocked on both branches.

## What is deliberately NOT enabled

`Lock branch` (read-only) is **off** on both branches. GitHub treats a locked branch as fully read-only and refuses pull request merges against it ("the base branch policy prohibits the merge"), which would make the `staging` → `main` release path impossible. Branch protection gives the same practical guarantee — no direct pushes, no force pushes, no deletions — while still allowing reviewed merges.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Production. Protected. Merging here deploys to the live VPS. |
| `staging` | Integration branch. Protected. Everything is tested here before release. |
| `feature/*`, `fix/*`, `feat/*` | Short-lived work branches, branched from `staging`. |
| `archive/staging-legacy` | Archived work (barcode scanning, thermal printing) that was never merged to `main`. Cherry-pick from it if those features are wanted. |
| `develop` | Legacy branch, diverged from `main`. Not part of this workflow. |

## Local setup

Keep `staging` as your local base branch:

~~~sh
git checkout staging
git pull origin staging
git fetch origin
~~~

If your local `main` has drifted behind, fast-forward it rather than resetting history:

~~~sh
git checkout main
git pull --ff-only origin main
~~~

## CI

`.github/workflows/ci.yml` runs on every pull request into `staging` or `main`, and on every push to those branches:

- `backend-test` — syntax check plus `npm test` (Node 22).
- `frontend-test` — syntax check plus `npm test` plus `npm run build` (Node 22).

The checks are required status checks on both protected branches, so a red build blocks the merge.

## Production deploy

`.github/workflows/deploy.yml` runs on push to `main` and deploys the backend to the VPS (environment `production`, secrets `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY`). It runs database migrations and reloads PM2. Frontend hosting (Vercel/Netlify) is separate and follows its own deploy settings.

## Recovering a bad release

Revert, do not force-push:

~~~sh
git checkout main
git revert <bad-commit>
git push origin main
~~~

Direct pushes to `main` are blocked, so open a pull request with the revert commit instead.
