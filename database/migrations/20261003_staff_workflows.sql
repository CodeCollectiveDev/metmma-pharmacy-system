BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS employee_leave (
 id SERIAL PRIMARY KEY,
 employee_id INTEGER NOT NULL REFERENCES employees(id),
 leave_type VARCHAR(50) NOT NULL,
 reason VARCHAR(1000),
 start_date DATE NOT NULL,
 expected_return_date DATE NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled','completed')),
 created_by INTEGER REFERENCES users(id),
 updated_by INTEGER REFERENCES users(id),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(expected_return_date >= start_date)
);
CREATE INDEX IF NOT EXISTS staff_leave_employee_dates ON employee_leave(employee_id,start_date,expected_return_date);
COMMIT;
