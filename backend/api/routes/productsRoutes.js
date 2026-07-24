const express = require('express');
const router = express.Router();
const productController = require('../controllers/productsController')
const { createProductSchema, updateProductSchema, validateProduct } = require('../validators/productValidator');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');
const { checkAndRefreshSession } = require('../../middleware/sessionMiddleware');

// Standard CRUD - Read access for all authenticated roles
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.STORE_MANAGER, ROLES.CASHIER, ROLES.HR_OFFICER), checkAndRefreshSession, productController.getAllProducts);
router.get('/low-stock', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.STORE_MANAGER, ROLES.CASHIER, ROLES.HR_OFFICER), checkAndRefreshSession, productController.getLowStockProducts);
router.get('/expiring', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.STORE_MANAGER, ROLES.CASHIER, ROLES.HR_OFFICER), checkAndRefreshSession, productController.getExpiringProducts);
router.get('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.STORE_MANAGER, ROLES.CASHIER, ROLES.HR_OFFICER), checkAndRefreshSession, productController.getProductById);

// Protected writes using the Validator - Write access for admin, pharmacist, store_manager
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.STORE_MANAGER), checkAndRefreshSession, validateProduct(createProductSchema), productController.createProduct);
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.STORE_MANAGER), checkAndRefreshSession, validateProduct(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.STORE_MANAGER), checkAndRefreshSession, productController.deleteProduct);

module.exports = router;