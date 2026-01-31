const pool = require('../db').pool;

const getRecentActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

    const query = `
      SELECT 'sale' AS type,
             s.created_at AS timestamp,
             'Sale completed' AS title,
             CONCAT('Receipt ', s.receipt_number, ' - MWK ', s.total_amount) AS description
      FROM sales s

      UNION ALL

      SELECT 'stock' AS type,
             sm.created_at AS timestamp,
             CASE
               WHEN sm.movement_type = 'sale' THEN 'Stock reduced'
               WHEN sm.movement_type = 'purchase' THEN 'Stock added'
               WHEN sm.movement_type LIKE 'adjustment%' THEN 'Stock adjusted'
               ELSE 'Stock movement'
             END AS title,
             CONCAT(p.name, ' (', sm.quantity_change, ')') AS description
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id

      ORDER BY timestamp DESC
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getRecentActivity };
