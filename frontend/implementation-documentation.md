# METMMA Pharmacy Management System - Implementation Documentation

## 1. System Architecture Overview

The METMMA Pharmacy Management System (MPMS) is built as a modern, offline-first web application. It consists of a Vue-based frontend and a Node.js backend with a PostgreSQL database.

### Frontend Technical Stack:
- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **State Management**: Pinia
- **Routing**: Vue Router
- **Styling**: Vanilla CSS & Tailwind CSS (Utility-first)
- **Icons**: Lucide Vue Next
- **Storage**: LocalForage (IndexedDB) for offline persistence
- **API Client**: Axios

### Directory Structure:
```text
frontend/src/
├── layouts/          # Global layouts (MainLayout, TopBar, Sidebar)
├── modules/          # Feature-based modular structure
│   ├── auth/         # Authentication (Login, Roles)
│   ├── pos/          # Point of Sale (Sales & Tilling)
│   ├── inventory/    # Stock Management
│   ├── hr/           # Employee & Attendance Management
│   ├── reports/      # Sales & Stock Analytics
│   └── shared/       # Shared views (Help, Utilities)
├── services/
│   ├── api/          # Axios client and endpoint definitions
│   ├── data/         # Hybrid data orchestration logic
│   └── sync/         # Background synchronization worker
└── pouchdb/          # Database configuration (LocalForage wrapper)
```

---

## 2. Data Flow & Offline-First Strategy

The system implements a robust **Hybrid Data Layer** designed to prioritize backend consistency while maintaining full functionality during network outages.

### Primary Principles:
1. **Network Aware**: The system detects online/offline status via `navigator.onLine`.
2. **API-First**: If online, data is fetched and saved directly to the backend. Local storage is updated simultaneously to stay current.
3. **LocalForage Fallback**: If the backend is unreachable, the system serves cached data from IndexedDB.
4. **Queue & Sync**: Mutations (Create/Update/Delete) made while offline are saved with a `pending` state and queued.

### Data Orchestrator Flow:
- **Read**: `API -> Update Local -> Return Local`. If API fails, it directly returns Local.
- **Write**: `If Online -> API -> Save Local (synced)`. `If Offline -> Save Local (pending)`.

### Synchronization (`syncWorker.js`):
A background services runs every 30 seconds to:
1. Scan local collections for records marked as `pending`.
2. Attempt to push items to the backend API one by one.
3. Update local status to `synced` upon success.
4. Trigger automatically whenever the browser detects a restoration of connectivity.

---

## 3. Security & RBAC

### Authentication:
- **Online only**: Sign-in requires an active connection to `/api/auth/login`, which returns a **JWT Bearer Token** (and refresh token). Offline emergency login is not supported so that authentication and server-side token revocation remain enforceable.
- **Persistence**: Access token, refresh token, and user role are stored in `localStorage` for session recovery while the tab or browser remains open. An existing session continues to work offline for cached data and queued mutations; signing in again after logout requires connectivity.

### Role-Based Access Control (RBAC):
Enforced via Vue Router Navigation Guards in `router/index.js`.
- **Roles**: `admin`, `pharmacist`, `cashier`, `store_manager`, `hr_officer`.
- **Mechanism**: Each route has a `meta.roles` array. Unauthorized users are redirected based on their role.

---

## 4. Testing & Credentials

User accounts are provisioned on the server (see `DEPLOYMENT.md` and `docs/TESTING_GUIDE.md` for creating an admin via `createAdmin.js`). Local IndexedDB stores business data (products, transactions, etc.) only—not credentials.

---

## 5. Docker Implementation & Role

### Responsibilities:
1. **Infrastructure Isolation**: `docker-compose.yml` manages the **PostgreSQL 16** database.
2. **Standardized Runtime**: The `frontend/Dockerfile` utilizes a two-stage build:
   - **Stage 1 (Builder)**: Node 20-alpine environment to build production assets.
   - **Stage 2 (Production)**: Lightweight Nginx environment to serve static assets.

### How to Use:
```bash
# Build and run the entire stack
docker-compose up --build -d
```

### Limitations:
- **Storage**: IndexedDB (used by LocalForage) lives in the user's browser, not the container, ensuring persistent data across container restarts.
- **Security Context**: Mobile barcode scanning requires HTTPS (Secure Context) when hosted in production environments.
