const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { validateSale } = require('../validators/salesValidator');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');

router.post('/checkout', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.PHARMACIST_MANAGER, ROLES.PHARMACIST, ROLES.ASSISTANT_PHARMACIST, ROLES.CASHIER), validateSale, salesController.processSale);
router.get('/history', authenticate, salesController.getSaleHistory);

module.exports = router;
