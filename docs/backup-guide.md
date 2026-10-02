# PostgreSQL Backup Guide

This guide explains how to use the automated database backup system for the METMMA Pharmacy System.

## Overview

The backup script (`scripts/backup.js`) creates daily SQL dumps of the PostgreSQL database with automatic cleanup of old backups.

## Features

- **Timestamped backups**: Each backup file includes the date and time
- **Automatic cleanup**: Removes backups older than 7 days
- **Zero dependencies**: No npm packages required (reads .env manually)
- **Logging**: Detailed output for monitoring and debugging
- **Error handling**: Graceful failure with informative error messages

## Requirements

- Node.js (v14+)
- PostgreSQL with `pg_dump` command available
- Database credentials in `backend/.env`

## File Structure

```
metmma-pharmacy-system/
├── scripts/
│   └── backup.js        # Backup script
├── backups/
│   ├── .gitkeep         # Keeps directory in git
│   └── *.sql            # Backup files (gitignored)
└── backend/
    └── .env             # Database credentials
```

## Configuration

The script reads configuration from `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metmma_pharmacy
DB_USER=postgres
DB_PASSWORD=your_password
```

### Default Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `retentionDays` | 7 | Days to keep backups before deletion |
| `backupDir` | `./backups` | Directory for backup files |

## Usage

### Manual Backup

Run from the project root:

```bash
node scripts/backup.js
```

**Output:**
```
==================================================
Backup started at 2025-12-30T22:59:09.111Z
==================================================
Starting backup: metmma_pharmacy_2025-12-30_22-59-09.sql
Database: metmma_pharmacy@localhost:5432
Backup completed: metmma_pharmacy_2025-12-30_22-59-09.sql (0.01 MB)

Cleaning old backups...

==================================================
Backup completed successfully!
File: /path/to/backups/metmma_pharmacy_2025-12-30_22-59-09.sql
==================================================
```

### Automated Daily Backup (Cron)

Set up a cron job to run backups automatically:

```bash
# Open crontab editor
crontab -e
```

Add this line for daily backups at 2 AM:

```cron
0 2 * * * cd /home/joshua/Projects/metmma-pharmacy-system && node scripts/backup.js >> /var/log/pharmacy-backup.log 2>&1
```

**Or use this one-liner to add the cron job:**

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * cd /home/joshua/Projects/metmma-pharmacy-system && node scripts/backup.js >> /var/log/pharmacy-backup.log 2>&1") | crontab -
```

### Verify Cron Job

```bash
crontab -l
```

## Backup File Format

Backups are plain SQL files created by `pg_dump`:

- **Filename**: `{database}_{YYYY-MM-DD}_{HH-MM-SS}.sql`
- **Format**: Plain text SQL (can be restored with `psql`)
- **Contents**: Schema + data

Example: `metmma_pharmacy_2025-12-30_22-59-09.sql`

## Restoring from Backup

### Full Restore

```bash
# Drop and recreate database (WARNING: destroys existing data)
psql -U postgres -c "DROP DATABASE IF EXISTS metmma_pharmacy;"
psql -U postgres -c "CREATE DATABASE metmma_pharmacy;"

# Restore from backup
psql -U postgres -d metmma_pharmacy < backups/metmma_pharmacy_2025-12-30_22-59-09.sql
```

### Restore to Different Database (Testing)

```bash
# Create test database
psql -U postgres -c "CREATE DATABASE metmma_pharmacy_test;"

# Restore backup to test database
psql -U postgres -d metmma_pharmacy_test < backups/metmma_pharmacy_2025-12-30_22-59-09.sql
```

## Monitoring

### Check Recent Backups

```bash
ls -la backups/
```

### Check Backup Logs (if using cron)

```bash
tail -f /var/log/pharmacy-backup.log
```

### Verify Backup Contents

```bash
# View first 50 lines
head -50 backups/metmma_pharmacy_2025-12-30_22-59-09.sql

# Check file size
du -h backups/*.sql
```

## Troubleshooting

### "pg_dump: command not found"

Install PostgreSQL client tools:

```bash
# Ubuntu/Debian
sudo apt install postgresql-client

# macOS
brew install postgresql
```

### "Connection refused"

- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check `DB_HOST` and `DB_PORT` in `.env`

### "Authentication failed"

- Verify `DB_USER` and `DB_PASSWORD` in `.env`
- Check PostgreSQL `pg_hba.conf` allows connections

### "Permission denied" for backup directory

```bash
# Fix permissions
chmod 755 backups/
```

## Security Considerations

1. **Backup files contain sensitive data** - Restrict access to the `backups/` directory
2. **Database credentials** - Keep `.env` file secure and never commit it
3. **Off-site backups** - Consider copying backups to cloud storage for disaster recovery

## Customization

### Change Retention Period

Edit `scripts/backup.js`:

```javascript
const config = {
  // ...
  retentionDays: 14 // Keep backups for 14 days instead of 7
};
```

### Compress Backups

Modify the backup command in `scripts/backup.js`:

```javascript
const command = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -F c -f "${filepath}.gz"`;
```

Note: Compressed backups use `pg_restore` instead of `psql` for restoration.

