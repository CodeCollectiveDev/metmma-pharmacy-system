const express = require('express'); 
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
require('./middleware/security')(app);

// Middleware
app.use(express.json());

// PSQL connection
const isProduction = process.env.DATABASE_URL !== undefined;
const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : undefined,
  host: isProduction ? undefined : (process.env.DB_HOST || 'localhost'),
  port: isProduction ? undefined : (process.env.DB_PORT || 5432),
  database: isProduction ? undefined : (process.env.DB_NAME || 'metmma_pharmacy'),
  user: isProduction ? undefined : (process.env.DB_USER || 'postgres'),
  password: isProduction ? undefined : (process.env.DB_PASSWORD || ''),
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

// Test DB connection
pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

// Basic route
app.get('/', (req, res) => {
  res.send('METMMA Pharmacy Backend');
});

// API routes prefix
app.use('/api', require('./routes'));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
