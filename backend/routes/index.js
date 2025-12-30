const express = require('express'); //import express
const router = express.Router(); //creates instance of express router 

// basic API route for testing purposes
router.get('/', (req, res) => {
  res.json({ message: 'API is working' });
});

// Auth routes
const authRoutes = require('./authRoutes');
router.use('/auth', authRoutes);
// Login endpoint at /api/login
router.use('/login', authRoutes.loginRouter);

// please add more routes here (tapanga sir---by patrick)

// Import route modules
const attendanceRoutes = require('../api/routes/attendanceRoutes');
const employeesRoutes = require('../api/routes/employeesRoutes');
const reportsRoutes = require('../api/routes/reportsRoutes');
const productRoutes = require('../api/routes/productsRoutes'); 

// Use routes
router.use('/attendance', attendanceRoutes);
router.use('/employees', employeesRoutes);
router.use('/reports', reportsRoutes);
router.use('/products', productRoutes); 

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'METMMA Pharmacy API',
    version: '1.0.0'
  });
});

module.exports = router;