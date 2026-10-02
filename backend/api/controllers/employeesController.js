const pool = require('../db');
const { randomUUID } = require('node:crypto');

exports.getEmployees = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getEmployeeById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addEmployee = async (req, res) => {
    const { first_name, last_name, role, hire_date, salary, email, department, job_title, phone } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO employees
             (employee_id, first_name, last_name, role, hire_date, salary, email, department, position, phone_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [`EMP-${randomUUID()}`, first_name, last_name, role, hire_date, salary, email, department, job_title, phone]
        );
        res.status(201).json({ message: 'Employee added successfully', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }       
};

exports.updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, role, hire_date, salary } = req.body;        
    try {
        const result = await pool.query(
            'UPDATE employees SET first_name = $1, last_name = $2, role = $3, hire_date = $4, salary = $5 WHERE id = $6',
            [first_name, last_name, role, hire_date, salary, id]
        );  
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }   
        res.json({ message: 'Employee updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteEmployee = async (req, res) => {
    const { id } = req.params;      
    try {
        const result = await pool.query(
            'DELETE FROM employees WHERE id = $1',
            [id]
        );      
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


