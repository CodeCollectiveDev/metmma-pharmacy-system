const express = require('express');
const router = express.Router();
const productController = require('../controllers/productsController')
const { createProductSchema, updateProductSchema, validateProduct } = require('../validators/productValidator');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');

router.get('/', authenticate, productController.getAllProducts);
router.get('/low-stock', authenticate, productController.getLowStockProducts);
router.get('/expiring', authenticate, productController.getExpiringProducts);
router.get('/:id', authenticate, productController.getProductById);

router.post('/', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.PHARMACIST_MANAGER, ROLES.STORE_MANAGER, ROLES.PHARMACIST), validateProduct(createProductSchema), productController.createProduct);
router.put('/:id', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.PHARMACIST_MANAGER, ROLES.STORE_MANAGER, ROLES.PHARMACIST), validateProduct(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.PHARMACIST_MANAGER), productController.deleteProduct);

module.exports = router;
