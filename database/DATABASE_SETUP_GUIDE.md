# METMMA Pharmacy Database Setup Guide

## 📋 Quick Start (For All Developers)

### **Prerequisites:**
1. Install Docker Desktop
2. Clone the repository
3. That's it! No PostgreSQL installation needed.

---

## 🐳 Docker Installation

### **Windows:**
1. Download Docker Desktop: https://docs.docker.com/desktop/install/windows-install/
2. Run the installer
3. Restart your computer
4. Open Docker Desktop from Start Menu

### **Linux (Ubuntu/Debian):**
```bash
# Install Docker
sudo apt update
sudo apt install docker.io docker-compose

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in
```

### **Linux (Manjaro/Arch):**
```bash
# Install Docker
sudo pacman -S docker docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in (or run: newgrp docker)
```

### **macOS:**
1. Download Docker Desktop: https://docs.docker.com/desktop/install/mac-install/
2. Run the installer
3. Move Docker to Applications folder

---

## 🚀 Database Setup (One-Time)

### **Step 1: Clone and Navigate**
```bash
git clone <repository-url>
cd metmma-pharmacy-system
```

### **Step 2: Start the Database**
```bash
# Linux/Mac:
./start-database.sh   #currently not available, moyo siophweka mafana write the commands

# Or manually:
docker-compose up -d

# Windows (Command Prompt):
docker-compose up -d

# Windows (PowerShell):
docker-compose up -d
```

### **Step 3: Verify Installation**
```bash
# Check if database is running
docker-compose ps

# Should show:
# NAME              IMAGE         COMMAND                  STATUS    PORTS
# metmma-postgres   postgres:16   "docker-entrypoint.s…"   Up        0.0.0.0:5432->5432/tcp
```

---

## 🔧 For Backend Developers (Joshua, Gilbert, Patrick)

### **Connection Details:**
```text
Host: localhost
Port: ******
Database: ******
Username: ******
Password: ******    #check the updated .env file.
```

### **In Your Node.js Code:**
```javascript
// In backend/.env file:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metm*********
DB_USER=met*******
DB_PASSWORD=S******

// In your connection file (server.js or db.js):
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
```

### **Testing Your Connection:**
```bash
cd backend
node test-db.js  #all tests should pass
```

---

## 🗄️ Database Schema Overview

### **Tables by Developer:**

**Joshua (Authentication & Security):**
*   `users` - User accounts, roles, passwords
*   *Your tasks: Add password hashing, JWT tokens, role middleware*

**Patrick (Inventory & Sales):**
*   `products` - Medicines inventory
*   `sales` - Sales transactions
*   `sale_items` - Individual sale items
*   *Your tasks: Product CRUD, sales processing, stock updates*

**Gilbert (HR & Reports):**
*   `employees` - Employee records
*   `attendance` - Daily attendance
*   *Your tasks: Employee management, attendance tracking, reports*

---

## 🔍 Useful Database Commands

### **Access PostgreSQL Command Line:**
```bash
docker-compose exec postgres psql -U metmma_user -d metmma_pharmacy
```

### **Common psql Commands:**
```sql
\dt                    -- List all tables
\d+ table_name        -- Describe table structure
SELECT * FROM users;  -- View all users
\q                    -- Exit psql
```

### **View Sample Data:**
```bash
# View products
docker-compose exec postgres psql -U metmma_user -d metmma_pharmacy -c "SELECT * FROM products;"

# View users
docker-compose exec postgres psql -U metmma_user -d metmma_pharmacy -c "SELECT username, role FROM users;"

# View employees
docker-compose exec postgres psql -U metmma_user -d metmma_pharmacy -c "SELECT employee_id, position FROM employees;"
```

---

## 🛠️ Development Workflow

### **Daily Startup:**
```bash
# 1. Start Docker Desktop (if on Windows/Mac)
# 2. Start database
docker-compose up -d

# 3. Start backend server
cd backend
npm start
```

### **Add New Tables:**
1. Edit `database/init.sql`
2. Add your `CREATE TABLE` statements
3. Restart database:
```bash
docker-compose down
docker-compose up -d
```

### **Reset Database (Warning: deletes all data):**
```bash
docker-compose down -v
docker-compose up -d
```

---

## 📊 Database Management

### **Backup Database:**
```bash
docker-compose exec postgres pg_dump -U metmma_user metmma_pharmacy > database/backups/backup_$(date +%Y%m%d).sql
```

### **Restore Database:**
```bash
cat database/backups/backup.sql | docker-compose exec -T postgres psql -U metmma_user -d metmma_pharmacy
```

### **View Logs:**
```bash
# See all logs
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f postgres

# Last 20 lines
docker-compose logs --tail=20 postgres
```

---

## 🚨 Troubleshooting

### **"Permission Denied" Error:**
```bash
# Linux/Mac: Add user to docker group
sudo usermod -aG docker $USER
# Log out and log back in

# Or use sudo temporarily:
sudo docker-compose up -d
```

### **"Port 5432 already in use":**
```bash
# Stop local PostgreSQL
sudo systemctl stop postgresql
sudo systemctl disable postgresql

# Or change port in docker-compose.yml
# Change "5432:5432" to "5433:5432"
```

### **"Could not connect to database":**
*   Check Docker is running: `docker ps`
*   Check container status: `docker-compose ps`
*   Check logs: `docker-compose logs postgres`
*   Verify `.env` file has correct credentials

---

## 📞 Quick Reference

### **Start/Stop:**
```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# Stop and remove data
docker-compose down -v
```

### **Status Checks:**
```bash
# Check if running
docker-compose ps

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U metmma_user -d metmma_pharmacy
```

### **Common Issues:**
*   Database not starting? Run: `docker-compose logs postgres`
*   Can't connect from Node.js? Check `.env` file
*   Tables missing? Check `database/init.sql` file

---

## 🤝 Team Collaboration

### **Before Pushing Changes:**
1. Test your database changes locally
2. Run `node test-db.js` to verify connection
3. Update `init.sql` if you added new tables
4. Commit and push changes

### **After Pulling Changes:**
```bash
# If database schema changed:
docker-compose down
docker-compose up -d

# Test connection
cd backend
node test-db.js
```

---

## 🎯 Success Checklist
- [ ] Docker installed and running
- [ ] Database container started (`docker-compose ps`)
- [ ] Can connect from Node.js (`node test-db.js` shows success)
- [ ] Tables created (`users`, `products`, `sales`, `employees`, `attendance`)
- [ ] Sample data loaded
- [ ] Can run queries from your backend code

**Need Help? Contact the database team:**
*   Patrick (Database setup & inventory tables)
*   Joshua (Authentication tables)
*   Gilbert (HR tables)