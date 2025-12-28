/**
 * Product Routes
 * All routes for product management
 * Created by: Gilbert (BE Dev 2)
 */

const express = require('express');
const router = express.Router();

// Import product controllers
const {
  getAllProducts,
  getProductById,
  getLowStockProducts,
  getExpiringProducts,
  getProductsByCategory,
  searchProducts
} = require('../controllers/productsController');

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', getAllProducts);

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', searchProducts);

// @route   GET /api/products/low-stock
// @desc    Get low stock products
// @access  Public
router.get('/low-stock', getLowStockProducts);

// @route   GET /api/products/expiring
// @desc    Get expiring products
// @access  Public
router.get('/expiring', getExpiringProducts);

// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get('/category/:category', getProductsByCategory);

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/:id', getProductById);

module.exports = router;