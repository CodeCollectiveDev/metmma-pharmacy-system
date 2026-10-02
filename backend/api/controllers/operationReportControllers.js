const pool = require('../db');

exports.getOperationReports = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM operation_reports');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createOperationReport = async (req, res) => {
    const { metrics, created_by, report_date, total_sales, total_expenses, net_profit } = req.body;
    try {
        await pool.query(
            'INSERT INTO operation_reports (metrics, created_by, report_date, total_sales, total_expenses, net_profit) VALUES ($1, $2, $3, $4, $5, $6)',
            [metrics, created_by, report_date, total_sales, total_expenses, net_profit]
        );
        res.status(201).json({ message: 'Operation report created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteOperationReport = async (req, res) => {
    const { report_id } = req.params;      
    try {
        const result = await pool.query(
            'DELETE FROM operation_reports WHERE report_id = $1',
            [report_id]
        );  
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Operation report not found' });
        }
        res.json({ message: 'Operation report deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }           
};

exports.updateOperationReport = async (req, res) => {
    const { report_id } = req.params;
    const { metrics, created_by, report_date, description } = req.body;     
    try {
        const result = await pool.query(        
            'UPDATE operation_reports SET metrics = $1, created_by = $2, report_date = $3, total_sales = $4, total_expenses = $5, net_profit = $6 WHERE report_id = $7',
            [metrics, created_by, report_date, description]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Operation report not found' });
        }
        res.json({ message: 'Operation report updated successfully' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};