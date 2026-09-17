const express = require('express');
const router = express.Router();
const productController = require('../controllers/productsController')
const {
  createProductSchema,
  updateProductSchema,
  validateProduct,
  validateExpiringProductsQuery
} = require('../validators/productValidator');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');

router.get('/', authenticate, productController.getAllProducts);
router.get('/low-stock', authenticate, productController.getLowStockProducts);
router.get('/expiring', authenticate, validateExpiringProductsQuery, productController.getExpiringProducts);
router.get('/:id', authenticate, productController.getProductById);

router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST), validateProduct(createProductSchema), productController.createProduct);
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.STORE_MANAGER), validateProduct(updateProductSchema), productController.updateProduct);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), productController.deleteProduct);

module.exports = router;
