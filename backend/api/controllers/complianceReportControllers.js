const pool = require('../db');

exports.getComplianceReports = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_reports');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createComplianceReport = async (req, res) => {
  const { compliance_area, status, notes, created_by } = req.body;
  try {
    await pool.query(
      'INSERT INTO compliance_reports (report_date, compliance_area, status, notes, created_by) VALUES (NOW(), $1, $2, $3, $4)',
      [compliance_area, status, notes, created_by]
    );
    res.status(201).send('Compliance report created');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
