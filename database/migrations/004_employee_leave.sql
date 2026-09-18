-- Migration 004: current employee leave records for HR monitoring.

CREATE TABLE IF NOT EXISTS employee_leave (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    reason TEXT,
    start_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (expected_return_date >= start_date)
);

ALTER TABLE employee_leave DROP CONSTRAINT IF EXISTS employee_leave_status_check;
UPDATE employee_leave SET status = 'approved' WHERE status = 'active';
ALTER TABLE employee_leave ADD CONSTRAINT employee_leave_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));
ALTER TABLE employee_leave ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_employee_leave_current
    ON employee_leave (status, start_date, expected_return_date);