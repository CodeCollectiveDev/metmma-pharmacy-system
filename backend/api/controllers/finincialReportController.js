const pool = require('../db');

exports.getFinancialReports = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM financial_reports');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createFinancialReport = async (req, res) => {
  const { revenue, expenses, profit, created_by } = req.body;
  try {
    await pool.query(
      'INSERT INTO financial_reports (report_date, revenue, expenses, profit, created_by) VALUES (NOW(), $1, $2, $3, $4)',
      [revenue, expenses, profit, created_by]
    );
    res.status(201).send('Financial report created');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
