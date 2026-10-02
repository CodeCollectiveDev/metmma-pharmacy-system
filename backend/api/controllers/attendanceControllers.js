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

exports.addAttendance = async (req, res) => {
    const { employee_id, date, status } = req.body;
    try {   
        await pool.query(
            'INSERT INTO attendance (employee_id, date, status) VALUES ($1, $2, $3)',
            [employee_id, date, status]
        );
        res.status(201).json({ message: 'Attendance record added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


