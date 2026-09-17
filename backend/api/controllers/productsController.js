//  CREATED BY PATRICK

const pool = require('../db').pool;

/**
 * Helper to keep response format consistent
 */
const formatProduct = (p) => ({
  id: p.id,
  productCode: p.product_code,
  name: p.name,
  genericName: p.generic_name,
  batchNumber: p.batch_number,
  expiryDate: p.expiry_date,
  quantity: p.quantity,
  unitPrice: p.unit_price,
  sellingPrice: p.selling_price,
  costPrice: p.cost_price,
  supplier: p.supplier,
  category: p.category,
  reorderLevel: p.reorder_level,
  location: p.location,
  barcode: p.barcode,
  isActive: p.is_active,
  stockStatus: p.quantity === 0 ? 'Out of Stock' : 
               p.quantity <= p.reorder_level ? 'Low Stock' : 'In Stock'
});

// --- READ OPERATIONS ---

const getAllProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM products WHERE is_active = TRUE';
    const values = [];

    if (category) {
      values.push(`%${category}%`);
      query += ` AND category ILIKE $${values.length}`;
    }
    if (search) {
      values.push(`%${search}%`);
      query += ` AND (name ILIKE $${values.length} OR product_code ILIKE $${values.length} OR generic_name ILIKE $${values.length})`;
    }

    query += ` ORDER BY name ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(parseInt(limit), offset);

    const result = await pool.query(query, values);
    res.json({ success: true, count: result.rows.length, data: result.rows.map(formatProduct) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch error', error: err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: formatProduct(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE quantity <= reorder_level AND is_active = TRUE ORDER BY quantity ASC');
    res.json({ success: true, count: result.rows.length, data: result.rows.map(formatProduct) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getExpiringProducts = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const result = await pool.query(`SELECT * FROM products WHERE expiry_date <= CURRENT_DATE + INTERVAL '${days} days' AND quantity > 0 AND is_active = TRUE ORDER BY expiry_date ASC`);
    res.json({ success: true, count: result.rows.length, data: result.rows.map(formatProduct) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- WRITE OPERATIONS ---

const createProduct = async (req, res) => {
  const client = await pool.connect();

  try {
    const data = req.body; // Already validated by Joi

    await client.query('BEGIN');
    
    // Check for unique product code
    const existing = await client.query('SELECT id FROM products WHERE product_code = $1', [data.productCode]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Product code already exists' });
    }

    const query = `
      INSERT INTO products (product_code, name, generic_name, batch_number, expiry_date, quantity, unit_price, selling_price, cost_price, supplier, category, reorder_level, location, barcode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`;
    
    const values = [data.productCode, data.name, data.genericName, data.batchNumber, data.expiryDate, data.quantity, data.unitPrice, data.sellingPrice, data.costPrice, data.supplier, data.category, data.reorderLevel, data.location, data.barcode];
    
    const result = await client.query(query, values);
    const product = result.rows[0];

    // Log initial stock movement
    if (data.quantity > 0) {
      await client.query('INSERT INTO stock_movements (product_id, movement_type, quantity_change, previous_quantity, new_quantity, notes) VALUES ($1, $2, $3, $4, $5, $6)',
      [product.id, 'purchase', data.quantity, 0, data.quantity, 'Initial Inventory Entry']);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: formatProduct(product) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Creation failed', error: err.message });
  } finally {
    client.release();
  }
};

const updateProduct = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { reason, ...updates } = req.body; 

    await client.query('BEGIN');

    const currentResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const current = currentResult.rows[0];

    // FIXED: Ensure we are comparing numbers accurately
    const isQuantityChanging = updates.quantity !== undefined && parseInt(updates.quantity) !== parseInt(current.quantity);

    if (isQuantityChanging && !reason) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Reason required for stock adjustment' });
    }

    const fieldMap = { 
      productCode: 'product_code', 
      genericName: 'generic_name', 
      batchNumber: 'batch_number', 
      expiryDate: 'expiry_date', 
      unitPrice: 'unit_price', 
      sellingPrice: 'selling_price', 
      costPrice: 'cost_price', 
      reorderLevel: 'reorder_level', 
      isActive: 'is_active' 
    };

    let setClauses = [];
    let values = [];
    let i = 1;

    // We only update fields that were actually sent in the request
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        setClauses.push(`${fieldMap[key] || key} = $${i}`);
        values.push(val);
        i++;
      }
    }

    if (setClauses.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE products SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`;
    const result = await client.query(query, values);
    const updated = result.rows[0];

    // Log the movement if quantity changed
    if (isQuantityChanging) {
      const diff = parseInt(updates.quantity) - parseInt(current.quantity);
      await client.query(
        'INSERT INTO stock_movements (product_id, movement_type, quantity_change, previous_quantity, new_quantity, notes) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, diff > 0 ? 'adjustment_in' : 'adjustment_out', diff, current.quantity, updated.quantity, reason]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, data: formatProduct(updated) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  } finally {
    client.release();
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // We do a "Soft Delete" (set isActive to false) so we don't lose sales history
    const result = await pool.query('UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING name', [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    
    res.json({ success: true, message: `Product '${result.rows[0].name}' deactivated successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed', error: err.message });
  }
};

module.exports = { getAllProducts, getProductById, getLowStockProducts, getExpiringProducts, createProduct, updateProduct, deleteProduct };