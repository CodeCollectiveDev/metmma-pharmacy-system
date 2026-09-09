const pool = require('../db');

/**
 * Fetch all attendance records with optional filtering
 * Query params: date (YYYY-MM-DD), employee_id, start_date, end_date
 */
exports.getAllAttendance = async (req, res) => {
    try {
        const { date, employee_id, start_date, end_date } = req.query;
        let query = `
            SELECT 
                id,
                employee_id,
                TO_CHAR(date, 'YYYY-MM-DD') AS date,
                status,
                check_in_time,
                check_out_time,
                hours_worked,
                notes,
                created_at
            FROM attendance
        `;
        const conditions = [];
        const params = [];

        if (date) {
            params.push(date);
            conditions.push(`date = $${params.length}`);
        }
        if (employee_id) {
            params.push(employee_id);
            conditions.push(`employee_id = $${params.length}`);
        }
        if (start_date) {
            params.push(start_date);
            conditions.push(`date >= $${params.length}`);
        }
        if (end_date) {
            params.push(end_date);
            conditions.push(`date <= $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY date DESC, id DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching all attendance:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Fetch attendance records for a specific employee
 */
exports.getAttendanceByEmployee = async (req, res) => {
    const { employee_id } = req.params;
    try {   
        const result = await pool.query(
            `SELECT 
                id,
                employee_id,
                TO_CHAR(date, 'YYYY-MM-DD') AS date,
                status,
                check_in_time,
                check_out_time,
                hours_worked,
                notes,
                created_at
             FROM attendance 
             WHERE employee_id = $1 
             ORDER BY date DESC, id DESC`,
            [employee_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(`Error fetching attendance for employee ${employee_id}:`, err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Add or update an attendance record (upsert based on employee_id and date)
 */
exports.addAttendance = async (req, res) => {
    const { employee_id, date, status, check_in_time, check_in, notes } = req.body;
    try {
        // Normalize status to lowercase matching Postgres check constraint
        let normalizedStatus = (status || 'present').toLowerCase();
        if (normalizedStatus === 'excused') {
            normalizedStatus = 'leave';
        }

        // Format date string to YYYY-MM-DD
        const formattedDate = date instanceof Date 
            ? date.toISOString().split('T')[0] 
            : (typeof date === 'string' ? date.split('T')[0] : date);

        const checkIn = check_in_time || check_in || null;

        const result = await pool.query(
            `INSERT INTO attendance (employee_id, date, status, check_in_time, notes)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (employee_id, date)
             DO UPDATE SET 
                 status = EXCLUDED.status,
                 check_in_time = COALESCE(EXCLUDED.check_in_time, attendance.check_in_time),
                 notes = COALESCE(EXCLUDED.notes, attendance.notes)
             RETURNING 
                 id, 
                 employee_id, 
                 TO_CHAR(date, 'YYYY-MM-DD') AS date, 
                 status, 
                 check_in_time, 
                 check_out_time, 
                 hours_worked, 
                 notes, 
                 created_at`,
            [employee_id, formattedDate, normalizedStatus, checkIn, notes || null]
        );

        res.status(201).json({
            message: 'Attendance record saved successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error saving attendance record:', err);
        res.status(500).json({ error: err.message });
    }
};


