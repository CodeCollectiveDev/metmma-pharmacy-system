/**
 * Products Controller
 * Handles all product-related operations
 * Created by: Gilbert (BE Dev 2)
 */

const pool = require('../db').pool || require('../../db/connection').pool;

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public (will add authentication later)
 */
const getAllProducts = async (req, res) => {
  try {
    console.log('📦 Fetching all products from database...');
    
    // Get query parameters for filtering
    const { category, search, minPrice, maxPrice, inStock, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM products WHERE is_active = TRUE';
    const values = [];
    let paramCount = 0;
    
    // Apply filters if provided
    if (category) {
      paramCount++;
      query += ` AND category ILIKE $${paramCount}`;
      values.push(`%${category}%`);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR product_code ILIKE $${paramCount} OR generic_name ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }
    
    if (minPrice) {
      paramCount++;
      query += ` AND selling_price >= $${paramCount}`;
      values.push(parseFloat(minPrice));
    }
    
    if (maxPrice) {
      paramCount++;
      query += ` AND selling_price <= $${paramCount}`;
      values.push(parseFloat(maxPrice));
    }
    
    if (inStock === 'true') {
      query += ' AND quantity > 0';
    } else if (inStock === 'false') {
      query += ' AND quantity = 0';
    }
    
    // Add sorting and pagination
    query += ' ORDER BY name ASC';
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(parseInt(limit), offset);
    
    // Execute query
    const result = await pool.query(query, values);
    const products = result.rows;
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM products WHERE is_active = TRUE';
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].total);
    
    console.log(`✅ Found ${products.length} products (Total: ${total})`);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: products.map(product => ({
        id: product.id,
        productCode: product.product_code,
        name: product.name,
        genericName: product.generic_name,
        batchNumber: product.batch_number,
        expiryDate: product.expiry_date,
        quantity: product.quantity,
        unitPrice: product.unit_price,
        sellingPrice: product.selling_price,
        costPrice: product.cost_price,
        supplier: product.supplier,
        category: product.category,
        reorderLevel: product.reorder_level,
        location: product.location,
        barcode: product.barcode,
        isActive: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        stockStatus: product.quantity === 0 ? 'Out of Stock' : 
                    product.quantity <= product.reorder_level ? 'Low Stock' : 'In Stock'
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching products:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Fetching product with ID: ${id}`);
    
    const query = 'SELECT * FROM products WHERE id = $1 AND is_active = TRUE';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found`
      });
    }
    
    const product = result.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        id: product.id,
        productCode: product.product_code,
        name: product.name,
        genericName: product.generic_name,
        batchNumber: product.batch_number,
        expiryDate: product.expiry_date,
        quantity: product.quantity,
        unitPrice: product.unit_price,
        sellingPrice: product.selling_price,
        costPrice: product.cost_price,
        supplier: product.supplier,
        category: product.category,
        reorderLevel: product.reorder_level,
        location: product.location,
        barcode: product.barcode,
        isActive: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        stockStatus: product.quantity === 0 ? 'Out of Stock' : 
                    product.quantity <= product.reorder_level ? 'Low Stock' : 'In Stock'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get low stock products
 * @route   GET /api/products/low-stock
 * @access  Public
 */
const getLowStockProducts = async (req, res) => {
  try {
    console.log('⚠️ Fetching low stock products...');
    
    const query = `
      SELECT * FROM products 
      WHERE quantity <= reorder_level 
        AND quantity > 0 
        AND is_active = TRUE
      ORDER BY quantity ASC
    `;
    
    const result = await pool.query(query);
    const products = result.rows;
    
    console.log(`✅ Found ${products.length} low stock products`);
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products.map(product => ({
        id: product.id,
        productCode: product.product_code,
        name: product.name,
        quantity: product.quantity,
        reorderLevel: product.reorder_level,
        supplier: product.supplier,
        stockStatus: 'Low Stock',
        daysUntilReorder: product.reorder_level - product.quantity
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching low stock products:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching low stock products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get expiring products
 * @route   GET /api/products/expiring
 * @access  Public
 */
const getExpiringProducts = async (req, res) => {
  try {
    const { days = 90 } = req.query; // Default: next 90 days
    
    console.log(`📅 Fetching products expiring in next ${days} days...`);
    
    const query = `
      SELECT * FROM products 
      WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
        AND quantity > 0 
        AND is_active = TRUE
      ORDER BY expiry_date ASC
    `;
    
    const result = await pool.query(query);
    const products = result.rows;
    
    console.log(`✅ Found ${products.length} expiring products`);
    
    res.status(200).json({
      success: true,
      count: products.length,
      days,
      data: products.map(product => ({
        id: product.id,
        productCode: product.product_code,
        name: product.name,
        batchNumber: product.batch_number,
        expiryDate: product.expiry_date,
        quantity: product.quantity,
        supplier: product.supplier,
        daysToExpiry: Math.ceil((new Date(product.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching expiring products:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expiring products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get products by category
 * @route   GET /api/products/category/:category
 * @access  Public
 */
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    console.log(`🏷️ Fetching products in category: ${category}`);
    
    const query = `
      SELECT * FROM products 
      WHERE category ILIKE $1 
        AND is_active = TRUE
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query, [`%${category}%`]);
    const products = result.rows;
    
    console.log(`✅ Found ${products.length} products in category "${category}"`);
    
    res.status(200).json({
      success: true,
      category,
      count: products.length,
      data: products
    });
    
  } catch (error) {
    console.error('❌ Error fetching products by category:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products by category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Search products
 * @route   GET /api/products/search
 * @access  Public
 */
const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    console.log(`🔍 Searching products for: "${q}"`);
    
    const query = `
      SELECT * FROM products 
      WHERE (name ILIKE $1 OR product_code ILIKE $1 OR generic_name ILIKE $1 OR barcode ILIKE $1)
        AND is_active = TRUE
      ORDER BY name ASC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [`%${q}%`]);
    const products = result.rows;
    
    console.log(`✅ Found ${products.length} products matching "${q}"`);
    
    res.status(200).json({
      success: true,
      search: q,
      count: products.length,
      data: products
    });
    
  } catch (error) {
    console.error('❌ Error searching products:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while searching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getLowStockProducts,
  getExpiringProducts,
  getProductsByCategory,
  searchProducts
};