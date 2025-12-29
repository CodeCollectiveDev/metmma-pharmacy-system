//  CREATED BY PATRICK

const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// Process a new transaction
router.post('/checkout', salesController.processSale);

// Get history for reports
router.get('/history', salesController.getSaleHistory);

module.exports = router;