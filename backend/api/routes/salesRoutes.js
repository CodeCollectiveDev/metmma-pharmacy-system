const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');
const { checkAndRefreshSession } = require('../../middleware/sessionMiddleware');

// Process a new transaction - Admin and Cashier can checkout
router.post('/checkout', authenticate, authorize(ROLES.ADMIN, ROLES.CASHIER), checkAndRefreshSession, salesController.processSale);

// Get history for reports - Admin, Store Manager, Pharmacist can view history
router.get('/history', authenticate, authorize(ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST), checkAndRefreshSession, salesController.getSaleHistory);

module.exports = router;