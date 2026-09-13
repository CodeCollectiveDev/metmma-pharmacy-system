//  CREATED BY PATRICK

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productsController')
const { createProductSchema, updateProductSchema, validateProduct } = require('../validators/productValidator');

// Barcode lookup (must be before /:id to avoid conflict)
router.get('/barcode/:barcode', productController.lookupByBarcode);

// Standard CRUD
router.get('/', productController.getAllProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/expiring', productController.getExpiringProducts);
router.get('/:id', productController.getProductById);

// Protected writes using the Validator
router.post('/', validateProduct(createProductSchema), productController.createProduct);
router.put('/:id', validateProduct(updateProductSchema), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;