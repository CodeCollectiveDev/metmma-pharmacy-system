# METMMA Pharmacy Management System

A local-first pharmacy management system built with:

- Frontend: Vue 3 + Vite + Tailwind CSS + PouchDB
- Backend: Node.js + Express + PostgreSQL
- Auth: JWT-based role authentication
- Sync: Offline-first with local-to-local sync

---

## Repository Structure

backend/ → Express API & PostgreSQL logic

frontend/ → Vue 3 frontend app

docs/ → API contracts, DB design, sprint plans

postman/ → Postman collections

---

## Branching Strategy

- `main` → production-ready (protected)
- `develop` → integration branch (default)
- Feature branches:
  - `feat/<feature-name>`
  - `fix/<bug-name>`
  - `chore/<task-name>`

🚫 No direct commits to `main` or `develop`

---

## Git Workflow

1. Pull latest `develop`
2. Create feature branch
3. Commit small, clear changes
4. Push branch
5. Open PR → `develop`
6. Require at least 1 review

---

## Backend Rules

- Use Joi validation on every API input
- Role-based middleware required
- No business logic inside routes
- Environment variables via `.env` (never commit secrets)

---

## Frontend Rules

- Offline-first: PouchDB is source of truth
- Only FE Architect touches sync service
- Use shared helpers for DB access
- No direct API calls outside services

---

## Sprint Plan

This project follows a **7-day sprint plan**.
See `docs/sprint-plan.md` for daily tasks.

---

## Thermal Printing

To configure the thermal receipt printer (hardware, `.env` setup, and troubleshooting), see `docs/thermal-printing-setup.md`.

---

## Communication

- GitHub Issues → tasks & bugs
- Slack/Discord → quick questions
- PRs must reference issues

---

## Ownership

- Backend Lead: Joshua
- 
  Core Team: Patrick, Gilbert
  
- Frontend Lead: Mike
- 
  Core Team: Debora, Praise, Fatsani
