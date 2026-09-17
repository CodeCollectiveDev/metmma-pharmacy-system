const pool = require('../db').pool;

const processSale = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { items, totalAmount, paymentMethod, customerName, userId } = req.body;

    // Client-contract validation: reject malformed payloads instead of
    // silently writing broken sales (see issues/issue2.md).
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items[] is required and must not be empty' });
    }
    for (const item of items) {
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        return res.status(400).json({ success: false, message: 'Each item must have a valid DB productId (integer)' });
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Each item must have a valid quantity (positive integer)' });
      }
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        return res.status(400).json({ success: false, message: 'Each item must have a valid unitPrice (number)' });
      }
    }
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'totalAmount is required and must be a positive number' });
    }
    
    // 1. Start Transaction
    await client.query('BEGIN');

    // 2. Create the main Sale record 
    // Matching your SQL columns: receipt_number, total_amount, payment_method, customer_name, user_id
    const receiptNumber = `REC-${Date.now()}`;
    const saleResult = await client.query(
      `INSERT INTO sales (receipt_number, total_amount, payment_method, customer_name, user_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [receiptNumber, totalAmount, paymentMethod || 'cash', customerName, userId]
    );
    const saleId = saleResult.rows[0].id;

    // 3. Process each item
    for (const item of items) {
      // Get current product details (with lock for safety)
      const productCheck = await client.query(
        'SELECT name, quantity FROM products WHERE id = $1 FOR UPDATE', 
        [item.productId]
      );
      
      if (productCheck.rows.length === 0) throw new Error(`Product ID ${item.productId} not found`);
      const product = productCheck.rows[0];

      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Stock: ${product.quantity}, Requested: ${item.quantity}`);
      }

      // Insert into sale_items (matching your SQL schema)
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) 
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, item.productId, item.quantity, item.unitPrice, item.subtotal]
      );

      // Update Product Quantity
      const newQty = product.quantity - item.quantity;
      await client.query(
        'UPDATE products SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQty, item.productId]
      );

      // Log to stock_movements (audit trail)
      await client.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity_change, previous_quantity, new_quantity, notes) 
         VALUES ($1, 'sale', $2, $3, $4, $5)`,
        [item.productId, -item.quantity, product.quantity, newQty, `Receipt: ${receiptNumber}`]
      );
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Sale completed',
      receiptNumber,
      saleId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Sale Error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

const getSaleHistory = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
      (SELECT json_agg(si) FROM (SELECT * FROM sale_items WHERE sale_id = s.id) si) as items
      FROM sales s 
      ORDER BY s.created_at DESC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { processSale, getSaleHistory };