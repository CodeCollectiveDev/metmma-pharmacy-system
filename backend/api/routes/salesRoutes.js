const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');

router.post('/checkout', authenticate, authorize(ROLES.ADMIN, ROLES.CASHIER, ROLES.PHARMACIST), salesController.processSale);
router.get('/history', authenticate, salesController.getSaleHistory);

module.exports = router;
