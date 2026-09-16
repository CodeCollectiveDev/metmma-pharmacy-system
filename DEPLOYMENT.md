# 🚀 Deployment Guide — Live on Netlify + Render + Neon

This guide walks you through deploying the METMMA Pharmacy System to production in approximately 30 minutes.

**Architecture:**
- **Frontend** → Netlify (static hosting)
- **Backend** → Render (Node.js/Express server)
- **Database** → Neon (PostgreSQL, cloud-managed)

---

## Step 1: Set Up Neon Database

### 1.1 Create a Neon Account
1. Go to [https://neon.tech](https://neon.tech) and sign up (free tier is sufficient)
2. Create a new project:
   - **Project name**: `metmma-pharmacy`
   - **Region**: choose the one closest to your users
   - **Database name**: `metmma_pharmacy`
   - **Password**: set a strong password (save it — you'll need it)

### 1.2 Get Your Connection String
1. In the Neon dashboard, click **Connect** on your project
2. Select **Connection String**
3. Copy the full connection string. It looks like this:
   ```
   postgresql://metmma_user:password@ep-xxxx.us-east-1.aws.neon.tech/metmma_pharmacy?sslmode=require
   ```
4. Save this — it goes in the Render backend as `DATABASE_URL`

### 1.3 Apply the Database Schema and Seed Data

You cannot use the Docker `init.sql` directly because Neon is a managed service. Instead, run the SQL manually.

**Option A — Using psql (recommended):**

1. Copy the `init.sql` file to your machine (it's already in the repo at `database/init.sql`)
2. Connect to your Neon database:
   ```bash
   # Replace with your Neon connection string
   psql "postgresql://metmma_user:password@ep-xxxx.us-east-1.aws.neon.tech/metmma_pharmacy?sslmode=require"
   ```
3. Fix the SQL errors in `init.sql` before running it (see **Known SQL Issues** below)

**Option B — Using the Neon Console:**
1. Open the Neon SQL Editor in your dashboard
2. Paste the SQL from `database/init.sql` (with fixes — see below)
3. Run it

#### ⚠️ Known SQL Issues in `init.sql` (Fix Before Running)

The `init.sql` has 4 errors that prevent it from running on Neon. Fix these before executing:

**Fix 1: Remove duplicate PRIMARY KEY from reports tables**

In `operation_reports` table definition (~line 153), change:
```sql
report_id SERIAL PRIMARY KEY,
```
to:
```sql
report_id SERIAL,
```

In `financial_reports` table definition (~line 178), change:
```sql
report_id SERIAL PRIMARY KEY,
```
to:
```sql
report_id SERIAL,
```

**Fix 2: Fix the foreign key type mismatch in `compliance_reports`** (~line 167)

Change:
```sql
created_by INT REFERENCES employees(employee_id)
```
to:
```sql
created_by INT REFERENCES users(id)
```

**Fix 3: Fix the typo `IF NO`** (~line 250)

Change:
```sql
CREATE INDEX IF NO EXISTS idx_operation_reports_created_by
```
to:
```sql
CREATE INDEX IF NOT EXISTS idx_operation_reports_created_by
```

**Fix 4: Remove `report_date` from sales index** (~line 236)

Change:
```sql
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
```
to:
```sql
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
```

**Fix 5: Fix the PL/pgSQL NOTICE block** (~line 304)

Change:
```sql
RAISE NOTICE ' - Patrick: products, sales, sale_items','operation_reports, compliance_reports, financial_reports';
```
to:
```sql
RAISE NOTICE 'Patrick: products, sales, sale_items, operation_reports, compliance_reports, financial_reports';
```

After all fixes, run the SQL. You should see all tables created and 5 users, 5 products, and 4 employees inserted.

### 1.4 Verify the Database

Run this query to verify data:
```sql
SELECT COUNT(*) FROM users;  -- Should return 5
SELECT COUNT(*) FROM products;  -- Should return 5
SELECT COUNT(*) FROM employees;  -- Should return 4
```

Also test the product low-stock and expiry views:
```sql
SELECT * FROM low_stock_products;
SELECT * FROM expiring_products;
```

### 1.5 Create an Admin User with Real Password

The seed users have placeholder password hashes. Update the admin password:

```sql
-- First generate a bcrypt hash at https://bcrypt-generator.com/
-- Then update the admin user (replace the hash with a real one):
UPDATE users SET password_hash = '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH' WHERE username = 'admin';
```

Or create a fresh admin via the API once the backend is running:
```bash
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-secure-password","full_name":"Admin User","email":"admin@metmma.pharmacy","role":"admin"}'
```

---

## Step 2: Set Up Render Backend

### 2.1 Push Code to GitHub

If you haven't already, push your code to a GitHub repository:
```bash
git add .
git commit -m "Initial commit for deployment"
git push origin main
```

### 2.2 Create Render Web Service

1. Go to [https://render.com](https://render.com) and sign up
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `metmma-pharmacy-backend` |
| **Region** | Same as your Neon region |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (for testing) or Starter (for production) |

### 2.3 Set Environment Variables

In the Render dashboard, go to **Environment** and add these variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | *(your Neon connection string from Step 1.2)* |
| `JWT_SECRET` | *(generate a random string — use [this generator](https://randomkeygen.com/), at least 32 characters)* |
| `ALLOWED_ORIGINS` | `https://your-frontend.netlify.app` *(replace with your actual Netlify URL)* |
| `DB_HOST` | *(optional, only needed if not using DATABASE_URL)* |
| `DB_PORT` | `5432` |
| `DB_NAME` | `metmma_pharmacy` |
| `DB_USER` | *(your Neon username)* |
| `DB_PASSWORD` | *(your Neon password)* |

### 2.4 Deploy

Click **Save & Deploy**. Render will automatically build and deploy your backend. Wait for the "Live" status.

Your backend will be at: `https://metmma-pharmacy-backend.onrender.com`

### 2.5 Test the Backend

```bash
# Health check
curl https://metmma-pharmacy-backend.onrender.com/api/health

# Test login (after creating an admin user)
curl -X POST https://metmma-pharmacy-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

## Step 3: Set Up Netlify Frontend

### 3.1 Update Netlify Redirect Configuration

The file `netlify.toml` in the project root already contains a redirect rule that proxies `/api` requests to your Render backend URL. **Update the `to` value** with your actual Render URL:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://metmma-pharmacy-backend.onrender.com/api/:splat"
  status = 200
  force = true
```

This means when the frontend calls `/api/products`, Netlify forwards the request to `https://metmma-pharmacy-backend.onrender.com/api/products` — the browser never sees the backend URL, and no CORS issues arise.

### 3.2 Deploy to Netlify

1. Go to [https://app.netlify.com](https://app.netlify.com) and sign in
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository
4. Configure the build:

| Setting | Value |
|---|---|
| **Build command** | `npm run build` |
| **Publish directory** | `frontend/dist` |

5. Click **Deploy site**

### 3.3 Verify Deployment

After deployment, visit your Netlify URL (e.g., `https://random-name.netlify.app`). The frontend should load. Try logging in with your admin credentials.

---

## Step 4: Post-Deployment Checklist

- [ ] Login works with admin credentials
- [ ] Dashboard loads with product/employee/sales data from Neon
- [ ] POS checkout processes sales and deducts stock
- [ ] Inventory add/edit/delete products works
- [ ] Low stock and expiry alerts display correctly
- [ ] HR module shows employees (if data exists)
- [ ] Reports page loads recent activity
- [ ] Logout clears session and redirects to login
- [ ] Unauthenticated API requests are rejected (401)
- [ ] Wrong role users are blocked from protected routes (403)

---

## Architecture Overview

```
User Browser
    │
    ▼
Netlify (Frontend) ── proxies /api ──→ Render (Backend API)
    │                                        │
    │                                        ▼
    │                                   Neon (PostgreSQL)
    │                                        │
    └────────────────────────────────────────┘
```

All API calls from the browser go through Netlify's proxy to Render. The database connection is between Render and Neon only (never exposed to the browser).

---

## Troubleshooting

### "Failed to fetch" on API calls
- Check that the Netlify `netlify.toml` redirect `to` URL matches your Render URL exactly
- Check Render deployment status (must be "Live")

### "Database connection failed"
- Verify `DATABASE_URL` in Render environment matches your Neon connection string
- Ensure Neon allows connections from Render's IP range (Neon free tier allows all by default)

### "JWT token invalid" after login
- Verify `JWT_SECRET` is set in Render environment
- Redeploy after changing environment variables

### CORS errors (if not using Netlify proxy)
- Set `ALLOWED_ORIGINS` to your Netlify URL in Render environment
- Format: `https://your-site.netlify.app` (comma-separated if multiple)

---

## Cost Estimate

| Service | Free Tier | Monthly Cost |
|---|---|---|
| Netlify | ✅ Yes | $0 |
| Render (Starter) | ✅ Free instance | $0 (free tier) |
| Neon | ✅ 0.5 GB, 1000 hrs | $0 (free tier) |
| Domain (optional) | — | ~$10-15/year |

For a small pharmacy, the free tiers should be sufficient for initial launch.
