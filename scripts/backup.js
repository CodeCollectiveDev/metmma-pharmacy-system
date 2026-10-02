#!/usr/bin/env node

/**
 * PostgreSQL Daily Backup Script
 * Creates timestamped backup files in /backups directory
 * 
 * Usage:
 *   node scripts/backup.js
 * 
 * Cron (daily at 2 AM):
 *   0 2 * * * cd /path/to/project && node scripts/backup.js >> /var/log/pharmacy-backup.log 2>&1
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env file manually (no external dependencies)
const loadEnv = (envPath) => {
  try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (err) {
    console.warn(`Could not load .env file: ${envPath}`);
  }
};

loadEnv(path.join(__dirname, '../backend/.env'));

// Configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  database: process.env.DB_NAME || 'metmma_pharmacy',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  backupDir: path.join(__dirname, '../backups'),
  retentionDays: 7 // Keep backups for 7 days
};

// Create timestamp for filename
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
};

// Ensure backup directory exists
const ensureBackupDir = () => {
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    console.log(`Created backup directory: ${config.backupDir}`);
  }
};

// Clean old backups (older than retention period)
const cleanOldBackups = () => {
  const files = fs.readdirSync(config.backupDir);
  const now = Date.now();
  const maxAge = config.retentionDays * 24 * 60 * 60 * 1000;

  files.forEach(file => {
    const filePath = path.join(config.backupDir, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtime.getTime();

    if (age > maxAge && file.endsWith('.sql')) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup: ${file}`);
    }
  });
};

// Run pg_dump backup
const runBackup = () => {
  return new Promise((resolve, reject) => {
    const timestamp = getTimestamp();
    const filename = `${config.database}_${timestamp}.sql`;
    const filepath = path.join(config.backupDir, filename);

    // Set PGPASSWORD environment variable for pg_dump
    const env = { ...process.env, PGPASSWORD: config.password };

    const command = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -F p -f "${filepath}"`;

    console.log(`Starting backup: ${filename}`);
    console.log(`Database: ${config.database}@${config.host}:${config.port}`);

    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Backup failed: ${error.message}`);
        reject(error);
        return;
      }

      if (stderr && !stderr.includes('Warning')) {
        console.error(`pg_dump stderr: ${stderr}`);
      }

      // Verify backup file was created
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`Backup completed: ${filename} (${sizeMB} MB)`);
        resolve(filepath);
      } else {
        reject(new Error('Backup file was not created'));
      }
    });
  });
};

// Main execution
const main = async () => {
  console.log('='.repeat(50));
  console.log(`Backup started at ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  try {
    // Ensure backup directory exists
    ensureBackupDir();

    // Run the backup
    const backupPath = await runBackup();

    // Clean old backups
    console.log('\nCleaning old backups...');
    cleanOldBackups();

    console.log('\n' + '='.repeat(50));
    console.log('Backup completed successfully!');
    console.log(`File: ${backupPath}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('Backup FAILED!');
    console.error(error.message);
    console.error('='.repeat(50));
    process.exit(1);
  }
};

main();

