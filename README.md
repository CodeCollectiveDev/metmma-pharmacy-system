# METMMA Pharmacy System

A pharmacy management application with a Vue 3 frontend, an Express API, and PostgreSQL. The server is the source of truth for stock, totals, and permissions.

## Get started

Use Node.js 22 and Docker Compose. From the repository root, follow the [local setup guide](docs/DEVELOPMENT_SETUP.md) to install dependencies, start the local database, apply migrations, and run the app.

The frontend lives in `frontend/`; the API and database tools live in `backend/` and `database/`.

## Documentation

- [Local development setup](docs/DEVELOPMENT_SETUP.md)
- [Production deployment: Heroku API and Vercel frontend](docs/DEPLOYMENT_HEROKU.md)
- [Branching and release policy](docs/BRANCHING_WORKFLOW.md)

## Checks

Run from the repository root:

```sh
npm run check --prefix backend
npm test --prefix backend
npm run check --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
```
