const pool = require('../db');

exports.getAttendanceByEmployee = async (req, res) => {
    const { employee_id } = req.params;
    try {   
        const result = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = $1',
            [employee_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAttendanceByDate = async (req, res) => {
    const { date } = req.query;
    try {
        const result = await pool.query(
            `SELECT a.*, a.check_in_time AS check_in, e.employee_id, e.first_name, e.last_name, e.role, e.department
             FROM attendance a
             JOIN employees e ON e.id = a.employee_id
             WHERE a.date = COALESCE($1::date, CURRENT_DATE)
             ORDER BY e.first_name, e.last_name`,
            [date || null]
        );
        res.json({ success: true, data: result.rows.map((record) => ({
            ...record,
            status: record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1).toLowerCase() : record.status
        })) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getCurrentLeave = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.id, l.employee_id, l.leave_type, l.reason, l.start_date,
                    l.expected_return_date, l.status, e.employee_id AS employee_code,
                    e.first_name, e.last_name, e.role, e.department,
                    (l.expected_return_date - l.start_date + 1) AS total_days,
                    (CURRENT_DATE - l.start_date + 1) AS days_used,
                    GREATEST(l.expected_return_date - CURRENT_DATE, 0) AS days_remaining
             FROM employee_leave l
             JOIN employees e ON e.id = l.employee_id
                         WHERE l.status = 'approved'
                             AND l.expected_return_date >= CURRENT_DATE
             ORDER BY l.expected_return_date ASC, e.first_name, e.last_name`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getLeaveRequests = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.*, e.employee_id AS employee_code, e.first_name, e.last_name, e.role, e.department
             FROM employee_leave l JOIN employees e ON e.id = l.employee_id
             WHERE l.status = 'pending' ORDER BY l.start_date ASC, l.created_at ASC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createLeave = async (req, res) => {
    const { employee_id, leave_type, reason, start_date, expected_return_date } = req.body;
    try {
        if (!employee_id || !leave_type || !start_date || !expected_return_date || new Date(expected_return_date) < new Date(start_date)) {
            return res.status(400).json({ success: false, error: 'Employee, leave type, and valid leave dates are required' });
        }
        const result = await pool.query(
            `INSERT INTO employee_leave (employee_id, leave_type, reason, start_date, expected_return_date)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [employee_id, leave_type, reason || null, start_date, expected_return_date]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateLeaveStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'rejected', 'cancelled', 'completed'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid leave status' });
    }
    try {
        const result = await pool.query(
            'UPDATE employee_leave SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Leave request not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.addAttendance = async (req, res) => {
    const { employee_id, date, status } = req.body;
    try {   
        await pool.query(
            `INSERT INTO attendance (employee_id, date, status)
             VALUES ($1, $2, LOWER($3))
             ON CONFLICT (employee_id, date) DO UPDATE SET status = EXCLUDED.status`,
            [employee_id, date, status]
        );
        res.status(201).json({ message: 'Attendance record added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


