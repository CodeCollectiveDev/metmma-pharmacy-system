const express = require('express'); 
const { Pool } = require('pg'); //pg model facilitates interaction with postgresql
require('dotenv').config();

const app = express();
const port = 3000; // why do we always have to use port 3000

// Security middleware
require('./middleware/security')(app);

// Middleware
app.use(express.json());

// PSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'metmma_pharmacy',
  password: process.env.DB_PASSWORD || '', // no password by default
  port: process.env.DB_PORT || 5432,
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
app.use('/api', require('./routes')); //our routes are defined in backend/routes/index.js

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});