const db = require('../db');
const { dateFilter } = require('../../lib/validation');
const { AppError } = require('../../lib/errors');

async function getOverview(req, res) {
  const { section, start, end } = req.validatedQuery;
  const values = [];
  const range = dateFilter({ start, end }, values, 's.created_at').join(' AND ');
  if ((Date.parse(end) - Date.parse(start)) / 86400000 > 365) throw new AppError('VALIDATION', 400, [{ field: 'end', message: 'Choose a period of up to one year.' }]);
  if (section === 'sales') {
    const [summary, daily, products, payments] = await Promise.all([
      db.query(`SELECT COUNT(*) FILTER (WHERE s.status='completed')::int AS "saleCount",
        COUNT(*) FILTER (WHERE s.status='reversed')::int AS "reversedCount",
        COALESCE(SUM(s.total_amount) FILTER (WHERE s.status='completed'),0)::text AS revenue,
        COALESCE(ROUND(AVG(s.total_amount) FILTER (WHERE s.status='completed'),2),0)::text AS "averageSale"
        FROM sales s WHERE ${range}`, values),
      db.query(`SELECT s.created_at::date::text AS date,COUNT(*)::int AS count,SUM(s.total_amount)::text AS total
        FROM sales s WHERE ${range} AND s.status='completed' GROUP BY s.created_at::date ORDER BY s.created_at::date`, values),
      db.query(`SELECT si.product_id AS id, MAX(si.product_name) AS name,SUM(si.quantity)::text AS units,SUM(si.subtotal)::text AS revenue
        FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE ${range} AND s.status='completed'
        GROUP BY si.product_id ORDER BY SUM(si.quantity) DESC,si.product_id LIMIT 10`, values),
      db.query(`SELECT s.payment_method AS method,COUNT(*)::int AS count,SUM(s.total_amount)::text AS total
        FROM sales s WHERE ${range} AND s.status='completed' GROUP BY s.payment_method ORDER BY SUM(s.total_amount) DESC`, values)
    ]);
    return res.json({ summary: summary.rows[0], daily: daily.rows, products: products.rows, payments: payments.rows });
  }
  if (section === 'stock') {
    const summary = await db.query(`SELECT COUNT(*)::int AS products,
      COUNT(*) FILTER (WHERE quantity<=reorder_level)::int AS low,
      COUNT(*) FILTER (WHERE quantity=0)::int AS empty,
      COUNT(*) FILTER (WHERE quantity>0 AND expiry_date<CURRENT_DATE)::int AS expired,
      COUNT(*) FILTER (WHERE quantity>0 AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE+90)::int AS expiring,
      COALESCE(SUM(quantity) FILTER (WHERE expiry_date>=CURRENT_DATE),0)::text AS units,
      COALESCE(SUM(quantity*selling_price) FILTER (WHERE expiry_date>=CURRENT_DATE),0)::text AS "stockValue"
      FROM products WHERE is_active=TRUE`);
    return res.json({ summary: summary.rows[0] });
  }
  if (!['admin', 'hr_officer'].includes(req.user.role)) throw new AppError('PERMISSION_DENIED', 403);
  const [summary, departments] = await Promise.all([
    db.query(`SELECT COUNT(*) FILTER (WHERE is_active)::int AS active,COUNT(*) FILTER (WHERE NOT is_active)::int AS inactive,
      COUNT(*) FILTER (WHERE is_active AND user_id IS NOT NULL)::int AS "withAccount",
      (SELECT COUNT(*)::int FROM employee_leave WHERE status='pending') AS "pendingLeave",
      (SELECT COUNT(DISTINCT employee_id)::int FROM employee_leave WHERE status='approved' AND CURRENT_DATE BETWEEN start_date AND expected_return_date) AS "onLeave"
      FROM employees`),
    db.query(`SELECT COALESCE(NULLIF(department,''),'Unassigned') AS department,COUNT(*)::int AS count
      FROM employees WHERE is_active=TRUE GROUP BY COALESCE(NULLIF(department,''),'Unassigned') ORDER BY count DESC,department`)
  ]);
  return res.json({ summary: summary.rows[0], departments: departments.rows });
}
module.exports = { getOverview };
